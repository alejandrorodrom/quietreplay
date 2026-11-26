/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

/** Built-in redaction patterns — applied only when obfuscation is enabled. */

export const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
]);

export const SENSITIVE_HEADER_SUBSTRINGS = [
  'token',
  'secret',
  'session',
  'auth',
  'csrf',
];

export const SENSITIVE_KEY_RE =
  /pass(word)?|pwd|secret|token|api[-_]?key|auth|session|jwt|otp|pin|cvv|card/i;

export const JWT_RE =
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export const BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

export const AWS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/g;

export const PEM_RE =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;

export const USERINFO_URL_RE = /\/\/([^/\s:@]+):([^/\s@]+)@/g;

export const EMAIL_RE =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export const IPV4_RE =
  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;

/** At least four groups, so a clock time (23:12:36) is not an address. */
export const IPV6_RE =
  /\b(?:[A-Fa-f0-9]{1,4}:){3,7}[A-Fa-f0-9]{1,4}\b/g;

/** Phones with a + or a separator. A bare digit string is an id, not a phone. */
export const PHONE_RE =
  /(?<![A-Za-z0-9])(?:\+\d{1,3}[\s.-])?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])\d{3}[\s.-]\d{4}(?![A-Za-z0-9])/g;

export const CARD_CANDIDATE_RE =
  /\b(?:\d[ -]*?){13,19}\b/g;

export const REDACTED = '[REDACTED]';

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function highEntropy(s: string): boolean {
  if (s.length < 32) return false;
  if (!/^[A-Za-z0-9+/=_\-.]+$/.test(s)) return false;
  const unique = new Set(s).size;
  return unique / s.length > 0.45;
}
