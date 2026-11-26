import { base64ToBlob } from '../lib/binary';
import { CircularBuffer } from '../lib/buffer';
import { isExtensionNoise } from '../lib/filter-extension';
import {
  defaultZipFilename,
  hostFromUrl,
  sanitizeZipFilename,
} from '../lib/filename';
import { ensureSettings, saveSettings } from '../lib/settings';
import type { CapturedEvent, Settings, TabStatus } from '../lib/types';
import { buildZipBlob } from '../lib/zip';

type StoredBody = {
  body: string;
  encoding?: 'base64';
  size?: number;
};

type TabState = {
  status: TabStatus;
  buffer: CircularBuffer;
  token: string;
  eventName: string;
  lastCaptureAt: number;
  networkBodies: Map<string, StoredBody>;
  originPattern?: string;
};

type PersistedArm = {
  token: string;
  eventName: string;
  originPattern?: string;
};

const ARMED_KEY = 'quietreplay.armed';
const tabs = new Map<number, TabState>();
let settingsCache: Settings | null = null;
const reinjecting = new Set<number>();
/** Whether offscreen MediaRecorder is currently capturing the tab. */
let videoActive = false;
/** Tab that owns the offscreen capture. One recording at a time. */
let videoTabId: number | null = null;
let lastVideoError: string | null = null;

const BLUR_STYLE_ID = 'quietreplay-blur-style';

function randomToken(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSettings(): Promise<Settings> {
  if (!settingsCache) settingsCache = await ensureSettings();
  return settingsCache;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['quietreplay.settings']) {
    settingsCache = changes['quietreplay.settings'].newValue as Settings;
  }
});

async function persistArmed() {
  const payload: Record<string, PersistedArm> = {};
  for (const [tabId, st] of tabs) {
    if (st.status === 'idle') continue;
    payload[String(tabId)] = {
      token: st.token,
      eventName: st.eventName,
      originPattern: st.originPattern,
    };
  }
  await chrome.storage.session.set({ [ARMED_KEY]: payload });
}

async function restoreArmed() {
  const data = await chrome.storage.session.get(ARMED_KEY);
  const payload = (data[ARMED_KEY] ?? {}) as Record<string, PersistedArm>;
  for (const [id, meta] of Object.entries(payload)) {
    const tabId = Number(id);
    if (!Number.isFinite(tabId) || tabs.has(tabId)) continue;
    tabs.set(tabId, {
      status: 'armed',
      buffer: new CircularBuffer(),
      token: meta.token,
      eventName: meta.eventName,
      lastCaptureAt: 0,
      networkBodies: new Map(),
      originPattern: meta.originPattern,
    });
    reapplyBadge(tabId);
    void injectCapture(tabId, tabs.get(tabId)!);
  }
}

async function setBadge(tabId: number, status: TabStatus) {
  const map: Record<TabStatus, { text: string; color: string }> = {
    idle: { text: '', color: '#888' },
    armed: { text: 'REC', color: '#e11' },
    saving: { text: '…', color: '#e90' },
    ready: { text: '✓', color: '#1a7' },
  };
  const m = map[status];
  try {
    await chrome.action.setBadgeText({ tabId, text: m.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: m.color });
  } catch {
    /* tab may be gone */
  }
}

/**
 * Chrome drops the per-tab toolbar badge when the document navigates, even
 * though the capture session is still in memory. Apply it now and again
 * shortly after, so a reload cannot leave the tab recording with no REC.
 * The delayed pass also covers the case where this runs before restoreArmed
 * has put the tab back into `tabs`.
 */
function reapplyBadge(tabId: number) {
  const apply = () => {
    const st = tabs.get(tabId);
    if (!st || st.status === 'idle') return;
    void setBadge(tabId, st.status);
  };
  apply();
  setTimeout(apply, 200);
}

async function injectBlur(tabId: number, settings: Settings) {
  if (!settings.obfuscationEnabled) return;
  const extra = settings.customBlurSelectors.join(',');
  const selectors = [
    'input',
    'textarea',
    '[contenteditable]',
    '[type=password]',
    '[data-private]',
    extra,
  ]
    .filter(Boolean)
    .join(',');
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (sel, id) => {
      let style = document.getElementById(id) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = id;
        document.documentElement.appendChild(style);
      }
      style.textContent = `${sel}{filter:blur(8px)!important}`;
    },
    args: [selectors, BLUR_STYLE_ID],
  });
}

async function removeBlur(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (id) => {
        document.getElementById(id)?.remove();
      },
      args: [BLUR_STYLE_ID],
    });
  } catch {
    /* tab may be gone */
  }
}

