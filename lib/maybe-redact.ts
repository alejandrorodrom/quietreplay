/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import {
  redactHeaders,
  redactJsonString,
  redactText,
  redactUrl,
  type CustomRedactionRule,
} from './redact';

/** Identity / redact helpers gated by obfuscation setting. */
export function maybeRedactText(
  enabled: boolean,
  input: string,
  custom: CustomRedactionRule[] = [],
): string {
  return enabled ? redactText(input, custom) : input;
}

export function maybeRedactUrl(
  enabled: boolean,
  url: string,
  custom: CustomRedactionRule[] = [],
): string {
  return enabled ? redactUrl(url, custom) : url;
}

export function maybeRedactHeaders(
  enabled: boolean,
  headers: Record<string, string> | Headers | [string, string][],
  custom: CustomRedactionRule[] = [],
): Record<string, string> {
  if (enabled) return redactHeaders(headers, custom);
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([k, v]) => [k, String(v)]));
  }
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  return { ...headers };
}

export function maybeRedactJsonString(
  enabled: boolean,
  raw: string,
  custom: CustomRedactionRule[] = [],
): string {
  return enabled ? redactJsonString(raw, custom) : raw;
}
