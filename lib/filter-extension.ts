/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import type { CapturedEvent } from './types';

const EXT_URL_RE = /^chrome-extension:\/\//i;

export function isExtensionUrl(url: string, extensionId?: string): boolean {
  if (!url) return false;
  if (EXT_URL_RE.test(url)) return true;
  if (extensionId && url.includes(`chrome-extension://${extensionId}`))
    return true;
  return false;
}

function textMentionsExtension(text: string, extensionId?: string): boolean {
  if (!text) return false;
  if (/chrome-extension:\/\//i.test(text)) return true;
  if (extensionId && text.includes(extensionId)) return true;
  return false;
}

/** Drop QuietReplay / other extension traffic from capture results. */
export function isExtensionNoise(
  event: CapturedEvent | (Record<string, unknown> & { kind?: string }),
  extensionId?: string,
): boolean {
  const kind = event.kind;
  if (kind === 'network' || kind === 'network-body') {
    return isExtensionUrl(String(event.url ?? ''), extensionId);
  }
  if (kind === 'console') {
    const args = Array.isArray(event.args)
      ? event.args.map(String)
      : [];
    return args.some((a) => textMentionsExtension(a, extensionId));
  }
  if (kind === 'error') {
    return (
      textMentionsExtension(String(event.message ?? ''), extensionId) ||
      textMentionsExtension(String(event.source ?? ''), extensionId)
    );
  }
  return false;
}

/** Strip chrome-extension frames from stacks so page frames remain. */
export function stripExtensionFrames(
  stack: string | undefined,
  extensionId?: string,
): string | undefined {
  if (!stack) return stack;
  const lines = stack.split('\n').filter((line) => {
    if (/chrome-extension:\/\//i.test(line)) return false;
    if (extensionId && line.includes(extensionId)) return false;
    return true;
  });
  const out = lines.join('\n').trim();
  return out || undefined;
}

export function scrubExtensionNoise(
  events: CapturedEvent[],
  extensionId?: string,
): CapturedEvent[] {
  return events
    .filter((e) => !isExtensionNoise(e, extensionId))
    .map((e) => {
      if (e.kind === 'console' && e.stack) {
        return {
          ...e,
          stack: stripExtensionFrames(e.stack, extensionId),
        };
      }
      if (e.kind === 'error' && e.stack) {
        return {
          ...e,
          stack: stripExtensionFrames(e.stack, extensionId),
        };
      }
      return e;
    });
}
