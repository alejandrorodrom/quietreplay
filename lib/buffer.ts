import type { CapturedEvent } from './types';

/** Holds every event from Record to Stop. */
export class CircularBuffer {
  private events: CapturedEvent[] = [];

  push(event: CapturedEvent): void {
    this.events.push(event);
  }

  snapshot(): CapturedEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
