/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import {
  buildBundleZip,
  defaultBundleFilename,
  loadBundleZip,
  peekZipKind,
  QuietReplayBundleError,
  type BundleLoadError,
} from '../../lib/bundle';
import {
  curlCopyText,
  matchNetworkEvent,
  presentPayload,
  requestCopyText,
  responseCopyText,
} from '../../lib/entry-detail';
import { t } from '../../lib/i18n';
import {
  labelFromFilename,
  loadQuietReplayCase,
  QuietReplayCaseError,
  type ConsoleLine,
  type LoadedCase,
} from '../../lib/load-case';
import type { ReportJson } from '../../lib/report';
import type { Locale, Settings } from '../../lib/types';
import type { MessageKey } from '../../locales/en';

const CONSOLE_LEVEL_KEY: Record<string, MessageKey> = {
  all: 'viewerConsoleAll',
  error: 'viewerConsoleError',
  warn: 'viewerConsoleWarn',
  log: 'viewerConsoleLog',
  info: 'viewerConsoleInfo',
  debug: 'viewerConsoleDebug',
};

const DETAIL_LEVEL_KEY: Record<string, MessageKey> = {
  error: 'viewerDetailLevelError',
  warn: 'viewerDetailLevelWarn',
  log: 'viewerDetailLevelLog',
  info: 'viewerDetailLevelInfo',
  debug: 'viewerDetailLevelDebug',
};

type SessionCase = {
  id: string;
  label: string;
  loaded: LoadedCase;
  objectUrls: string[];
};

const cases: SessionCase[] = [];
let activeId: string | null = null;
let locale: Locale = 'en';
let mediaUrls: string[] = [];
/** Epoch ms of report.window.from — maps absolute console times to relative. */
let sessionBaseMs = 0;
let hasVideo = false;

const fileInput = document.getElementById('file-input') as HTMLInputElement;
const addBtn = document.getElementById('add-cases') as HTMLButtonElement;
const caseList = document.getElementById('case-list')!;
const loadError = document.getElementById('load-error')!;
const detail = document.getElementById('detail')!;
const layout = document.querySelector('.layout') as HTMLElement;
const saveBundleBtn = document.getElementById(
  'save-bundle',
) as HTMLButtonElement;
const bundleTitleEl = document.getElementById(
  'bundle-title',
) as HTMLInputElement;
const bundleFilenameEl = document.getElementById(
  'bundle-filename',
) as HTMLInputElement;
const bundleStatus = document.getElementById('bundle-status')!;
const consoleFilter = document.getElementById(
  'console-filter',
) as HTMLSelectElement;
const videoPlayer = document.getElementById('video-player') as HTMLVideoElement;
const syncClock = document.getElementById('sync-clock-value')!;
const syncHint = document.getElementById('sync-hint')!;
const entryDialog = document.getElementById('entry-dialog') as HTMLDialogElement;
const entryKicker = document.getElementById('entry-dialog-kicker')!;
const entryTitle = document.getElementById('entry-dialog-title')!;
const entryBody = document.getElementById('entry-dialog-body')!;
const entryClose = document.getElementById(
  'entry-dialog-close',
) as HTMLButtonElement;
const entrySeek = document.getElementById(
  'entry-dialog-seek',
) as HTMLButtonElement;
const entryCopyActions = document.getElementById('entry-copy-actions')!;
const entryCopyRequest = document.getElementById(
  'entry-copy-request',
) as HTMLTextAreaElement;
const entryCopyResponse = document.getElementById(
  'entry-copy-response',
) as HTMLTextAreaElement;
const entryCopyCurl = document.getElementById(
  'entry-copy-curl',
) as HTMLTextAreaElement;
const entryCopyRequestBtn = document.getElementById(
  'entry-copy-request-btn',
) as HTMLButtonElement;
const entryCopyResponseBtn = document.getElementById(
  'entry-copy-response-btn',
) as HTMLButtonElement;
const entryCopyCurlBtn = document.getElementById(
  'entry-copy-curl-btn',
) as HTMLButtonElement;
let detailRelMs = 0;
let lastCopyMessage = '';
const copyTimers = new WeakMap<HTMLButtonElement, number>();
let detailSectionId = 0;

function newId(): string {
  return crypto.randomUUID();
}

