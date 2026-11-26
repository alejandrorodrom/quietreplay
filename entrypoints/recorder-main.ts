/**
 * Injected into page MAIN world. Patches console, errors, fetch, XHR, history.
 * Talks to ISOLATED bridge via CustomEvent + token (never postMessage *).
 */
import { arrayBufferToBase64 } from '../lib/binary';
import {
  networkFailureText,
  rejectionText,
  sourceFromStack,
  sourceLabel,
} from '../lib/console-line';

export default defineUnlistedScript(() => {
  const w = window as Window & {
    __quietreplay_main?: boolean;
    __quietreplay_stop_main?: () => void;
    __quietreplay_cfg?: {
      eventName: string;
      token: string;
      captureBodies: boolean;
    };
  };
  w.__quietreplay_stop_main?.();
  if (w.__quietreplay_main) return;

  const cfg = w.__quietreplay_cfg;
  if (!cfg?.eventName || !cfg?.token) return;

  let stopped = false;
  const abort = new AbortController();

  const emit = (payload: Record<string, unknown>) => {
    if (stopped) return;
    document.dispatchEvent(
      new CustomEvent(cfg.eventName, {
        detail: { token: cfg.token, ...payload },
      }),
    );
  };

  const serializeArg = (arg: unknown): string => {
    try {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  };

  const absoluteUrl = (url: string) => {
    try {
      return new URL(url, location.href).href;
    } catch {
      return url;
    }
  };

  const emitConsole = (
    level: string,
    args: string[],
    stack: string | undefined,
    source?: string,
  ) => {
    emit({
      kind: 'console',
      t: Date.now(),
      level,
      args,
      source: source ?? sourceFromStack(stack),
      stack,
    });
  };

  /** Chrome prints failed HTTP on the console even though the page never called console. */
  const emitNetworkFailure = (
    method: string,
    url: string,
    status: number,
    statusText: string | undefined,
    stack: string | undefined,
  ) => {
    if (/^chrome-extension:\/\//i.test(url)) return;
    const text = networkFailureText(method, absoluteUrl(url), status, statusText);
    if (!text) return;
    emitConsole('error', [text], stack);
  };

  const consoleLevels = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  for (const level of consoleLevels) {
    const orig = originalConsole[level];
    console[level] = (...args: unknown[]) => {
      if (!stopped) {
        const stack = new Error().stack;
        emitConsole(level, args.map(serializeArg), stack);
      }
      return orig.apply(console, args as never);
    };
  }

  window.addEventListener(
    'error',
    (ev) => {
      const stack = (ev.error as Error | undefined)?.stack;
      emit({
        kind: 'error',
        t: Date.now(),
        message: ev.message || String(ev.error),
        stack,
        source: sourceLabel(ev.filename, ev.lineno) ?? sourceFromStack(stack),
      });
    },
    { signal: abort.signal },
  );

  window.addEventListener(
    'unhandledrejection',
    (ev) => {
      const reason = ev.reason;
      const stack = reason instanceof Error ? reason.stack : undefined;
      emit({
        kind: 'error',
        t: Date.now(),
        message: rejectionText(reason),
        stack,
        source: sourceFromStack(stack),
      });
    },
    { signal: abort.signal },
  );

  const headersToObject = (h: HeadersInit | undefined): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!h) return out;
    if (h instanceof Headers) {
      h.forEach((v, k) => {
        out[k] = v;
      });
      return out;
    }
    if (Array.isArray(h)) {
      for (const [k, v] of h) out[k] = v;
      return out;
    }
    return { ...h };
  };

  const isEventStream = (ct: string | null) =>
    !!ct && ct.toLowerCase().includes('text/event-stream');

  const isTextualMime = (ct: string | null) => {
    if (!ct) return true;
    const mime = ct.toLowerCase().split(';')[0]!.trim();
    if (!mime) return true;
    if (mime.startsWith('text/')) return true;
    return (
      mime.includes('json') ||
      mime.includes('xml') ||
      mime.includes('javascript') ||
      mime.includes('ecmascript') ||
      mime.includes('svg') ||
      mime === 'application/x-www-form-urlencoded' ||
      mime === 'application/graphql'
    );
  };

  const hasContentType = (headers: Record<string, string>) =>
    Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');

  const headerContentType = (headers: Record<string, string>) => {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === 'content-type') return v;
    }
    return null;
  };

  const looksTextual = (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf, 0, Math.min(buf.byteLength, 512));
    for (const b of bytes) if (b === 0) return false;
    return true;
  };

  const payloadFromBuffer = (buf: ArrayBuffer, ct: string | null) => {
    if (!buf.byteLength) return {};
    const textual = ct ? isTextualMime(ct) : looksTextual(buf);
    if (textual) {
      return {
        text: new TextDecoder().decode(buf),
        size: buf.byteLength,
      };
    }
    return {
      text: arrayBufferToBase64(buf),
      encoding: 'base64' as const,
      size: buf.byteLength,
    };
  };

  const readBodyValue = async (
    body: BodyInit,
    reqHeaders: Record<string, string>,
  ): Promise<{ text?: string; encoding?: 'base64' }> => {
    if (typeof body === 'string') return { text: body };
    if (
      typeof ReadableStream !== 'undefined' &&
      body instanceof ReadableStream
    ) {
      return {};
    }
    if (body instanceof URLSearchParams) {
      if (!hasContentType(reqHeaders)) {
        reqHeaders['content-type'] =
          'application/x-www-form-urlencoded;charset=UTF-8';
      }
      return { text: body.toString() };
    }
    if (typeof FormData !== 'undefined' && body instanceof FormData) return {};
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      if (!hasContentType(reqHeaders) && body.type) {
        reqHeaders['content-type'] = body.type;
      }
      const payload = payloadFromBuffer(
        await body.arrayBuffer(),
        headerContentType(reqHeaders) || body.type || null,
      );
      return { text: payload.text, encoding: payload.encoding };
    }
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      const bytes =
        body instanceof ArrayBuffer
          ? new Uint8Array(body)
          : new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      const copy = new Uint8Array(bytes);
      const payload = payloadFromBuffer(
        copy.buffer,
        headerContentType(reqHeaders),
      );
      return { text: payload.text, encoding: payload.encoding };
    }
    return {};
  };

  const captureRequestBody = (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    reqHeaders: Record<string, string>,
  ): Promise<{ text?: string; encoding?: 'base64' }> => {
    if (!cfg.captureBodies) return Promise.resolve({});
    try {
      if (init && 'body' in init) {
        if (init.body == null) return Promise.resolve({});
        return readBodyValue(init.body, reqHeaders);
      }
      if (input instanceof Request) {
        const clone = input.clone();
        return clone
          .arrayBuffer()
          .then((buf) => {
            const payload = payloadFromBuffer(
              buf,
              input.headers.get('content-type'),
            );
            return { text: payload.text, encoding: payload.encoding };
          })
          .catch(() => ({}));
      }
    } catch {
      return Promise.resolve({});
    }
    return Promise.resolve({});
  };

  const readResponseBuffer = async (
    buf: ArrayBuffer,
    ct: string | null,
  ): Promise<{
    responseBody?: string;
    responseEncoding?: 'base64';
    size?: number;
  }> => {
    const payload = payloadFromBuffer(buf, ct);
    if (!payload.text) return {};
    return {
      responseBody: payload.text,
      responseEncoding: payload.encoding,
      size: payload.size,
    };
  };

  const origFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = Date.now();
    const callStack = new Error().stack;
    const method =
      init?.method ||
      (input instanceof Request ? input.method : 'GET') ||
      'GET';
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const reqHeaders = headersToObject(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );
    const bodyPromise = captureRequestBody(input, init, reqHeaders);
    try {
      const res = await origFetch.call(window, input, init);
      const captured = await bodyPromise;
      const durationMs = Date.now() - started;
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });
      if (typeof res.headers.getSetCookie === 'function') {
        const setCookies = res.headers.getSetCookie();
        if (setCookies.length) {
          responseHeaders['set-cookie'] = setCookies.join('\n');
        }
      }
      const ct = res.headers.get('content-type');
      const len = res.headers.get('content-length');
      emit({
        kind: 'network',
        t: started,
        method,
        url,
        status: res.status,
        statusText: res.statusText || '',
        durationMs,
        requestHeaders: reqHeaders,
        responseHeaders,
        requestBody: captured.text,
        requestEncoding: captured.encoding,
        size: len ? Number(len) : undefined,
        resourceType: 'fetch',
      });
      if (res.status >= 400) {
        emitNetworkFailure(method, url, res.status, res.statusText, callStack);
      }
      if (!stopped && cfg.captureBodies && !isEventStream(ct)) {
        void res
          .clone()
          .arrayBuffer()
          .then((buf) => readResponseBuffer(buf, ct))
          .then((body) => {
            if (!body.responseBody) return;
            emit({
              kind: 'network-body',
              t: started,
              url,
              method,
              responseBody: body.responseBody,
              responseEncoding: body.responseEncoding,
              size: body.size,
            });
          })
          .catch(() => undefined);
      }
      return res;
    } catch (err) {
      const captured = await bodyPromise;
      emit({
        kind: 'network',
        t: started,
        method,
        url,
        status: 0,
        statusText: '',
        durationMs: Date.now() - started,
        requestHeaders: reqHeaders,
        requestBody: captured.text,
        requestEncoding: captured.encoding,
        resourceType: 'fetch',
      });
      emitNetworkFailure(
        method,
        url,
        0,
        err instanceof Error ? err.message : 'failed',
        callStack,
      );
      throw err;
    }
  };

  const XO = XMLHttpRequest;
  const open = XO.prototype.open;
  const send = XO.prototype.send;
  const setRequestHeader = XO.prototype.setRequestHeader;

  XO.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    (this as XMLHttpRequest & { __qr?: Record<string, unknown> }).__qr = {
      method,
      url: String(url),
      headers: {} as Record<string, string>,
      started: 0,
    };
    return open.apply(this, [method, url, ...rest] as never);
  };

  XO.prototype.setRequestHeader = function (name: string, value: string) {
    const qr = (this as XMLHttpRequest & { __qr?: { headers: Record<string, string> } })
      .__qr;
    if (qr) qr.headers[name] = value;
    return setRequestHeader.call(this, name, value);
  };

  XO.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this as XMLHttpRequest & {
      __qr?: {
        method: string;
        url: string;
        headers: Record<string, string>;
        started: number;
        requestBody?: string;
      };
    };
    if (xhr.__qr) {
      xhr.__qr.started = Date.now();
      const callStack = new Error().stack;
      let aborted = false;
      xhr.addEventListener('abort', () => {
        aborted = true;
      });
      const reqHeaders = xhr.__qr.headers;
      const emptyBody: { text?: string; encoding?: 'base64' } = {};
      const bodyPromise: Promise<{ text?: string; encoding?: 'base64' }> =
        cfg.captureBodies && body != null && !(body instanceof Document)
          ? readBodyValue(body, reqHeaders)
          : Promise.resolve(emptyBody);
      xhr.addEventListener('loadend', () => {
        void (async () => {
          if (stopped) return;
          const started = xhr.__qr!.started;
          const ct = xhr.getResponseHeader('content-type');
          const len = xhr.getResponseHeader('content-length');
          const responseHeaders: Record<string, string> = {};
          const raw = xhr.getAllResponseHeaders();
          raw.split(/\r?\n/).forEach((line) => {
            const i = line.indexOf(':');
            if (i <= 0) return;
            const name = line.slice(0, i).trim();
            const value = line.slice(i + 1).trim();
            if (name.toLowerCase() === 'set-cookie' && responseHeaders[name]) {
              responseHeaders[name] = `${responseHeaders[name]}\n${value}`;
            } else {
              responseHeaders[name] = value;
            }
          });
          const captured = await bodyPromise;
          let responseBody: string | undefined;
          let responseEncoding: 'base64' | undefined;
          let byteSize: number | undefined;
          if (cfg.captureBodies && !isEventStream(ct)) {
            try {
              const rt = xhr.responseType;
              if (rt === '' || rt === 'text') {
                responseBody = xhr.responseText;
              } else if (rt === 'json' && xhr.response != null) {
                responseBody = JSON.stringify(xhr.response);
              } else if (
                rt === 'arraybuffer' &&
                xhr.response instanceof ArrayBuffer
              ) {
                const payload = await readResponseBuffer(xhr.response, ct);
                responseBody = payload.responseBody;
                responseEncoding = payload.responseEncoding;
                byteSize = payload.size;
              } else if (rt === 'blob' && xhr.response instanceof Blob) {
                const payload = await readResponseBuffer(
                  await xhr.response.arrayBuffer(),
                  ct || xhr.response.type || null,
                );
                responseBody = payload.responseBody;
                responseEncoding = payload.responseEncoding;
                byteSize = payload.size;
              }
            } catch {
              responseBody = undefined;
            }
          }
          emit({
            kind: 'network',
            t: started,
            method: xhr.__qr!.method,
            url: xhr.__qr!.url,
            status: xhr.status,
            statusText: xhr.statusText || '',
            durationMs: Date.now() - started,
            requestHeaders: reqHeaders,
            responseHeaders,
            requestBody: captured.text,
            requestEncoding: captured.encoding,
            size: len ? Number(len) : byteSize,
            responseBody,
            responseEncoding,
            resourceType: 'xhr',
          });
          if (!aborted) {
            emitNetworkFailure(
              xhr.__qr!.method,
              xhr.__qr!.url,
              xhr.status,
              xhr.statusText,
              callStack,
            );
          }
        })();
      });
    }
    return send.call(this, body);
  };

  const origPushState = history.pushState;
  const origReplaceState = history.replaceState;
  const nav = () =>
    emit({
      kind: 'navigation',
      t: Date.now(),
      url: location.href,
      title: document.title,
    });
  history.pushState = (...args: Parameters<History['pushState']>) => {
    const r = origPushState.apply(history, args);
    nav();
    return r;
  };
  history.replaceState = (...args: Parameters<History['replaceState']>) => {
    const r = origReplaceState.apply(history, args);
    nav();
    return r;
  };
  window.addEventListener('popstate', nav, { signal: abort.signal });

  w.__quietreplay_stop_main = () => {
    if (stopped) return;
    stopped = true;
    abort.abort();
    for (const level of consoleLevels) {
      console[level] = originalConsole[level];
    }
    window.fetch = origFetch;
    XO.prototype.open = open;
    XO.prototype.send = send;
    XO.prototype.setRequestHeader = setRequestHeader;
    history.pushState = origPushState;
    history.replaceState = origReplaceState;
    w.__quietreplay_main = false;
    delete w.__quietreplay_stop_main;
  };
  w.__quietreplay_main = true;

  emit({
    kind: 'env',
    t: Date.now(),
    userAgent: navigator.userAgent,
    viewport: [window.innerWidth, window.innerHeight],
    dpr: window.devicePixelRatio || 1,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    url: location.href,
    title: document.title,
  });
});