async function captureShot(tabId: number, st: TabState) {
  const now = Date.now();
  if (now - st.lastCaptureAt < 2000) return;
  st.lastCaptureAt = now;
  const settings = await getSettings();
  try {
    await injectBlur(tabId, settings);
    if (settings.obfuscationEnabled) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'jpeg',
      quality: 80,
    });
    await removeBlur(tabId);
    st.buffer.push({
      kind: 'screenshot',
      t: now,
      id: `s-${now}`,
      mime: 'image/jpeg',
      dataUrl,
    });
  } catch {
    try {
      await removeBlur(tabId);
    } catch {
      /* ignore */
    }
  }
}

async function requestTabOrigin(tabId: number): Promise<string | undefined> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !/^https?:/i.test(tab.url)) return undefined;
    const originPattern = `${new URL(tab.url).origin}/*`;
    const has = await chrome.permissions.contains({
      origins: [originPattern],
    });
    if (!has) {
      await chrome.permissions.request({ origins: [originPattern] });
    }
    return originPattern;
  } catch {
    return undefined;
  }
}

async function injectCapture(tabId: number, st: TabState) {
  if (reinjecting.has(tabId)) return;
  reinjecting.add(tabId);
  try {
    const settings = await getSettings();
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: (eventName, token, tabId) => {
        (
          window as unknown as { __quietreplay_bridge_cfg: unknown }
        ).__quietreplay_bridge_cfg = { eventName, token, tabId };
        (
          window as unknown as { __quietreplay_bridge?: boolean }
        ).__quietreplay_bridge = false;
      },
      args: [st.eventName, st.token, tabId],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      files: ['bridge.js'],
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (eventName, token, captureBodies) => {
        (window as unknown as { __quietreplay_cfg: unknown }).__quietreplay_cfg =
          {
            eventName,
            token,
            captureBodies,
          };
        (
          window as unknown as { __quietreplay_main?: boolean }
        ).__quietreplay_main = false;
      },
      args: [st.eventName, st.token, settings.captureBodies],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      files: ['recorder-main.js'],
    });
  } catch {
    /* navigation race / no permission */
  } finally {
    reinjecting.delete(tabId);
  }
}

async function armTab(tabId: number) {
  const existing = tabs.get(tabId);
  if (existing && existing.status !== 'idle') return;

  const settings = await getSettings();
  const token = randomToken();
  const eventName = `qr-${token.slice(0, 12)}`;
  const originPattern = await requestTabOrigin(tabId);
  const st: TabState = {
    status: 'armed',
    buffer: new CircularBuffer(),
    token,
    eventName,
    lastCaptureAt: 0,
    networkBodies: new Map(),
    originPattern,
  };
  tabs.set(tabId, st);
  await persistArmed();
  await setBadge(tabId, 'armed');

  // Start video before heavy script injection so the stream ID is
  // obtained/redeemed while the extension invocation is still fresh.
  if (settings.videoEnabled) {
    await startVideo(tabId, settings);
  }

  await injectCapture(tabId, st);
  await captureShot(tabId, st);
}

/** Restore page hooks and stop forwarding events for this tab. */
async function stopPageHooks(tabId: number) {
  const call = (world: 'ISOLATED' | 'MAIN', name: string) =>
    chrome.scripting.executeScript({
      target: { tabId },
      world,
      func: (fnName: string) => {
        const stop = (window as unknown as Record<string, unknown>)[fnName];
        if (typeof stop === 'function') (stop as () => void)();
      },
      args: [name],
    });
  try {
    await call('MAIN', '__quietreplay_stop_main');
    await call('ISOLATED', '__quietreplay_stop_bridge');
  } catch {
    /* tab gone or page not scriptable */
  }
}

async function clearTabCapture(tabId: number) {
  await stopPageHooks(tabId);
  if (videoTabId === tabId) await stopVideo();
  try {
    await removeBlur(tabId);
  } catch {
    /* ignore */
  }
  tabs.delete(tabId);
  await persistArmed();
  await setBadge(tabId, 'idle');
}

/** Stop without exporting (e.g. tab closed mid-capture). */
async function disarmTab(tabId: number) {
  if (!tabs.has(tabId)) return;
  await clearTabCapture(tabId);
}

async function suggestedFilenameForTab(tabId: number): Promise<string> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return defaultZipFilename(hostFromUrl(tab.url));
  } catch {
    return defaultZipFilename('page');
  }
}