function revokeUrls(urls: string[]) {
  for (const u of urls) URL.revokeObjectURL(u);
}

function revokeActiveMedia() {
  revokeUrls(mediaUrls);
  mediaUrls = [];
  videoPlayer.removeAttribute('src');
  videoPlayer.load();
  hasVideo = false;
}

function activeCase(): SessionCase | undefined {
  return cases.find((c) => c.id === activeId);
}

function setLoadError(msg: string | null) {
  if (!msg) {
    loadError.hidden = true;
    loadError.textContent = '';
    return;
  }
  loadError.hidden = false;
  loadError.textContent = msg;
}

function shortWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'es' ? 'es' : 'en', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatOffset(ms: number): string {
  const s = ms / 1000;
  const sign = s < 0 ? '-' : '+';
  return `${sign}${Math.abs(s).toFixed(1)}s`;
}

function hostFromReport(loaded: LoadedCase): string {
  try {
    return new URL(loaded.report.page.url).hostname || loaded.report.page.url;
  } catch {
    return loaded.report.page.url;
  }
}

function currentRelMs(): number {
  if (!hasVideo || !Number.isFinite(videoPlayer.currentTime)) return 0;
  return Math.max(0, videoPlayer.currentTime * 1000);
}

function applyChromeLabels() {
  document.documentElement.lang = locale;
  document.title = `${t(locale, 'viewerTitle')} · ${t(locale, 'appName')}`;
  document.getElementById('viewer-title')!.textContent = t(
    locale,
    'viewerTitle',
  );
  document.getElementById('viewer-intro')!.textContent = t(
    locale,
    'viewerIntro',
  );
  addBtn.textContent = t(locale, 'viewerAddCases');
  document.getElementById('cases-heading')!.textContent = t(
    locale,
    'viewerCases',
  );
  document.getElementById('case-empty')!.textContent = t(locale, 'viewerEmpty');
  document.getElementById('bundle-heading')!.textContent = t(
    locale,
    'viewerSaveTogether',
  );
  document.getElementById('bundle-hint')!.textContent = t(
    locale,
    'viewerBundleHint',
  );
  (
    document.querySelector('label[for="bundle-title"]') as HTMLLabelElement
  ).textContent = t(locale, 'viewerBundleTitle');
  (
    document.querySelector('label[for="bundle-filename"]') as HTMLLabelElement
  ).textContent = t(locale, 'viewerBundleFilename');
  document.getElementById('bundle-filename-hint')!.textContent = t(
    locale,
    'viewerBundleFilenameHint',
  );
  saveBundleBtn.textContent = t(locale, 'viewerSaveBundle');
  document.getElementById('drop-hint')!.textContent = t(
    locale,
    'viewerSelectCase',
  );
  document.getElementById('steps-heading')!.textContent = t(
    locale,
    'viewerSteps',
  );
  document.getElementById('console-heading')!.textContent = t(
    locale,
    'viewerConsole',
  );
  document.getElementById('failed-heading')!.textContent = t(
    locale,
    'viewerFailed',
  );
  document.getElementById('errors-heading')!.textContent = t(
    locale,
    'viewerErrors',
  );
  document.getElementById('video-heading')!.textContent = t(
    locale,
    'viewerVideo',
  );
  (
    document.querySelector('label[for="console-filter"]') as HTMLLabelElement
  ).textContent = t(locale, 'viewerConsoleLevel');
  for (const opt of consoleFilter.options) {
    const key = CONSOLE_LEVEL_KEY[opt.value];
    if (key) opt.textContent = t(locale, key);
  }
  document.getElementById('sync-clock-label')!.textContent = t(
    locale,
    'viewerClockLabel',
  );
  entryClose.textContent = t(locale, 'viewerDetailClose');
  entryCopyRequestBtn.textContent = t(locale, 'viewerCopyRequest');
  entryCopyResponseBtn.textContent = t(locale, 'viewerCopyResponse');
  entryCopyCurlBtn.textContent = t(locale, 'viewerCopyCurl');
  document
    .getElementById('summary-row')!
    .setAttribute('aria-label', t(locale, 'viewerSummaryLabel'));
  syncHint.textContent = hasVideo
    ? t(locale, 'viewerSyncHint')
    : t(locale, 'viewerSyncNoVideo');
  if (!bundleFilenameEl.value) {
    bundleFilenameEl.placeholder = defaultBundleFilename();
  }
}

