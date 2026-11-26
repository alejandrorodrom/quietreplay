import { describe, expect, it } from 'vitest';
import {
  CircularBuffer,
  MAX_CAPTURE_EVENTS,
  networkBodyChars,
} from '../../lib/buffer';

describe('CircularBuffer', () => {
  it('keeps the full session, not only recent events', () => {
    const buf = new CircularBuffer();
    const now = Date.now();
    buf.push({
      kind: 'console',
      t: now - 5000,
      level: 'log',
      args: ['old'],
    });
    buf.push({
      kind: 'console',
      t: now,
      level: 'log',
      args: ['new'],
    });
    const snap = buf.snapshot();
    expect(snap).toHaveLength(2);
    expect(snap[0]).toMatchObject({ args: ['old'] });
    expect(snap[1]).toMatchObject({ args: ['new'] });
  });

  it('keeps every screenshot within the event cap', () => {
    const buf = new CircularBuffer();
    const now = Date.now();
    for (let i = 0; i < 25; i++) {
      expect(
        buf.push({
          kind: 'screenshot',
          t: now + i,
          id: `s${i}`,
          mime: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,QQ==',
        }),
      ).toBe('ok');
    }
    const shots = buf.snapshot().filter((e) => e.kind === 'screenshot');
    expect(shots).toHaveLength(25);
  });

  it('returns full when the event cap is reached', () => {
    const buf = new CircularBuffer();
    const now = Date.now();
    let last: 'ok' | 'full' = 'ok';
    for (let i = 0; i < MAX_CAPTURE_EVENTS; i++) {
      last = buf.push({
        kind: 'console',
        t: now + i,
        level: 'log',
        args: [String(i)],
      });
    }
    expect(last).toBe('full');
    expect(buf.size).toBe(MAX_CAPTURE_EVENTS);
    expect(
      buf.push({
        kind: 'console',
        t: now + MAX_CAPTURE_EVENTS,
        level: 'log',
        args: ['overflow'],
      }),
    ).toBe('full');
    expect(buf.size).toBe(MAX_CAPTURE_EVENTS);
  });

  it('clears retained events', () => {
    const buf = new CircularBuffer();
    buf.push({ kind: 'console', t: 1, level: 'log', args: ['x'] });
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.snapshot()).toEqual([]);
  });

  it('counts network body characters', () => {
    expect(networkBodyChars(undefined)).toBe(0);
    expect(networkBodyChars('abcd')).toBe(4);
  });
});

