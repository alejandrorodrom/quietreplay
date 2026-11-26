/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

/**
 * Best-effort labels for clicks/keys without reading typed values.
 * Pages often break a11y, so we cascade several DOM heuristics.
 */

const INTERACTIVE =
  'button, a, summary, input, textarea, select, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]';

const FIELD_SHELL =
  'mat-form-field, .mat-mdc-form-field, .mat-form-field, .form-group, .form-field, [class*="form-field"], [class*="FormField"], fieldset, label';

const LABEL_INNER =
  'mat-label, label, legend, .label, [class*="label"]:not(input):not(textarea):not(select)';

const MODIFIER_ONLY = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph']);

/** Tags whose textContent is not user-visible (SVG logos embed CSS here). */
const SKIP_TEXT_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'HEAD',
]);

/** Click labels longer than this are almost never useful (whole forms, SVG CSS). */
const MAX_LABEL_LEN = 80;

/** CSS-in-SVG / stylesheet fragments that leak via textContent. */
const CSS_NOISE =
  /\.st\d+\s*\{|fill\s*:\s*url\(#|clip-path\s*:\s*url\(#|stroke-miterlimit\s*:/i;

function looksLikeNoise(text: string): boolean {
  if (!text) return true;
  if (CSS_NOISE.test(text)) return true;
  // Mostly punctuation / CSS tokens, little real language
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (text.length > 40 && letters / text.length < 0.35) return true;
  return false;
}

function sanitizeLabel(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned || looksLikeNoise(cleaned)) return '';
  // Whole-form / page dumps — prefer no label over a paragraph of UI chrome
  if (cleaned.length > MAX_LABEL_LEN * 2) return '';
  if (cleaned.length > MAX_LABEL_LEN) {
    return cleaned.slice(0, MAX_LABEL_LEN - 1).trimEnd() + '…';
  }
  return cleaned;
}

function svgAccessibleName(el: Element): string {
  const svg = el.closest('svg');
  if (!svg) return '';
  const titleEl = svg.querySelector(':scope > title');
  return firstNonEmpty(
    attr(svg, 'aria-label'),
    labelledByText(svg),
    attr(svg, 'title'),
    titleEl ? visibleText(titleEl) : '',
  );
}

export function visibleText(el: Element): string {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent || '';
      if (t.trim()) parts.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const elNode = node as Element;
    const tagName = elNode.tagName.toUpperCase();
    if (SKIP_TEXT_TAGS.has(tagName)) return;
    // <svg> chrome (defs/styles) is noise; keep only <text>/<title>/<desc>
    if (tagName === 'SVG') {
      for (const child of Array.from(elNode.children)) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'text' || tag === 'title' || tag === 'desc' || tag === 'tspan') {
          walk(child);
        } else if (tag === 'g' || tag === 'a' || tag === 'svg') {
          walk(child);
        }
      }
      return;
    }
    if (tagName === 'DEFS') return;
    for (const child of Array.from(elNode.childNodes)) walk(child);
  };
  walk(el);
  return sanitizeLabel(parts.join(' '));
}

function attr(el: Element, name: string): string {
  return (el.getAttribute(name) || '').replace(/\s+/g, ' ').trim();
}

function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const v of values) {
    const s = (v || '').replace(/\s+/g, ' ').trim();
    if (s) return s;
  }
  return '';
}

function labelledByText(el: Element): string {
  const ids = attr(el, 'aria-labelledby').split(/\s+/).filter(Boolean);
  if (!ids.length || !el.ownerDocument) return '';
  const parts: string[] = [];
  for (const id of ids) {
    const node = el.ownerDocument.getElementById(id);
    if (node) {
      const t = visibleText(node);
      if (t) parts.push(t);
    }
  }
  return parts.join(' ').trim();
}