function renderCaseList() {
  caseList.replaceChildren();
  saveBundleBtn.disabled = cases.length === 0;

  for (const c of cases) {
    const row = document.createElement('div');
    row.className = 'case-item-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-item';
    btn.setAttribute('aria-current', c.id === activeId ? 'true' : 'false');
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = c.label;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `${hostFromReport(c.loaded)} · ${c.loaded.report.window.seconds.toFixed(0)}s`;
    btn.append(label, meta);
    btn.addEventListener('click', () => {
      activeId = c.id;
      renderAll();
    });
    btn.addEventListener('dblclick', (e) => {
      e.preventDefault();
      startRename(c.id, label);
    });

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'btn ghost';
    renameBtn.title = t(locale, 'viewerRename');
    renameBtn.setAttribute('aria-label', t(locale, 'viewerRename'));
    renameBtn.textContent = '✎';
    renameBtn.addEventListener('click', () => startRename(c.id, label));

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn ghost';
    closeBtn.title = t(locale, 'viewerCloseCase');
    closeBtn.setAttribute('aria-label', t(locale, 'viewerCloseCase'));
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      removeCase(c.id);
    });

    row.append(btn, renameBtn, closeBtn);
    caseList.append(row);
  }
}

function startRename(id: string, labelEl: HTMLElement) {
  const c = cases.find((x) => x.id === id);
  if (!c) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = c.label;
  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const next = input.value.trim();
    if (next) c.label = next;
    renderAll();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      renderAll();
    }
  });
  input.addEventListener('blur', commit);
}

function removeCase(id: string) {
  const idx = cases.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const [removed] = cases.splice(idx, 1);
  if (removed) revokeUrls(removed.objectUrls);
  if (activeId === id) {
    activeId = cases[0]?.id ?? null;
    revokeActiveMedia();
  }
  renderAll();
}

function describeStep(step: {
  type: string;
  text?: string;
  url?: string;
  selector?: string;
}): string {
  if (step.type === 'click') {
    return step.text
      ? t(locale, 'stepClick', { text: step.text })
      : t(locale, 'stepClickPage');
  }
  if (step.type === 'keydown') {
    return step.text
      ? t(locale, 'stepKey', { text: step.text })
      : t(locale, 'stepKeyBare');
  }
  if (step.type === 'navigation') {
    return `${t(locale, 'stepOpen')} ${step.url ?? ''}`.trim();
  }
  return step.type + (step.selector ? ` · ${step.selector}` : '');
}

function attachSeekable(li: HTMLElement, relMs: number) {
  li.dataset.tMs = String(relMs);
  if (!hasVideo) return;
  li.dataset.seekable = 'true';
  li.title = t(locale, 'viewerSeekTo', { time: formatOffset(relMs) });
  li.addEventListener('click', () => {
    if (!hasVideo) return;
    videoPlayer.currentTime = Math.max(0, relMs / 1000);
    updateSyncHighlights();
  });
}

function updateSyncHighlights() {
  const now = currentRelMs();
  syncClock.textContent = formatOffset(now);

  const lists = document.querySelectorAll<HTMLElement>('.sync-list');
  for (const list of lists) {
    const items = Array.from(list.querySelectorAll<HTMLElement>('li[data-t-ms]'));
    let current: HTMLElement | null = null;
    for (const li of items) {
      const tMs = Number(li.dataset.tMs);
      li.classList.remove('is-past', 'is-current');
      if (!Number.isFinite(tMs)) continue;
      if (tMs <= now) {
        li.classList.add('is-past');
        current = li;
      }
    }
    if (current) {
      current.classList.remove('is-past');
      current.classList.add('is-current');
      const panel = current.closest('.sync-scroll') as HTMLElement | null;
      if (panel && !panel.hidden) {
        const panelRect = panel.getBoundingClientRect();
        const itemRect = current.getBoundingClientRect();
        if (itemRect.top < panelRect.top) {
          panel.scrollTop += itemRect.top - panelRect.top;
        } else if (itemRect.bottom > panelRect.bottom) {
          panel.scrollTop += itemRect.bottom - panelRect.bottom;
        }
      }
    }
  }
}

