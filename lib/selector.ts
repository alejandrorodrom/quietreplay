/** Stable-ish CSS selector without reading input values. */

export { visibleText } from './describe-target';

export function cssPath(el: Element | null): string {
  if (!el || el.nodeType !== 1) return '';
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur.nodeType === 1 && parts.length < 6) {
    let part = cur.tagName.toLowerCase();
    if (cur.id) {
      part += `#${CSS.escape(cur.id)}`;
      parts.unshift(part);
      break;
    }
    const testId =
      cur.getAttribute('data-testid') || cur.getAttribute('data-test');
    if (testId) {
      part += `[data-testid="${CSS.escape(testId)}"]`;
      parts.unshift(part);
      break;
    }
    const parentEl: Element | null = cur.parentElement;
    if (parentEl) {
      const siblings = [...parentEl.children].filter(
        (c) => c.tagName === cur!.tagName,
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(cur) + 1;
        part += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(part);
    cur = parentEl;
  }
  return parts.join(' > ');
}
