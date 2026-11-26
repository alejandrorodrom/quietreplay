/** Text and call-site labels so console.json can follow the DevTools console. */

const FRAME_RE = /^\s*at\s+(?:.*\s+\()?(.+):(\d+):\d+\)?\s*$/;
const EXTENSION_FRAME_RE = /^(?:chrome-extension|chrome|extensions):\/\//i;

export function networkFailureText(
  method: string,
  url: string,
  status: number,
  statusText?: string,
): string | undefined {
  if (status >= 400) {
    const reason = statusText?.trim();
    return reason
      ? `${method} ${url} ${status} (${reason})`
      : `${method} ${url} ${status}`;
  }
  if (status === 0) {
    const reason = statusText?.trim() || 'failed';
    return `${method} ${url} (${reason})`;
  }
  return undefined;
}

export function rejectionText(reason: unknown): string {
  if (reason instanceof Error) {
    const detail = reason.message
      ? `${reason.name}: ${reason.message}`
      : reason.name;
    return `Uncaught (in promise) ${detail}`;
  }
  return `Uncaught (in promise) ${String(reason)}`;
}

/** `https://host/path/file.js` + line → `file.js:768`, matching the console link. */
export function sourceLabel(
  filename: string | undefined,
  line?: number,
): string | undefined {
  if (!filename) return undefined;
  let name = filename;
  if (/^[a-z][a-z0-9+.-]*:/i.test(filename)) {
    try {
      const url = new URL(filename);
      name = url.pathname.split('/').filter(Boolean).pop() || url.hostname;
    } catch {
      name = filename;
    }
  }
  if (typeof line === 'number' && line > 0) return `${name}:${line}`;
  return name;
}

/** First page frame of an `Error().stack`, skipping extension and browser frames. */
export function sourceFromStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  for (const line of stack.split('\n')) {
    const match = FRAME_RE.exec(line);
    if (!match) continue;
    const file = match[1]!;
    if (EXTENSION_FRAME_RE.test(file)) continue;
    return sourceLabel(file, Number(match[2]));
  }
  return undefined;
}
