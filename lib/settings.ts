/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type Locale,
  type Settings,
} from './types';

const KEY = 'quietreplay.settings';

/** Fill only missing keys. A value already stored is left as the user saved it. */
export function applyStoredSettings(raw: Partial<Settings> | undefined): Settings {
  const { bufferSeconds: _legacyBuffer, ...rest } = (raw ?? {}) as Partial<Settings> & {
    bufferSeconds?: number;
  };
  void _legacyBuffer;
  const stored = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  ) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    settingsVersion: SETTINGS_VERSION,
    customRedactionRules: stored.customRedactionRules ?? [],
    customBlurSelectors: stored.customBlurSelectors ?? [],
  };
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(KEY);
  const raw = (data[KEY] ?? {}) as Partial<Settings>;
  const next = applyStoredSettings(raw);
  const storedVersion = raw.settingsVersion ?? 0;
  if (!data[KEY] || storedVersion < SETTINGS_VERSION) {
    await chrome.storage.local.set({ [KEY]: next });
  }
  return next;
}

export async function saveSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await loadSettings();
  const next: Settings = {
    ...current,
    ...patch,
    settingsVersion: SETTINGS_VERSION,
    customRedactionRules:
      patch.customRedactionRules ?? current.customRedactionRules,
    customBlurSelectors:
      patch.customBlurSelectors ?? current.customBlurSelectors,
  };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export function detectDefaultLocale(): Locale {
  try {
    const lang =
      typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
        ? chrome.i18n.getUILanguage()
        : navigator.language;
    return lang.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export async function ensureSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(KEY);
  if (!data[KEY]) {
    const initial: Settings = {
      ...DEFAULT_SETTINGS,
      locale: detectDefaultLocale(),
    };
    await chrome.storage.local.set({ [KEY]: initial });
    return initial;
  }
  return loadSettings();
}
