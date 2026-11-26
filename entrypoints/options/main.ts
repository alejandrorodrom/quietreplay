/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import { t } from '../../lib/i18n';
import type { Locale, Settings } from '../../lib/types';

const form = document.getElementById('options-form') as HTMLFormElement;
const localeEl = document.getElementById('locale') as HTMLSelectElement;
const bodiesEl = document.getElementById('captureBodies') as HTMLInputElement;
const videoEl = document.getElementById('videoEnabled') as HTMLInputElement;
const obfuscationEl = document.getElementById(
  'obfuscationEnabled',
) as HTMLInputElement;
const folderEl = document.getElementById(
  'downloadSubfolder',
) as HTMLInputElement;
const redactEl = document.getElementById('customRedaction') as HTMLTextAreaElement;
const blurEl = document.getElementById('customBlur') as HTMLTextAreaElement;
const saveBtn = document.getElementById('save') as HTMLButtonElement;
const savedEl = document.getElementById('saved')!;
const redactError = document.getElementById('redact-error')!;
const heading = document.getElementById('heading')!;

function setText(id: string, locale: Locale, key: Parameters<typeof t>[1]) {
  const el = document.getElementById(id);
  if (el) el.textContent = t(locale, key);
}

function applyLabels(locale: Locale) {
  document.documentElement.lang = locale;
  document.title = `${t(locale, 'optionsTitle')} · ${t(locale, 'appName')}`;
  heading.textContent = t(locale, 'optionsTitle');
  setText('options-intro', locale, 'optionsIntro');
  (
    document.querySelector('label[for="locale"]') as HTMLLabelElement
  ).textContent = t(locale, 'language');
  (
    document.querySelector('label[for="captureBodies"]') as HTMLLabelElement
  ).textContent = t(locale, 'captureBodies');
  setText('capture-bodies-hint', locale, 'captureBodiesHint');
  (
    document.querySelector('label[for="videoEnabled"]') as HTMLLabelElement
  ).textContent = t(locale, 'videoEnabled');
  setText('video-hint', locale, 'videoEnabledHint');
  (
    document.querySelector(
      'label[for="obfuscationEnabled"]',
    ) as HTMLLabelElement
  ).textContent = t(locale, 'obfuscationEnabled');
  setText('obfuscation-hint', locale, 'obfuscationHint');
  setText('screenshots-beta-hint', locale, 'screenshotsBetaHint');
  (
    document.querySelector('label[for="downloadSubfolder"]') as HTMLLabelElement
  ).textContent = t(locale, 'downloadSubfolder');
  setText('folder-hint', locale, 'downloadSubfolderHint');
  setText('advanced-summary', locale, 'advancedSummary');
  setText('advanced-hint', locale, 'advancedHint');
  (
    document.querySelector('label[for="customRedaction"]') as HTMLLabelElement
  ).textContent = t(locale, 'customRedaction');
  setText('redact-help', locale, 'customRedactionHint');
  (
    document.querySelector('label[for="customBlur"]') as HTMLLabelElement
  ).textContent = t(locale, 'customBlur');
  setText('blur-help', locale, 'customBlurHint');
  saveBtn.textContent = t(locale, 'saveSettings');
  savedEl.textContent = t(locale, 'settingsSaved');
}

function fill(settings: Settings) {
  localeEl.value = settings.locale;
  bodiesEl.checked = settings.captureBodies;
  videoEl.checked = settings.videoEnabled;
  obfuscationEl.checked = settings.obfuscationEnabled;
  folderEl.value = settings.downloadSubfolder;
  redactEl.value = settings.customRedactionRules
    .map((r) => r.pattern)
    .join('\n');
  blurEl.value = settings.customBlurSelectors.join('\n');
  const advanced = document.getElementById('advanced') as HTMLDetailsElement;
  advanced.open =
    settings.customRedactionRules.length > 0 ||
    settings.customBlurSelectors.length > 0;
  applyLabels(settings.locale);
}

async function load() {
  const res = (await chrome.runtime.sendMessage({
    type: 'qr:get-status',
  })) as { settings: Settings };
  fill(res.settings);
}

function validateRegexLines(
  raw: string,
  locale: Locale,
): { ok: true; rules: { pattern: string }[] } | { ok: false; message: string } {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const rules: { pattern: string }[] = [];
  for (const line of lines) {
    try {
      void new RegExp(line);
      rules.push({ pattern: line });
    } catch {
      return { ok: false, message: t(locale, 'invalidPattern', { line }) };
    }
  }
  return { ok: true, rules };
}

function clearPatternError() {
  redactEl.setCustomValidity('');
  redactEl.removeAttribute('aria-invalid');
  redactEl.setAttribute('aria-describedby', 'redact-help');
  redactError.hidden = true;
  redactError.textContent = '';
}

function showPatternError(message: string) {
  redactEl.setCustomValidity(message);
  redactEl.setAttribute('aria-invalid', 'true');
  redactEl.setAttribute('aria-describedby', 'redact-help redact-error');
  redactError.textContent = message;
  redactError.hidden = false;
}

redactEl.addEventListener('input', () => {
  clearPatternError();
});

redactEl.addEventListener('blur', () => {
  if (!redactEl.value.trim()) return;
  const result = validateRegexLines(redactEl.value, localeEl.value as Locale);
  if (!result.ok) showPatternError(result.message);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const locale = localeEl.value as Locale;
  const result = validateRegexLines(redactEl.value, locale);
  if (!result.ok) {
    showPatternError(result.message);
    (document.getElementById('advanced') as HTMLDetailsElement).open = true;
    redactEl.focus();
    return;
  }
  const patch: Partial<Settings> = {
    locale,
    captureBodies: bodiesEl.checked,
    videoEnabled: videoEl.checked,
    obfuscationEnabled: obfuscationEl.checked,
    downloadSubfolder: folderEl.value.trim() || 'quietreplay',
    customRedactionRules: result.rules,
    customBlurSelectors: blurEl.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  };

  saveBtn.disabled = true;
  await chrome.runtime.sendMessage({ type: 'qr:save-settings', patch });
  savedEl.hidden = false;
  applyLabels(patch.locale!);
  saveBtn.disabled = false;
});

localeEl.addEventListener('change', () => {
  applyLabels(localeEl.value as Locale);
});

void load();