function associatedLabelText(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string {
  const labels = el.labels;
  if (labels?.length) {
    for (const lab of Array.from(labels)) {
      const t = visibleText(lab);
      if (t) return t;
    }
  }
  const id = el.id;
  if (id && el.ownerDocument) {
    const lab = el.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lab) {
      const t = visibleText(lab);
      if (t) return t;
    }
  }
  const wrap = el.closest('label');
  if (wrap) {
    const clone = wrap.cloneNode(true) as HTMLLabelElement;
    clone.querySelectorAll('input, textarea, select').forEach((n) => n.remove());
    const t = visibleText(clone);
    if (t) return t;
  }
  return '';
}

function humanizeToken(raw: string): string {
  const cleaned = raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || /^\d+$/.test(cleaned)) return '';
  return cleaned;
}

/** Label for an input/textarea/select — never the value. */
export function describeControl(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string {
  return firstNonEmpty(
    attr(el, 'aria-label'),
    labelledByText(el),
    associatedLabelText(el),
    attr(el, 'placeholder'),
    attr(el, 'title'),
    el.name ? humanizeToken(el.name) : '',
    el.id ? humanizeToken(el.id) : '',
  );
}

function describeFieldShell(shell: Element): string {
  const labelEl = shell.querySelector(LABEL_INNER);
  if (labelEl) {
    const t = visibleText(labelEl);
    if (t) return t;
  }
  const control = shell.querySelector('input, textarea, select');
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLSelectElement
  ) {
    return describeControl(control);
  }
  return firstNonEmpty(attr(shell, 'aria-label'), attr(shell, 'title'));
}

function describeInteractive(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return describeControl(el);
  }
  if (tag === 'img' || el.getAttribute('role') === 'img') {
    return firstNonEmpty(attr(el, 'alt'), attr(el, 'aria-label'), attr(el, 'title'));
  }
  return firstNonEmpty(
    attr(el, 'aria-label'),
    labelledByText(el),
    attr(el, 'title'),
    visibleText(el),
  );
}

/**
 * Human label for a click target. Prefers the interactive ancestor
 * (button/link/input), then Material/Bootstrap field shells, then local text.
 */
export function describeClickTarget(el: Element | null): string | undefined {
  if (!el || el.nodeType !== 1) return undefined;

  const interactive = el.closest(INTERACTIVE);
  if (interactive) {
    const label = describeInteractive(interactive);
    return label || undefined;
  }

  const shell = el.closest(FIELD_SHELL);
  if (shell) {
    const label = describeFieldShell(shell);
    if (label) return label;
  }

  // Logo / icon SVGs: never surface embedded CSS as the click label
  const svgName = svgAccessibleName(el);
  if (svgName) return svgName;
  if (el.closest('svg')) return undefined;

  const local = firstNonEmpty(
    attr(el, 'aria-label'),
    attr(el, 'title'),
    visibleText(el),
  );
  return local || undefined;
}

/**
 * Key to store for a keydown. Skips lone modifiers.
 * Password printable chars become `*` so the report still shows a keystroke
 * without reconstructing the secret.
 */
export function captureKey(
  key: string,
  inputType?: string,
): string | undefined {
  if (!key || MODIFIER_ONLY.has(key)) return undefined;
  const printable = key.length === 1;
  if (inputType === 'password' && printable) return '*';
  return key;
}

/** Soften raw KeyboardEvent.key for the readable report. */
export function displayKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === '*') return '*';
  return key;
}

const TEXTISH_INPUT = new Set([
  'text',
  'email',
  'tel',
  'search',
  'url',
  'number',
  'password',
  '',
]);

/** When obfuscation is on, hide printable keys typed into fields. */
export function maybeMaskKey(
  key: string | undefined,
  inputType: string | undefined,
  obfuscate: boolean,
): string | undefined {
  if (!key) return undefined;
  if (key.length !== 1) return key;
  if (inputType === 'password') return '*';
  if (!obfuscate) return key;
  if (inputType !== undefined && TEXTISH_INPUT.has(inputType)) return '*';
  return key;
}
