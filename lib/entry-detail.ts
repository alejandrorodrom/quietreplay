/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

/** Turn a captured body into something the detail dialog can show. */

export function presentPayload(
  body: string,
  encoding?: string,
): { text: string } | { binaryBytes: number } {
  if (encoding === 'base64') return { binaryBytes: base64Bytes(body) };
  return { text: prettyJson(body) };
}

export type NetworkMatch = {
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  requestEncoding?: 'base64';
  responseBody?: string;
  responseEncoding?: 'base64';
  size?: number;
  resourceType?: string;
};

const MATCH_MS = 50;

/**
 * Find the network event behind a failed-request row.
 * Report times are relative to `baseMs`; events.json times are absolute.
 */
export function matchNetworkEvent(
  events: readonly unknown[],
  query: {
    t: number;
    method: string;
    url: string;
    status: number;
    baseMs: number;
  },
): NetworkMatch | null {
  const abs = query.baseMs + query.t;
  let best: Record<string, unknown> | null = null;
  let bestDelta = Infinity;
  for (const raw of events) {
    if (!isRecord(raw) || raw.kind !== 'network') continue;
    if (
      raw.method !== query.method ||
      raw.url !== query.url ||
      raw.status !== query.status
    ) {
      continue;
    }
    if (typeof raw.t !== 'number') continue;
    const delta = Math.abs(raw.t - abs);
    if (delta < bestDelta) {
      best = raw;
      bestDelta = delta;
    }
  }
  if (!best || bestDelta > MATCH_MS) return null;
  return {
    statusText:
      typeof best.statusText === 'string' ? best.statusText : undefined,
    requestHeaders: stringMap(best.requestHeaders),
    responseHeaders: stringMap(best.responseHeaders),
    requestBody:
      typeof best.requestBody === 'string' ? best.requestBody : undefined,
    requestEncoding: best.requestEncoding === 'base64' ? 'base64' : undefined,
    responseBody:
      typeof best.responseBody === 'string' ? best.responseBody : undefined,
    responseEncoding:
      best.responseEncoding === 'base64' ? 'base64' : undefined,
    size:
      typeof best.size === 'number' && Number.isFinite(best.size)
        ? best.size
        : undefined,
    resourceType:
      typeof best.resourceType === 'string' ? best.resourceType : undefined,
  };
}

function prettyJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text;
  try {
    const value: unknown = JSON.parse(trimmed);
    if (value === null || typeof value !== 'object') return text;
    return JSON.stringify(value, null, 2);
  } catch {
    return text;
  }
}

function base64Bytes(text: string): number {
  const cleaned = text.replace(/\s/g, '');
  if (!cleaned) return 0;
  const pad = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((cleaned.length * 3) / 4) - pad);
}

export type ExchangeCopy = {
  method: string;
  url: string;
  status: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  requestEncoding?: string;
  responseBody?: string;
  responseEncoding?: string;
};

/** Text of the call, ready to paste. The body stays as it was captured. */
export function requestCopyText(
  exchange: ExchangeCopy,
  binaryNote: (bytes: number) => string,
): string {
  return messageText(
    `${exchange.method} ${exchange.url}`,
    exchange.requestHeaders,
    exchange.requestBody,
    exchange.requestEncoding,
    binaryNote,
  );
}

/** Text of the answer, ready to paste. */
export function responseCopyText(
  exchange: ExchangeCopy,
  binaryNote: (bytes: number) => string,
): string {
  const reason = exchange.statusText?.trim();
  const start =
    reason && exchange.status !== 0
      ? `${exchange.status} ${reason}`
      : reason && exchange.status === 0
        ? reason
        : String(exchange.status);
  return messageText(
    start,
    exchange.responseHeaders,
    exchange.responseBody,
    exchange.responseEncoding,
    binaryNote,
  );
}

/** A curl command for the call. Hop-by-hop headers curl sets itself are left out. */
export function curlCopyText(
  exchange: ExchangeCopy,
  binaryNote: (bytes: number) => string,
): string {
  const lines = [
    `curl ${shellSingle(exchange.url)}`,
    `-X ${shellSingle(exchange.method)}`,
  ];
  for (const [name, value] of Object.entries(exchange.requestHeaders ?? {})) {
    if (skipCurlHeader(name)) continue;
    lines.push(`-H ${shellSingle(`${name}: ${oneLine(value)}`)}`);
  }
  const body = copyBody(exchange.requestBody, exchange.requestEncoding);
  if (body && 'text' in body) lines.push(`--data-raw ${shellSingle(body.text)}`);
  const command = lines
    .map((line, index) => (index < lines.length - 1 ? `${line} \\` : line))
    .join('\n');
  if (body && 'binaryBytes' in body) {
    return `${command}\n# ${binaryNote(body.binaryBytes)}`;
  }
  return command;
}

function messageText(
  start: string,
  headers: Record<string, string> | undefined,
  body: string | undefined,
  encoding: string | undefined,
  binaryNote: (bytes: number) => string,
): string {
  const lines = [start, ...headerLines(headers)];
  const payload = copyBody(body, encoding);
  if (!payload) return lines.join('\n');
  lines.push('');
  lines.push('text' in payload ? payload.text : binaryNote(payload.binaryBytes));
  return lines.join('\n');
}

function headerLines(headers: Record<string, string> | undefined): string[] {
  if (!headers) return [];
  return Object.entries(headers).map(
    ([name, value]) => `${name}: ${oneLine(value)}`,
  );
}

function copyBody(
  body: string | undefined,
  encoding: string | undefined,
): { text: string } | { binaryBytes: number } | null {
  if (!body) return null;
  if (encoding === 'base64') return presentPayload(body, encoding);
  return { text: body };
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

function skipCurlHeader(name: string): boolean {
  const key = name.toLowerCase();
  return key === 'content-length' || key === 'host' || name.startsWith(':');
}

function shellSingle(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringMap(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && item.length > 0) out[key] = item;
  }
  return Object.keys(out).length ? out : undefined;
}
