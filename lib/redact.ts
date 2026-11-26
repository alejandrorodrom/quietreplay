import {
  AWS_KEY_RE,
  BEARER_RE,
  CARD_CANDIDATE_RE,
  EMAIL_RE,
  highEntropy,
  IPV4_RE,
  IPV6_RE,
  JWT_RE,
  luhnValid,
  PEM_RE,
  PHONE_RE,
  REDACTED,
  SENSITIVE_HEADER_NAMES,
  SENSITIVE_HEADER_SUBSTRINGS,
  SENSITIVE_KEY_RE,
  USERINFO_URL_RE,
} from './patterns';

export type CustomRedactionRule = { pattern: string; flags?: string };

function applyCustom(text: string, rules: CustomRedactionRule[]): string {
  let out = text;
  for (const rule of rules) {
    try {
      const re = new RegExp(rule.pattern, rule.flags ?? 'gi');
      out = out.replace(re, REDACTED);
    } catch {
      // ignore invalid user regex
    }
  }
  return out;
}

function redactCards(text: string): string {
  return text.replace(CARD_CANDIDATE_RE, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return m;
    // 13-digit timestamps are common ids. A continuous card is 16 digits.
    if (!/[\s-]/.test(m) && digits.length < 16) return m;
    return luhnValid(digits) ? REDACTED : m;
  });
}

function redactHighEntropyTokens(text: string): string {
  // Dots and slashes stay out of the token so a URL is not one secret.
  // 40+ skips request ids and UUIDs, which are not passwords.
  return text.replace(/\b[A-Za-z0-9+_=]{40,}\b/g, (m) =>
    highEntropy(m) ? REDACTED : m,
  );
}

/** Redact free-form text (URLs, bodies, console args, etc.). */
export function redactText(
  input: string,
  customRules: CustomRedactionRule[] = [],
): string {
  if (!input) return input;
  let t = input;
  t = t.replace(PEM_RE, REDACTED);
  t = t.replace(JWT_RE, REDACTED);
  t = t.replace(BEARER_RE, `Bearer ${REDACTED}`);
  t = t.replace(AWS_KEY_RE, REDACTED);
  t = t.replace(USERINFO_URL_RE, `//$1:${REDACTED}@`);
  t = t.replace(EMAIL_RE, REDACTED);
  t = redactCards(t);
  t = t.replace(PHONE_RE, REDACTED);
  t = t.replace(IPV4_RE, REDACTED);
  t = t.replace(IPV6_RE, REDACTED);
  t = redactHighEntropyTokens(t);
  t = applyCustom(t, customRules);
  return t;
}

export function isSensitiveHeaderName(name: string): boolean {
  const lower = name.toLowerCase();
  if (SENSITIVE_HEADER_NAMES.has(lower)) return true;
  return SENSITIVE_HEADER_SUBSTRINGS.some((s) => lower.includes(s));
}

export function redactHeaders(
  headers: Record<string, string> | Headers | [string, string][],
  customRules: CustomRedactionRule[] = [],
): Record<string, string> {
  const entries: [string, string][] = Array.isArray(headers)
    ? headers
    : headers instanceof Headers
      ? [...headers.entries()]
      : Object.entries(headers);

  const out: Record<string, string> = {};
  for (const [k, v] of entries) {
    out[k] = isSensitiveHeaderName(k)
      ? REDACTED
      : redactText(String(v), customRules);
  }
  return out;
}

function redactValue(key: string, value: unknown, custom: CustomRedactionRule[]): unknown {
  if (SENSITIVE_KEY_RE.test(key)) return REDACTED;
  if (typeof value === 'string') return redactText(value, custom);
  if (Array.isArray(value))
    return value.map((v, i) => redactValue(String(i), v, custom));
  if (value && typeof value === 'object')
    return redactJsonObject(value as Record<string, unknown>, custom);
  return value;
}

export function redactJsonObject(
  obj: Record<string, unknown>,
  customRules: CustomRedactionRule[] = [],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = redactValue(k, v, customRules);
  }
  return out;
}

export function redactJsonString(
  raw: string,
  customRules: CustomRedactionRule[] = [],
): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return JSON.stringify(
        redactJsonObject(parsed as Record<string, unknown>, customRules),
      );
    }
    if (Array.isArray(parsed)) {
      return JSON.stringify(
        parsed.map((v, i) => redactValue(String(i), v, customRules)),
      );
    }
  } catch {
    // fall through
  }
  return redactText(raw, customRules);
}

export function redactUrl(
  url: string,
  customRules: CustomRedactionRule[] = [],
): string {
  try {
    const u = new URL(url, 'https://example.invalid');
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_KEY_RE.test(key)) {
        u.searchParams.set(key, REDACTED);
      } else {
        u.searchParams.set(
          key,
          redactText(u.searchParams.get(key) ?? '', customRules),
        );
      }
    }
    let out = u.href;
    if (url.startsWith('/') || !/^https?:/i.test(url)) {
      out = u.pathname + u.search + u.hash;
    }
    // The host and path stay. Only userinfo and query values are secrets.
    return out.replace(/%5BREDACTED%5D/gi, REDACTED);
  } catch {
    return redactText(url, customRules);
  }
}