function renderDetail() {
  dismissDetail();
  const c = activeCase();
  if (!c) {
    detail.hidden = true;
    revokeActiveMedia();
    syncClock.textContent = formatOffset(0);
    return;
  }
  detail.hidden = false;
  revokeActiveMedia();

  const { report } = c.loaded;
  sessionBaseMs = Date.parse(report.window.from) || 0;

  document.getElementById('detail-label')!.textContent = c.label;
  document.getElementById('detail-page-title')!.textContent =
    report.page.title || hostFromReport(c.loaded);
  document.getElementById('detail-url')!.textContent = report.page.url;
  document.getElementById('detail-meta')!.textContent = t(
    locale,
    'viewerWindowMeta',
    {
      from: shortWhen(report.window.from),
      to: shortWhen(report.window.to),
      seconds: String(Math.round(report.window.seconds)),
      version: report.extensionVersion,
    },
  );

  const badge = document.getElementById('redaction-badge')!;
  if (report.redaction.enabled) {
    badge.hidden = false;
    badge.textContent = t(locale, 'viewerRedactionOn');
  } else {
    badge.hidden = true;
  }

  const summary = document.getElementById('summary-row')!;
  summary.replaceChildren();
  const bits: [string, number][] = [
    [t(locale, 'viewerSummaryErrors'), report.summary.errors],
    [t(locale, 'viewerSummaryFailed'), report.summary.failedRequests],
    [t(locale, 'viewerSummaryClicks'), report.summary.clicks],
    [t(locale, 'viewerSummaryShots'), report.summary.screenshots],
  ];
  for (const [label, value] of bits) {
    const span = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    span.append(document.createTextNode(`${label}: `), strong);
    summary.append(span);
  }

  const videoEmpty = document.getElementById('video-empty')!;
  if (c.loaded.video) {
    const url = URL.createObjectURL(c.loaded.video);
    mediaUrls.push(url);
    hasVideo = true;
    videoPlayer.hidden = false;
    videoPlayer.src = url;
    videoEmpty.hidden = true;
  } else {
    hasVideo = false;
    videoPlayer.hidden = true;
    videoEmpty.hidden = false;
    videoEmpty.textContent = t(locale, 'viewerNoVideo');
  }
  syncHint.textContent = hasVideo
    ? t(locale, 'viewerSyncHint')
    : t(locale, 'viewerSyncNoVideo');

  const stepsList = document.getElementById('steps-list')!;
  const stepsEmpty = document.getElementById('steps-empty')!;
  stepsList.replaceChildren();
  if (report.steps.length === 0) {
    stepsEmpty.hidden = false;
    stepsEmpty.textContent = t(locale, 'reportNoSteps');
  } else {
    stepsEmpty.hidden = true;
    for (const step of report.steps) {
      const li = document.createElement('li');
      const tEl = document.createElement('span');
      tEl.className = 't';
      tEl.textContent = formatOffset(step.t);
      li.append(tEl, document.createTextNode(describeStep(step)));
      attachSeekable(li, step.t);
      stepsList.append(li);
    }
  }

  const errorsList = document.getElementById('errors-list')!;
  const errorsEmpty = document.getElementById('errors-empty')!;
  errorsList.replaceChildren();
  if (report.errors.length === 0) {
    errorsEmpty.hidden = false;
    errorsEmpty.textContent = t(locale, 'reportNoErrors');
  } else {
    errorsEmpty.hidden = true;
    for (const err of report.errors) {
      const li = document.createElement('li');
      const tEl = document.createElement('span');
      tEl.className = 't';
      tEl.textContent = formatOffset(err.t);
      appendDetailRow(
        li,
        err.t,
        [
          tEl,
          document.createTextNode(
            err.source ? `${err.message} (${err.source})` : err.message,
          ),
        ],
        () => openError(err),
      );
      errorsList.append(li);
    }
  }

  const failedList = document.getElementById('failed-list')!;
  const failedEmpty = document.getElementById('failed-empty')!;
  failedList.replaceChildren();
  if (report.failedRequests.length === 0) {
    failedEmpty.hidden = false;
    failedEmpty.textContent = t(locale, 'reportNoFailed');
  } else {
    failedEmpty.hidden = true;
    for (const req of report.failedRequests) {
      const li = document.createElement('li');
      const tEl = document.createElement('span');
      tEl.className = 't';
      tEl.textContent = formatOffset(req.t);
      appendDetailRow(
        li,
        req.t,
        [
          tEl,
          document.createTextNode(
            `${req.method} ${req.status} · ${req.url} (${req.durationMs}ms)`,
          ),
        ],
        () => openFailed(req),
      );
      failedList.append(li);
    }
  }

  renderConsole(c);
  updateSyncHighlights();
}

