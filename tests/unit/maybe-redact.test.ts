import { describe, expect, it } from 'vitest';
import {
  maybeRedactHeaders,
  maybeRedactJsonString,
  maybeRedactText,
  maybeRedactUrl,
} from '../../lib/maybe-redact';

describe('maybeRedact*', () => {
  it('passes text through when obfuscation is off', () => {
    expect(maybeRedactText(false, 'token=secret')).toBe('token=secret');
  });

  it('redacts text when obfuscation is on', () => {
    const out = maybeRedactText(true, 'Authorization: Bearer abc.def.ghi');
    expect(out.toLowerCase()).not.toContain('abc.def.ghi');
  });

  it('passes urls through when off', () => {
    expect(maybeRedactUrl(false, 'https://x.test/?token=abc')).toBe(
      'https://x.test/?token=abc',
    );
  });

  it('redacts urls when on', () => {
    const out = maybeRedactUrl(true, 'https://x.test/?access_token=abc');
    expect(out).not.toContain('access_token=abc');
  });

  it('normalizes header arrays when off', () => {
    expect(
      maybeRedactHeaders(false, [
        ['Content-Type', 'application/json'],
        ['X-Token', 'plain'],
      ]),
    ).toEqual({
      'Content-Type': 'application/json',
      'X-Token': 'plain',
    });
  });

  it('copies plain header objects when off', () => {
    expect(maybeRedactHeaders(false, { A: '1' })).toEqual({ A: '1' });
  });

  it('reads Headers instances when off', () => {
    const h = new Headers({ 'X-A': '1' });
    expect(maybeRedactHeaders(false, h)).toEqual({ 'x-a': '1' });
  });

  it('redacts headers when on', () => {
    const out = maybeRedactHeaders(true, {
      authorization: 'Bearer secret-token-value',
    });
    expect(JSON.stringify(out).toLowerCase()).not.toContain(
      'secret-token-value',
    );
  });

  it('passes json string through when off', () => {
    expect(maybeRedactJsonString(false, '{"password":"x"}')).toBe(
      '{"password":"x"}',
    );
  });

  it('redacts json string when on', () => {
    const out = maybeRedactJsonString(true, '{"password":"hunter2"}');
    expect(out).not.toContain('hunter2');
  });
});
