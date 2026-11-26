import type { CapturedEvent } from './types';

/** Soft caps so a busy page cannot retain unbounded capture state. */
export const MAX_CAPTURE_EVENTS = 8_000;
/** Aggregate retained network-body characters (request+response text). */
export const MAX_NETWORK_BODY_CHARS = 25 * 1024 * 1024;

export type PushResult = 'ok' | 'full';

/** Holds every event from Record to Stop, up to {@link MAX_CAPTURE_EVENTS}. */
export class CircularBuffer {
  private events: CapturedEvent[] = [];

  get size(): number {
    return this.events.length;
  }

  /** @returns `full` when the next push would exceed the event cap. */
  push(event: CapturedEvent): PushResult {
    if (this.events.length >= MAX_CAPTURE_EVENTS) return 'full';
    this.events.push(event);
    return this.events.length >= MAX_CAPTURE_EVENTS ? 'full' : 'ok';
  }

  snapshot(): CapturedEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

export function networkBodyChars(body: string | undefined): number {
  return typeof body === 'string' ? body.length : 0;
}