function renderConsole(c: SessionCase) {
  dismissDetail();
  const level = consoleFilter.value;
  const list = document.getElementById('console-list')!;
  const empty = document.getElementById('console-empty')!;
  list.replaceChildren();
  const lines = c.loaded.console.filter(
    (line) => level === 'all' || line.level === level,
  );
  if (lines.length === 0) {
    empty.hidden = false;
    empty.textContent = t(locale, 'viewerNoConsole');
    return;
  }
  empty.hidden = true;
  for (const line of lines) {
    const relMs = sessionBaseMs ? line.t - sessionBaseMs : line.t;
    const li = document.createElement('li');
    const tEl = document.createElement('span');
    tEl.className = 't';
    tEl.textContent = formatOffset(relMs);
    const lvl = document.createElement('span');
    lvl.className = `level level-${line.level}`;
    const levelKey = CONSOLE_LEVEL_KEY[line.level];
    lvl.textContent = levelKey ? t(locale, levelKey) : line.level;
    const text = document.createTextNode(
      ` ${line.args.join(' ')}${line.source ? ` · ${line.source}` : ''}`,
    );
    appendDetailRow(li, relMs, [tEl, lvl, text], () => openConsole(line, relMs));
    list.append(li);
  }
  updateSyncHighlights();
}

type PageError = ReportJson['errors'][number];
type FailedRequest = ReportJson['failedRequests'][number];

function dismissDetail() {
  if (entryDialog.open) entryDialog.close();
}

function appendDetailRow(
  li: HTMLElement,
  relMs: number,
  nodes: Node[],
  open: () => void,
) {
  li.dataset.tMs = String(relMs);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'row-open';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.append(...nodes);
  btn.addEventListener('click', open);
  li.append(btn);
}

function textBlock(label: string, text: string): HTMLElement {
  const wrap = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = label;
  wrap.append(heading);
  const long = text.length > 180 || text.includes('\n');
  if (!long) {
    const p = document.createElement('p');
    p.className = 'entry-value';
    p.textContent = text;
    wrap.append(p);
    return wrap;
  }
  const id = `entry-sec-${++detailSectionId}`;
  heading.id = id;
  const pre = document.createElement('pre');
  pre.tabIndex = 0;
  pre.setAttribute('role', 'region');
  pre.setAttribute('aria-labelledby', id);
  const code = document.createElement('code');
  code.textContent = text;
  pre.append(code);
  wrap.append(pre);
  return wrap;
}

function headerBlock(
  label: string,
  headers: Record<string, string>,
): HTMLElement {
  const wrap = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = label;
  const list = document.createElement('dl');
  list.className = 'kv';
  for (const name of Object.keys(headers).sort((a, b) => a.localeCompare(b))) {
    const term = document.createElement('dt');
    term.textContent = name;
    const value = document.createElement('dd');
    value.textContent = headers[name] ?? '';
    list.append(term, value);
  }
  wrap.append(heading, list);
  return wrap;
}

function showDetail(opts: {
  kicker: string;
  title: string;
  tone?: 'error' | 'warn';
  relMs: number;
  blocks: HTMLElement[];
  copies?: { request: string; response: string; curl: string };
}) {
  if (entryDialog.open) entryDialog.close();
  entryKicker.textContent = `${opts.kicker} · ${formatOffset(opts.relMs)}`;
  entryTitle.textContent = opts.title;
  entryTitle.className = opts.tone ? `is-${opts.tone}` : '';
  entryBody.replaceChildren(...opts.blocks);
  clearCopyFeedback();
  if (opts.copies) {
    entryCopyRequest.value = opts.copies.request;
    entryCopyResponse.value = opts.copies.response;
    entryCopyCurl.value = opts.copies.curl;
    entryCopyActions.hidden = false;
  } else {
    entryCopyRequest.value = '';
    entryCopyResponse.value = '';
    entryCopyCurl.value = '';
    entryCopyActions.hidden = true;
  }
  const firstRegion = entryBody.querySelector('pre[role="region"]');
  if (firstRegion instanceof HTMLElement) firstRegion.autofocus = true;
  detailRelMs = opts.relMs;
  if (hasVideo) {
    entrySeek.hidden = false;
    entrySeek.textContent = t(locale, 'viewerSeekTo', {
      time: formatOffset(opts.relMs),
    });
  } else {
    entrySeek.hidden = true;
  }
  entryDialog.showModal();
}

