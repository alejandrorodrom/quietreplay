import JSZip from 'jszip';
import { maybeMaskKey } from './describe-target';
import { scrubExtensionNoise } from './filter-extension';
import { buildHar } from './har';
import {
  maybeRedactHeaders,
  maybeRedactJsonString,
  maybeRedactText,
  maybeRedactUrl,
} from './maybe-redact';
import type { CustomRedactionRule } from './redact';
import { buildReport } from './report';
import type { CapturedEvent, Settings } from './types';
import { yieldToMain } from './yield';

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return { bytes: new Uint8Array(), ext: 'bin' };
  const mime = m[1]!;
  const bin = atob(m[2]!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mime.includes('png') ? 'png' : 'jpg';
  return { bytes, ext };
}

export async function buildZipBlob(
  events: CapturedEvent[],
  settings: Settings,
  opts: {
    extensionVersion: string;
    videoBlob?: Blob | null;
    extensionId?: string;
  },
): Promise<{ blob: Blob; filename: string }> {
  const custom = settings.customRedactionRules;
  const obfuscate = settings.obfuscationEnabled;
  const clean = scrubExtensionNoise(events, opts.extensionId);
  const zip = new JSZip();
  const baseT = clean[0]?.t ?? Date.now();

  const screenshotFiles: string[] = [];
  let shotIdx = 0;
  for (const e of clean) {
    if (e.kind !== 'screenshot') continue;
    shotIdx++;
    const { bytes, ext } = dataUrlToBytes(e.dataUrl);
    const name = `screenshots/${String(shotIdx).padStart(3, '0')}-${e.t}.${ext}`;
    zip.file(name, bytes);
    screenshotFiles.push(name);
    if (shotIdx % 3 === 0) await yieldToMain();
  }

  const consoleEvents = clean.flatMap((e) => {
    if (e.kind === 'console') {
      return [
        {
          t: e.t,
          level: e.level,
          source: e.source
            ? maybeRedactText(obfuscate, e.source, custom)
            : undefined,
          args: e.args.map((a) => maybeRedactText(obfuscate, a, custom)),
          stack: e.stack
            ? maybeRedactText(obfuscate, e.stack, custom)
            : undefined,
        },
      ];
    }
    if (e.kind === 'error') {
      return [
        {
          t: e.t,
          level: 'error',
          source: e.source
            ? maybeRedactText(obfuscate, e.source, custom)
            : undefined,
          args: [maybeRedactText(obfuscate, e.message, custom)],
          stack: e.stack
            ? maybeRedactText(obfuscate, e.stack, custom)
            : undefined,
        },
      ];
    }
    return [];
  });

  const timeline = clean
    .filter((e) => e.kind !== 'screenshot' && e.kind !== 'env')
    .map((e) => mapEvent(e, custom, obfuscate));

  const hasNetwork = clean.some((e) => e.kind === 'network');
  if (hasNetwork) {
    zip.file(
      'network.har',
      JSON.stringify(buildHar(clean), null, 2),
    );
  }

  zip.file('console.json', JSON.stringify(consoleEvents, null, 2));
  zip.file('events.json', JSON.stringify(timeline, null, 2));

  const hasVideo = Boolean(opts.videoBlob && opts.videoBlob.size > 0);
  if (hasVideo && opts.videoBlob) {
    zip.file('video.webm', await opts.videoBlob.arrayBuffer());
  }

  const { report, markdown } = await buildReport(clean, settings, {
    extensionVersion: opts.extensionVersion,
    screenshotFiles,
    hasHar: hasNetwork,
    hasVideo,
    baseT,
  });

  zip.file('report.json', JSON.stringify(report, null, 2));
  zip.file('report.md', markdown);

  await yieldToMain();
  const partial = await zip.generateAsync({ type: 'arraybuffer' });
  const filesMeta: Record<string, string> = {};
  const paths = Object.keys(zip.files).filter((p) => !zip.files[p]!.dir);
  for (const path of paths) {
    const f = zip.file(path);
    if (!f) continue;
    const buf = await f.async('arraybuffer');
    filesMeta[path] = await sha256Hex(buf);
  }
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        extensionVersion: opts.extensionVersion,
        createdAt: new Date().toISOString(),
        files: filesMeta,
      },
      null,
      2,
    ),
  );

  void partial;
  const blob = await zip.generateAsync({ type: 'blob' });
  const env = [...clean].reverse().find((e) => e.kind === 'env');
  let host = 'page';
  try {
    host = env?.kind === 'env' ? new URL(env.url).hostname || 'page' : 'page';
  } catch {
    host = 'page';
  }
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '-',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
  const filename = `quietreplay-${stamp}-${host}.zip`;
  return { blob, filename };
}

function mapEvent(
  e: CapturedEvent,
  custom: CustomRedactionRule[],
  obfuscate: boolean,
): unknown {
  switch (e.kind) {
    case 'console':
      return {
        kind: e.kind,
        t: e.t,
        level: e.level,
        source: e.source
          ? maybeRedactText(obfuscate, e.source, custom)
          : undefined,
        args: e.args.map((a) => maybeRedactText(obfuscate, a, custom)),
        stack: e.stack
          ? maybeRedactText(obfuscate, e.stack, custom)
          : undefined,
      };
    case 'error':
      return {
        kind: e.kind,
        t: e.t,
        message: maybeRedactText(obfuscate, e.message, custom),
        stack: e.stack
          ? maybeRedactText(obfuscate, e.stack, custom)
          : undefined,
        source: e.source
          ? maybeRedactText(obfuscate, e.source, custom)
          : undefined,
      };
    case 'network':
      return {
        kind: e.kind,
        t: e.t,
        method: e.method,
        url: maybeRedactUrl(obfuscate, e.url, custom),
        status: e.status,
        durationMs: e.durationMs,
        requestHeaders: e.requestHeaders
          ? maybeRedactHeaders(obfuscate, e.requestHeaders, custom)
          : undefined,
        responseHeaders: e.responseHeaders
          ? maybeRedactHeaders(obfuscate, e.responseHeaders, custom)
          : undefined,
        statusText: e.statusText,
        requestBody: e.requestBody
          ? e.requestEncoding === 'base64'
            ? e.requestBody
            : maybeRedactJsonString(obfuscate, e.requestBody, custom)
          : undefined,
        requestEncoding: e.requestEncoding,
        responseBody: e.responseBody
          ? e.responseEncoding === 'base64'
            ? e.responseBody
            : maybeRedactJsonString(obfuscate, e.responseBody, custom)
          : undefined,
        responseEncoding: e.responseEncoding,
        size: e.size,
        resourceType: e.resourceType,
      };
    case 'click':
    case 'keydown':
      return {
        kind: e.kind,
        t: e.t,
        selector: e.selector,
        text: e.text
          ? maybeRedactText(obfuscate, e.text, custom)
          : undefined,
        inputType: e.inputType,
        x: e.x,
        y: e.y,
        key: maybeMaskKey(e.key, e.inputType, obfuscate),
      };
    case 'navigation':
      return {
        kind: e.kind,
        t: e.t,
        url: maybeRedactUrl(obfuscate, e.url, custom),
        title: maybeRedactText(obfuscate, e.title, custom),
      };
    default:
      return { kind: e.kind, t: e.t };
  }
}