let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreen() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    documentUrls: [offscreenUrl],
  });
  if (contexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }
  creatingOffscreen = (async () => {
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [
          'USER_MEDIA' as chrome.offscreen.Reason,
          'BLOBS' as chrome.offscreen.Reason,
        ],
        justification: 'Record tab video for QuietReplay buffer',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Already open from a race — fine.
      if (!/already|exists/i.test(msg)) throw err;
    } finally {
      creatingOffscreen = null;
    }
  })();
  await creatingOffscreen;
}

async function waitOffscreenReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'qr:video-ping',
        target: 'offscreen',
      })) as { ok?: boolean } | undefined;
      if (res?.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('offscreen-not-ready');
}

async function startVideo(tabId: number, _settings: Settings) {
  lastVideoError = null;
  try {
    await ensureOffscreen();
    await waitOffscreenReady();

    // Obtain the stream ID late, then redeem it immediately (single-use, short TTL).
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });
    const res = (await chrome.runtime.sendMessage({
      type: 'qr:video-start',
      target: 'offscreen',
      streamId,
    })) as { ok?: boolean; error?: string } | undefined;
    if (!res?.ok) {
      lastVideoError = res?.error || 'start-failed';
      videoActive = false;
      videoTabId = null;
      await closeOffscreen();
      return;
    }
    videoActive = true;
    videoTabId = tabId;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
    lastVideoError = message || 'start-failed';
    videoActive = false;
    videoTabId = null;
    await closeOffscreen();
  }
}

async function closeOffscreen() {
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    });
    if (contexts.length === 0) return;
    await chrome.offscreen.closeDocument();
  } catch {
    /* already closed */
  }
}

async function stopVideo(): Promise<Blob | null> {
  const wasActive = videoActive || videoTabId != null;
  videoActive = false;
  videoTabId = null;
  if (!wasActive) {
    await closeOffscreen();
    return null;
  }
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'qr:video-stop',
      target: 'offscreen',
    })) as
      | { ok?: boolean; base64?: string; mimeType?: string; error?: string }
      | undefined;
    await chrome.runtime
      .sendMessage({ type: 'qr:video-close', target: 'offscreen' })
      .catch(() => undefined);
    if (res?.ok && res.base64) {
      return base64ToBlob(res.base64, res.mimeType || 'video/webm');
    }
    if (!lastVideoError) lastVideoError = res?.error || 'empty-recording';
  } catch (err) {
    lastVideoError = err instanceof Error ? err.message : String(err);
  } finally {
    await closeOffscreen();
  }
  return null;
}

/** Export ZIP and end the capture session. */
async function saveAndStopTab(tabId: number, customFilename?: string) {
  const st = tabs.get(tabId);
  if (!st || st.status === 'saving') return;
  st.status = 'saving';
  await setBadge(tabId, 'saving');
  const settings = await getSettings();
  const videoPromise = videoTabId === tabId ? stopVideo() : Promise.resolve(null);
  await stopPageHooks(tabId);
  let exported = false;
  try {
    await captureShot(tabId, st);
    const events = st.buffer.snapshot();
    for (const e of events) {
      if (e.kind === 'network') {
        const key = `${e.method}|${e.url}|${e.t}`;
        const saved = st.networkBodies.get(key);
        if (saved) {
          e.responseBody = saved.body;
          if (saved.encoding) e.responseEncoding = saved.encoding;
          if (e.size == null && saved.size != null) e.size = saved.size;
        }
      }
    }
    const videoBlob = await videoPromise;
    try {
      await removeBlur(tabId);
    } catch {
      /* ignore */
    }

    const { blob, filename: autoName } = await buildZipBlob(events, settings, {
      extensionVersion: chrome.runtime.getManifest().version,
      videoBlob,
      extensionId: chrome.runtime.id,
    });
    const filename =
      sanitizeZipFilename(customFilename ?? '') || autoName;

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]!);
    const dataUrl = `data:application/zip;base64,${btoa(binary)}`;
    const folder =
      settings.downloadSubfolder.replace(/[/\\]/g, '') || 'quietreplay';
    await chrome.downloads.download({
      url: dataUrl,
      filename: `${folder}/${filename}`,
      saveAs: false,
    });
    exported = true;
  } finally {
    await videoPromise;
    await stopPageHooks(tabId);
    if (videoTabId === tabId) await stopVideo();
    try {
      await removeBlur(tabId);
    } catch {
      /* tab may be gone */
    }
    tabs.delete(tabId);
    await persistArmed();
    if (exported) {
      await setBadge(tabId, 'ready');
      setTimeout(() => {
        void setBadge(tabId, 'idle');
      }, 1500);
    } else {
      await setBadge(tabId, 'idle');
    }
  }
}