function openConsole(line: ConsoleLine, relMs: number) {
  const levelKey = DETAIL_LEVEL_KEY[line.level];
  const blocks: HTMLElement[] = [];
  const message = line.args
    .map((arg) => {
      const presented = presentPayload(arg);
      return 'text' in presented ? presented.text : arg;
    })
    .join('\n');
  if (message) {
    blocks.push(textBlock(t(locale, 'viewerDetailMessage'), message));
  }
  if (line.source) {
    blocks.push(textBlock(t(locale, 'viewerDetailSource'), line.source));
  }
  if (line.stack) {
    blocks.push(textBlock(t(locale, 'viewerDetailStack'), line.stack));
  }
  showDetail({
    kicker: t(locale, 'viewerConsole'),
    title: levelKey ? t(locale, levelKey) : line.level,
    tone:
      line.level === 'error' ? 'error' : line.level === 'warn' ? 'warn' : undefined,
    relMs,
    blocks,
  });
}

function openError(err: PageError) {
  const blocks: HTMLElement[] = [];
  if (err.message) {
    blocks.push(textBlock(t(locale, 'viewerDetailMessage'), err.message));
  }
  if (err.source) {
    blocks.push(textBlock(t(locale, 'viewerDetailSource'), err.source));
  }
  if (err.stack) {
    blocks.push(textBlock(t(locale, 'viewerDetailStack'), err.stack));
  }
  showDetail({
    kicker: t(locale, 'viewerErrors'),
    title: t(locale, 'viewerDetailPageError'),
    tone: 'error',
    relMs: err.t,
    blocks,
  });
}

function openFailed(req: FailedRequest) {
  const net = matchNetworkEvent(activeCase()?.loaded.events ?? [], {
    t: req.t,
    method: req.method,
    url: req.url,
    status: req.status,
    baseMs: sessionBaseMs,
  });
  const blocks: HTMLElement[] = [
    textBlock(t(locale, 'viewerDetailUrl'), req.url),
    textBlock(
      t(locale, 'viewerDetailAnswer'),
      answerText(req.status, net?.statusText),
    ),
    textBlock(
      t(locale, 'viewerDetailDuration'),
      `${req.durationMs} ms`,
    ),
  ];
  if (typeof net?.size === 'number') {
    blocks.push(textBlock(t(locale, 'viewerDetailSize'), formatSize(net.size)));
  }
  if (net?.resourceType) {
    blocks.push(textBlock(t(locale, 'viewerDetailKind'), net.resourceType));
  }
  if (net?.requestHeaders) {
    blocks.push(
      headerBlock(t(locale, 'viewerDetailSentHeaders'), net.requestHeaders),
    );
  }
  pushPayload(
    blocks,
    t(locale, 'viewerDetailSentData'),
    net?.requestBody,
    net?.requestEncoding,
  );
  if (net?.responseHeaders) {
    blocks.push(
      headerBlock(
        t(locale, 'viewerDetailReceivedHeaders'),
        net.responseHeaders,
      ),
    );
  }
  pushPayload(
    blocks,
    t(locale, 'viewerDetailReceivedData'),
    net?.responseBody,
    net?.responseEncoding,
  );
  const exchange = {
    method: req.method,
    url: req.url,
    status: req.status,
    statusText: net?.statusText,
    requestHeaders: net?.requestHeaders,
    responseHeaders: net?.responseHeaders,
    requestBody: net?.requestBody,
    requestEncoding: net?.requestEncoding,
    responseBody: net?.responseBody,
    responseEncoding: net?.responseEncoding,
  };
  const binaryNote = (bytes: number) =>
    t(locale, 'viewerDetailNotText', { bytes: String(bytes) });
  showDetail({
    kicker: t(locale, 'viewerFailed'),
    title: `${req.method} ${req.status}`,
    tone: 'error',
    relMs: req.t,
    blocks,
    copies: {
      request: requestCopyText(exchange, binaryNote),
      response: responseCopyText(exchange, binaryNote),
      curl: curlCopyText(exchange, binaryNote),
    },
  });
}

