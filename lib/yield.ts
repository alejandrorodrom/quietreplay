/** Yield to the event loop so long redact/zip work does not freeze the SW/UI. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } })
      .scheduler;
    if (s?.yield) {
      void s.yield().then(resolve);
      return;
    }
    setTimeout(resolve, 0);
  });
}

export async function mapInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T, index: number) => R,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i++) {
    out.push(fn(items[i]!, i));
    if ((i + 1) % chunkSize === 0) await yieldToMain();
  }
  return out;
}