function recordPageEvent(msg: {
  tabId?: number;
  event?: Record<string, unknown> & {
    kind?: string;
    token?: string;
    t?: number;
    method?: string;
    url?: string;
    responseBody?: unknown;
    responseEncoding?: unknown;
    size?: unknown;
  };
}): void {
  const tabId = msg.tabId;
  if (tabId == null) return;
  const st = tabs.get(tabId);
  if (!st || st.status !== 'armed' || !msg.event) return;
  const ev = msg.event;
  if (ev.token && ev.token !== st.token) return;
  if (isExtensionNoise(ev, chrome.runtime.id)) return;
  if (ev.kind === 'network-body') {
    const key = `${ev.method}|${ev.url}|${ev.t}`;
    if (typeof ev.responseBody === 'string') {
      st.networkBodies.set(key, {
        body: ev.responseBody,
        encoding: ev.responseEncoding === 'base64' ? 'base64' : undefined,
        size: typeof ev.size === 'number' ? ev.size : undefined,
      });
    }
    return;
  }
  const { token: _t, ...rest } = ev;
  st.buffer.push(rest as CapturedEvent);
  if (rest.kind === 'click' || rest.kind === 'navigation') {
    void captureShot(tabId, st);
  }
}

async function activeTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

export default defineBackground(() => {
  void restoreArmed();

  chrome.commands.onCommand.addListener((command) => {
    void (async () => {
      const tabId = await activeTabId();
      if (!tabId) return;
      if (command === 'arm' || command === 'save') {
        const st = tabs.get(tabId);
        if (st && st.status !== 'idle') await saveAndStopTab(tabId);
        else if (command === 'arm') await armTab(tabId);
      }
    })();
  });

  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status !== 'loading' && info.status !== 'complete') return;
    const st = tabs.get(tabId);
    if (st?.status === 'armed') void injectCapture(tabId, st);
    reapplyBadge(tabId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (!tabs.has(tabId)) return;
    const ownsVideo = videoTabId === tabId;
    tabs.delete(tabId);
    void persistArmed();
    if (ownsVideo) void stopVideo();
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // Offscreen document owns video start/stop/close — do not claim the channel.
    if (
      typeof msg?.type === 'string' &&
      msg.type.startsWith('qr:video-')
    ) {
      return false;
    }
    // The page bridge does not wait for a reply. Returning true here makes
    // Chrome log "A listener indicated an asynchronous response...".
    if (msg?.type === 'qr:event') {
      recordPageEvent(msg);
      return false;
    }
    void (async () => {
      if (msg?.type === 'qr:get-status') {
        const tabId = (msg.tabId as number) || (await activeTabId());
        const st = tabId ? tabs.get(tabId) : undefined;
        const settings = await getSettings();
        sendResponse({
          status: st?.status ?? 'idle',
          settings,
          videoActive,
          videoEnabled: settings.videoEnabled,
          lastVideoError,
          suggestedFilename: tabId
            ? await suggestedFilenameForTab(tabId)
            : defaultZipFilename('page'),
        });
        return;
      }
      if (msg?.type === 'qr:arm' || msg?.type === 'qr:start') {
        const tabId = (msg.tabId as number) || (await activeTabId());
        if (tabId) await armTab(tabId);
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === 'qr:stop' || msg?.type === 'qr:save') {
        const tabId = (msg.tabId as number) || (await activeTabId());
        if (tabId) {
          await saveAndStopTab(
            tabId,
            typeof msg.filename === 'string' ? msg.filename : undefined,
          );
        }
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === 'qr:toggle') {
        const tabId = (msg.tabId as number) || (await activeTabId());
        if (tabId) {
          const st = tabs.get(tabId);
          if (st && st.status !== 'idle') {
            await saveAndStopTab(
              tabId,
              typeof msg.filename === 'string' ? msg.filename : undefined,
            );
          } else {
            await armTab(tabId);
          }
        }
        sendResponse({
          ok: true,
          status: tabId ? (tabs.get(tabId)?.status ?? 'idle') : 'idle',
        });
        return;
      }
      if (msg?.type === 'qr:disarm') {
        const tabId = (msg.tabId as number) || (await activeTabId());
        if (tabId) await disarmTab(tabId);
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === 'qr:save-settings') {
        settingsCache = await saveSettings(msg.patch);
        sendResponse({ settings: settingsCache });
        return;
      }
    })();
    return true;
  });
});
