import { describe, expect, it } from 'vitest';
import {
  isExtensionNoise,
  scrubExtensionNoise,
  stripExtensionFrames,
} from '../../lib/filter-extension';
import type { CapturedEvent } from '../../lib/types';

const EXT_ID = 'abcdefghijklmnop';

describe('filter-extension', () => {
  it('flags chrome-extension network URLs', () => {
    expect(
      isExtensionNoise(
        {
          kind: 'network',
          t: 1,
          method: 'GET',
          url: `chrome-extension://${EXT_ID}/x.js`,
          status: 200,
          durationMs: 1,
          resourceType: 'fetch',
        },
        EXT_ID,
      ),
    ).toBe(true);
  });

  it('keeps page network URLs', () => {
    expect(
      isExtensionNoise(
        {
          kind: 'network',
          t: 1,
          method: 'GET',
          url: 'https://example.com/api',
          status: 200,
          durationMs: 1,
          resourceType: 'xhr',
        },
        EXT_ID,
      ),
    ).toBe(false);
  });

  it('flags console args that mention the extension', () => {
    expect(
      isExtensionNoise(
        {
          kind: 'console',
          t: 1,
          level: 'log',
          args: [`load chrome-extension://${EXT_ID}/bridge.js`],
        },
        EXT_ID,
      ),
    ).toBe(true);
  });

  it('does not flag normal console logs even if stack mentions extension', () => {
    expect(
      isExtensionNoise(
        {
          kind: 'console',
          t: 1,
          level: 'log',
          args: ['hello'],
          stack: `Error\n    at chrome-extension://${EXT_ID}/recorder-main.js:1:1`,
        },
        EXT_ID,
      ),
    ).toBe(false);
  });

  it('strips extension frames from stacks', () => {
    const cleaned = stripExtensionFrames(
      `Error: boom\n    at app (https://example.com/a.js:1:1)\n    at chrome-extension://${EXT_ID}/recorder-main.js:2:2`,
      EXT_ID,
    );
    expect(cleaned).toContain('example.com');
    expect(cleaned).not.toContain('chrome-extension://');
  });

  it('scrubs extension network from event lists', () => {
    const events: CapturedEvent[] = [
      {
        kind: 'network',
        t: 1,
        method: 'GET',
        url: `chrome-extension://${EXT_ID}/offscreen.html`,
        status: 200,
        durationMs: 1,
        resourceType: 'fetch',
      },
      {
        kind: 'network',
        t: 2,
        method: 'GET',
        url: 'https://example.com/ok',
        status: 200,
        durationMs: 2,
        resourceType: 'xhr',
      },
    ];
    const out = scrubExtensionNoise(events, EXT_ID);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ url: 'https://example.com/ok' });
  });
});
