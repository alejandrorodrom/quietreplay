import { describe, expect, it } from 'vitest';
import {
  defaultZipFilename,
  hostFromUrl,
  sanitizeZipFilename,
} from '../../lib/filename';

describe('filename helpers', () => {
  it('sanitizes unsafe characters and adds .zip', () => {
    expect(sanitizeZipFilename('bug: login / fail')).toBe(
      'bug-login-fail.zip',
    );
  });

  it('keeps existing .zip suffix', () => {
    expect(sanitizeZipFilename('report.ZIP')).toBe('report.ZIP');
  });

  it('returns empty for blank input', () => {
    expect(sanitizeZipFilename('   ')).toBe('');
  });

  it('builds a default name with host', () => {
    expect(defaultZipFilename('example.com')).toMatch(
      /^quietreplay-\d{8}-\d{6}-example\.com\.zip$/,
    );
  });

  it('parses host from url', () => {
    expect(hostFromUrl('https://app.example.com/x')).toBe('app.example.com');
  });
});
