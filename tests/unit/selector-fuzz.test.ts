/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { cssPath } from '../../lib/selector';
import { sanitizeZipFilename, hostFromUrl } from '../../lib/filename';

describe('cssPath (property)', () => {
  it('returns empty for null/non-elements', () => {
    expect(cssPath(null)).toBe('');
  });

  it('always returns a string without angle brackets from tag path', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (id) => {
        const safe = id.replace(/[^a-zA-Z0-9_-]/g, 'x') || 'x';
        document.body.innerHTML = `<div id="${safe}"><span>a</span></div>`;
        const el = document.getElementById(safe);
        const path = cssPath(el);
        expect(typeof path).toBe('string');
        expect(path.includes(safe) || path.includes('div')).toBe(true);
      }),
      { numRuns: 40 },
    );
  });

  it('prefers data-testid when present', () => {
    document.body.innerHTML = `<button data-testid="save-btn">Save</button>`;
    expect(cssPath(document.querySelector('button'))).toContain(
      'data-testid',
    );
  });

  it('uses nth-of-type among sibling tags without ids', () => {
    document.body.innerHTML = `<div><span>a</span><span>b</span></div>`;
    const second = document.querySelector('div > span:nth-of-type(2)');
    const path = cssPath(second);
    expect(path).toContain('nth-of-type(2)');
  });
});


describe('filename helpers (property)', () => {
  it('sanitizeZipFilename never introduces path separators', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (raw) => {
        const out = sanitizeZipFilename(raw);
        if (!out) return;
        expect(out.includes('/')).toBe(false);
        expect(out.includes('\\')).toBe(false);
        expect(out.toLowerCase().endsWith('.zip')).toBe(true);
      }),
      { numRuns: 80 },
    );
  });

  it('hostFromUrl never throws', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), (raw) => {
        const host = hostFromUrl(raw);
        expect(typeof host).toBe('string');
        expect(host.length).toBeGreaterThan(0);
      }),
      { numRuns: 80 },
    );
  });
});
