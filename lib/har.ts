import type { CapturedEvent } from './types';

type NetworkEvent = Extract<CapturedEvent, { kind: 'network' }>;

function headerValue(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const want = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === want && value) return value;
  }
  return undefined;
}

/** Media type actually sent. Only unknown bodies fall back to octet-stream. */
function contentType(headers: Record<string, string>): string {
  const raw = headerValue(headers, 'content-type');
  return raw?.trim() || 'application/octet-stream';
}

function queryFromUrl(url: string): { name: string; value: string }[] {
  try {
    const u = new URL(url, 'https://example.invalid');
    return [...u.searchParams.entries()].map(([name, value]) => ({
      name,
      value,
    }));
  } catch {
    return [];
  }
}

function requestCookies(
  cookieHeader: string | undefined,
): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  const cookies: { name: string; value: string }[] = [];
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    if (!name) continue;
    cookies.push({ name, value: part.slice(i + 1).trim() });
  }
  return cookies;
}

function responseCookies(setCookie: string | undefined): {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}[] {
  if (!setCookie) return [];
  const cookies = [];
  for (const line of setCookie.split('\n')) {
    if (!line.trim()) continue;
    const [pair, ...attrs] = line.split(';');
    if (!pair) continue;
    const i = pair.indexOf('=');
    if (i <= 0) continue;
    const name = pair.slice(0, i).trim();
    if (!name) continue;
    const cookie: {
      name: string;
      value: string;
      path?: string;
      domain?: string;
      expires?: string;
      httpOnly?: boolean;
      secure?: boolean;
    } = { name, value: pair.slice(i + 1).trim() };
    for (const attr of attrs) {
      const eq = attr.indexOf('=');
      const key = (eq === -1 ? attr : attr.slice(0, eq)).trim().toLowerCase();
      const val = eq === -1 ? '' : attr.slice(eq + 1).trim();
      if (key === 'path' && val) cookie.path = val;
      else if (key === 'domain' && val) cookie.domain = val;
      else if (key === 'expires' && val) cookie.expires = val;
      else if (key === 'httponly') cookie.httpOnly = true;
      else if (key === 'secure') cookie.secure = true;
    }
    cookies.push(cookie);
  }
  return cookies;
}

function base64Bytes(text: string): number {
  const cleaned = text.replace(/\s/g, '');
  if (!cleaned) return 0;
  const pad = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - pad;
}

export function buildHar(events: CapturedEvent[]): object {
  const entries = events
    .filter((e): e is NetworkEvent => e.kind === 'network')
    .map((e) => {
      const started = new Date(e.t).toISOString();
      const reqHeaders = e.requestHeaders ?? {};
      const resHeaders = e.responseHeaders ?? {};
      const requestMime = contentType(reqHeaders);
      const responseMime = contentType(resHeaders);
      const responseBytes =
        e.size ??
        (e.responseBody
          ? e.responseEncoding === 'base64'
            ? base64Bytes(e.responseBody)
            : e.responseBody.length
          : undefined);
      return {
        startedDateTime: started,
        time: e.durationMs,
        request: {
          method: e.method,
          url: e.url,
          httpVersion: 'HTTP/1.1',
          cookies: requestCookies(headerValue(reqHeaders, 'cookie')),
          headers: Object.entries(reqHeaders).map(([name, value]) => ({
            name,
            value,
          })),
          queryString: queryFromUrl(e.url),
          headersSize: -1,
          bodySize:
            e.requestEncoding === 'base64' && e.requestBody
              ? base64Bytes(e.requestBody)
              : (e.requestBody?.length ?? -1),
          postData: e.requestBody
            ? {
                mimeType: requestMime,
                text: e.requestBody,
                ...(e.requestEncoding === 'base64'
                  ? { encoding: 'base64' as const }
                  : {}),
              }
            : undefined,
        },
        response: {
          status: e.status,
          statusText: e.statusText ?? '',
          httpVersion: 'HTTP/1.1',
          cookies: responseCookies(headerValue(resHeaders, 'set-cookie')),
          headers: Object.entries(resHeaders).map(([name, value]) => ({
            name,
            value,
          })),
          content: {
            size: responseBytes ?? 0,
            mimeType: responseMime,
            text: e.responseBody,
            ...(e.responseEncoding === 'base64'
              ? { encoding: 'base64' as const }
              : {}),
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: responseBytes ?? -1,
        },
        cache: {},
        timings: {
          send: 0,
          wait: e.durationMs,
          receive: 0,
        },
        _resourceType: e.resourceType,
      };
    });

  return {
    log: {
      version: '1.2',
      creator: { name: 'QuietReplay', version: '1.0.0' },
      entries,
    },
  };
}
