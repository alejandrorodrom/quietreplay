import { describe, expect, it } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToBlob,
  base64ToUint8Array,
} from '../../lib/binary';

describe('binary messaging helpers', () => {
  it('round-trips bytes through base64', () => {
    const src = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 255, 128]);
    const b64 = arrayBufferToBase64(src.buffer);
    expect(b64).not.toContain('object');
    const back = base64ToUint8Array(b64);
    expect([...back]).toEqual([...src]);
  });

  it('builds a Blob that is not "[object Object]"', async () => {
    const src = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = base64ToBlob(arrayBufferToBase64(src.buffer), 'video/webm');
    expect(blob.size).toBe(5);
    const text = await blob.text();
    expect(text).not.toBe('[object Object]');
    const buf = new Uint8Array(await blob.arrayBuffer());
    expect([...buf]).toEqual([1, 2, 3, 4, 5]);
  });

  it('documents the broken Blob/Object path', async () => {
    // chrome.runtime JSON-serializes ArrayBuffer → {}
    const broken = new Blob([{} as unknown as BlobPart], { type: 'video/webm' });
    expect(await broken.text()).toBe('[object Object]');
  });
});
