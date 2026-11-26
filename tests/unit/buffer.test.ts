import { describe, expect, it } from 'vitest';
import { CircularBuffer } from '../../lib/buffer';

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

  it('keeps every screenshot', () => {
    const buf = new CircularBuffer();
    const now = Date.now();
    for (let i = 0; i < 25; i++) {
      buf.push({
        kind: 'screenshot',
        t: now + i,
        id: `s${i}`,
        mime: 'image/jpeg',
        dataUrl: 'data:image/jpeg;base64,QQ==',
      });
    }
    const shots = buf.snapshot().filter((e) => e.kind === 'screenshot');
    expect(shots).toHaveLength(25);
  });
});
