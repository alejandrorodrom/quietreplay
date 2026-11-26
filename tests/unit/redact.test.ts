import { describe, expect, it } from 'vitest';
import {
  isSensitiveHeaderName,
  redactHeaders,
  redactJsonString,
  redactText,
  redactUrl,
} from '../../lib/redact';
import { luhnValid } from '../../lib/patterns';

describe('redactText', () => {
  it('redacts JWT', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signaturepartgoeshere123456';
    expect(redactText(`token=${jwt}`)).toContain('[REDACTED]');
  });

  it('redacts Bearer', () => {
    expect(redactText('Authorization: Bearer abc.def.ghi')).toContain(
      '[REDACTED]',
    );
  });

  it('redacts AWS key', () => {
    expect(redactText('AKIAIOSFODNN7EXAMPLE')).toContain('[REDACTED]');
  });

  it('redacts email', () => {
    expect(redactText('mail me@example.com please')).toContain('[REDACTED]');
  });

  it('redacts userinfo in URL', () => {
    expect(redactText('https://user:secret@host/x')).toContain('[REDACTED]');
  });

  it('does not redact short normal words', () => {
    expect(redactText('hello world')).toBe('hello world');
  });

  it('applies custom rules', () => {
    expect(redactText('foo-SECRET-bar', [{ pattern: 'SECRET' }])).toContain(
      '[REDACTED]',
    );
  });
});

describe('headers and keys', () => {
  it('flags sensitive headers', () => {
    expect(isSensitiveHeaderName('Authorization')).toBe(true);
    expect(isSensitiveHeaderName('X-Auth-Token')).toBe(true);
    expect(isSensitiveHeaderName('Content-Type')).toBe(false);
  });

  it('redacts header values', () => {
    const h = redactHeaders({ Authorization: 'Bearer x', Accept: 'text/plain' });
    expect(h.Authorization).toBe('[REDACTED]');
    expect(h.Accept).toBe('text/plain');
  });

  it('redacts JSON sensitive keys', () => {
    const out = redactJsonString(
      JSON.stringify({ password: 'hunter2', name: 'Ada' }),
    );
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('Ada');
  });

  it('redacts URL query secrets', () => {
    const url = redactUrl('https://x.test/api?token=abc&q=1');
    expect(url).toContain('x.test');
    expect(url).toContain('[REDACTED]');
    expect(url).toContain('q=1');
  });

  it('keeps hosts, paths, dates and request ids', () => {
    expect(
      redactUrl('https://www.google-analytics.com/g/collect?k=abc'),
    ).toBe('https://www.google-analytics.com/g/collect?k=abc');
    expect(redactText('Wed, 25 Nov 2026 23:12:36 GMT')).toBe(
      'Wed, 25 Nov 2026 23:12:36 GMT',
    );
    expect(redactText('1795643581655-jis.1_b0d77bae')).toBe(
      '1795643581655-jis.1_b0d77bae',
    );
    const headers = redactHeaders({
      date: 'Wed, 25 Nov 2026 23:12:36 GMT',
      'x-request-id': 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    });
    expect(headers.date).toBe('Wed, 25 Nov 2026 23:12:36 GMT');
    expect(headers['x-request-id']).toBe('a1b2c3d4e5f60718293a4b5c6d7e8f90');
  });
});

describe('luhn', () => {
  it('accepts valid card numbers', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
  });

  it('rejects invalid card numbers', () => {
    expect(luhnValid('4111111111111112')).toBe(false);
  });

  it('redacts valid cards in text', () => {
    expect(redactText('pay 4111111111111111 now')).toContain('[REDACTED]');
  });
});