function pushPayload(
  blocks: HTMLElement[],
  label: string,
  body: string | undefined,
  encoding: string | undefined,
) {
  if (!body) return;
  const presented = presentPayload(body, encoding);
  if ('binaryBytes' in presented) {
    blocks.push(
      textBlock(
        label,
        t(locale, 'viewerDetailNotText', {
          bytes: String(presented.binaryBytes),
        }),
      ),
    );
    return;
  }
  blocks.push(textBlock(label, presented.text));
}

function answerText(status: number, statusText?: string): string {
  const reason = statusText?.trim();
  if (!reason) return String(status);
  if (status === 0) return reason;
  return `${status} ${reason}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

function renderAll() {
  applyChromeLabels();
  renderCaseList();
  renderDetail();
}

function pushCase(label: string, loaded: LoadedCase) {
  const entry: SessionCase = {
    id: newId(),
    label,
    loaded,
    objectUrls: [],
  };
  cases.push(entry);
  activeId = entry.id;
}

function presentThrown(error: unknown): string {
  if (error instanceof QuietReplayCaseError || error instanceof QuietReplayBundleError) {
    if (error.code === 'unreadable') return t(locale, 'viewerReadFailed');
    if (error.code === 'empty') return t(locale, 'viewerBundleEmpty');
  }
  return t(locale, 'viewerInvalidZip');
}

function presentBundleError(error: BundleLoadError): string {
  if (error.code === 'missing') {
    return t(locale, 'viewerMissingNested', { name: error.path });
  }
  const detail =
    error.code === 'unreadable'
      ? t(locale, 'viewerReadFailed')
      : t(locale, 'viewerInvalidZip');
  return `${error.path}: ${detail}`;
}

async function addZipFile(file: File) {
  const kind = await peekZipKind(file);
  if (kind === 'bundle') {
    const result = await loadBundleZip(file);
    if (result.bundle.title && !bundleTitleEl.value) {
      bundleTitleEl.value = result.bundle.title;
    }
    for (const entry of result.entries) {
      pushCase(entry.label, entry.loaded);
    }
    if (result.errors.length) {
      setLoadError(result.errors.map(presentBundleError).join(' · '));
    }
    if (result.entries.length === 0 && result.errors.length === 0) {
      setLoadError(t(locale, 'viewerBundleEmpty'));
    }
    return;
  }
  if (kind === 'case') {
    const loaded = await loadQuietReplayCase(file);
    pushCase(labelFromFilename(file.name), loaded);
    return;
  }
  throw new QuietReplayCaseError('not-recording');
}

async function ingestFiles(files: File[]) {
  if (!files.length) return;
  setLoadError(null);
  const messages: string[] = [];
  for (const file of files) {
    try {
      await addZipFile(file);
    } catch (e) {
      messages.push(`${file.name}: ${presentThrown(e)}`);
    }
  }
  if (messages.length) setLoadError(messages.join(' · '));
  renderAll();
}

addBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const files = fileInput.files;
  if (!files?.length) return;
  await ingestFiles(Array.from(files));
  fileInput.value = '';
});

function isFileDrag(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

layout.addEventListener('dragover', (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  layout.classList.add('is-drop');
});

layout.addEventListener('dragleave', (event) => {
  const next = event.relatedTarget;
  if (next instanceof Node && layout.contains(next)) return;
  layout.classList.remove('is-drop');
});

layout.addEventListener('drop', (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  layout.classList.remove('is-drop');
  const files = Array.from(event.dataTransfer?.files ?? []);
  void ingestFiles(files);
});

consoleFilter.addEventListener('change', () => {
  const c = activeCase();
  if (c) renderConsole(c);
});

videoPlayer.addEventListener('timeupdate', () => updateSyncHighlights());
videoPlayer.addEventListener('seeked', () => updateSyncHighlights());
videoPlayer.addEventListener('play', () => updateSyncHighlights());
videoPlayer.addEventListener('loadedmetadata', () => updateSyncHighlights());

saveBundleBtn.addEventListener('click', async () => {
  if (cases.length === 0) return;
  saveBundleBtn.disabled = true;
  bundleStatus.textContent = t(locale, 'viewerBundleSaving');
  try {
    const { blob, filename } = await buildBundleZip({
      title: bundleTitleEl.value || t(locale, 'viewerDefaultBundleTitle'),
      cases: cases.map((c) => ({
        label: c.label,
        zipBlob: c.loaded.sourceBlob,
      })),
      filename: bundleFilenameEl.value,
    });
    const url = URL.createObjectURL(blob);
    try {
      await chrome.downloads.download({
        url,
        filename,
        saveAs: true,
      });
      bundleStatus.textContent = t(locale, 'viewerBundleSaved');
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  } catch (e) {
    bundleStatus.textContent =
      e instanceof QuietReplayBundleError
        ? presentThrown(e)
        : t(locale, 'viewerBundleSaveFailed');
  } finally {
    saveBundleBtn.disabled = cases.length === 0;
  }
});

function clearCopyFeedback() {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '.copy-button',
  )) {
    const pending = copyTimers.get(button);
    if (pending) clearTimeout(pending);
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');
    const tip = button.nextElementSibling;
    if (tip) tip.textContent = '';
  }
}

function reportCopy(button: HTMLButtonElement, ok: boolean) {
  const tip = button.nextElementSibling;
  if (!(tip instanceof HTMLElement)) return;
  const pending = copyTimers.get(button);
  if (pending) clearTimeout(pending);
  button.removeAttribute('data-copied');
  button.removeAttribute('data-failed');
  let message = t(locale, ok ? 'viewerCopied' : 'viewerCopyFailed');
  if (message === lastCopyMessage) message += '\u00A0';
  lastCopyMessage = message;
  tip.textContent = '';
  void button.offsetWidth;
  button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
  requestAnimationFrame(() => {
    tip.textContent = message;
  });
  copyTimers.set(
    button,
    window.setTimeout(() => {
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      tip.textContent = '';
    }, 2000),
  );
}

async function copyFrom(button: HTMLButtonElement, target: HTMLElement) {
  const text =
    target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
      ? target.value
      : target.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    reportCopy(button, true);
  } catch {
    reportCopy(button, false);
  }
}

function isCopyCommand(event: Event): event is Event & {
  command: string;
  source: Element | null;
} {
  if (!('command' in event) || typeof event.command !== 'string') return false;
  return event.command.startsWith('--copy') && 'source' in event;
}

if ('CommandEvent' in window) {
  document.addEventListener(
    'command',
    (event) => {
      if (!isCopyCommand(event)) return;
      const button = event.source;
      const target = event.target;
      if (!(button instanceof HTMLButtonElement)) return;
      if (!(target instanceof HTMLElement)) return;
      void copyFrom(button, target);
    },
    true,
  );
} else {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[command^="--copy"]');
    if (!(button instanceof HTMLButtonElement)) return;
    const id = button.getAttribute('commandfor');
    const target = id ? document.getElementById(id) : null;
    if (target) void copyFrom(button, target);
  });
}

entryDialog.addEventListener('close', () => {
  clearCopyFeedback();
});

entrySeek.addEventListener('click', () => {
  if (!hasVideo) return;
  videoPlayer.currentTime = Math.max(0, detailRelMs / 1000);
  entryDialog.close();
  updateSyncHighlights();
});

if (!('closedBy' in HTMLDialogElement.prototype)) {
  const outsideDialog = (event: PointerEvent) => {
    const rect = entryDialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };
  let pressedOutside = false;
  entryDialog.addEventListener('pointerdown', (event) => {
    pressedOutside = outsideDialog(event);
  });
  entryDialog.addEventListener('pointerup', (event) => {
    if (pressedOutside && outsideDialog(event)) entryDialog.close();
  });
}

window.addEventListener('beforeunload', () => {
  revokeActiveMedia();
  for (const c of cases) revokeUrls(c.objectUrls);
});

async function boot() {
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'qr:get-status',
    })) as { settings: Settings };
    locale = res.settings.locale;
  } catch {
    locale = 'en';
  }
  renderAll();
}

void boot();
