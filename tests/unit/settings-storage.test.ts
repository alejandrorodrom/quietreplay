import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      async get(key: string) {
        if (!store.has(key)) return {};
        return { [key]: store.get(key) };
      },
      async set(obj: Record<string, unknown>) {
        for (const [k, v] of Object.entries(obj)) store.set(k, v);
      },
    },
  },
  i18n: {
    getUILanguage: () => 'en-US',
  },
});

import {
  detectDefaultLocale,
  ensureSettings,
  loadSettings,
  saveSettings,
} from '../../lib/settings';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../../lib/types';

describe('settings storage', () => {
  beforeEach(() => {
    store.clear();
  });

  afterEach(() => {
    store.clear();
  });

  it('loadSettings seeds defaults when empty', async () => {
    const s = await loadSettings();
    expect(s.settingsVersion).toBe(SETTINGS_VERSION);
    expect(s.captureBodies).toBe(DEFAULT_SETTINGS.captureBodies);
    expect(store.has('quietreplay.settings')).toBe(true);
  });

  it('saveSettings merges patches', async () => {
    await loadSettings();
    const next = await saveSettings({ locale: 'es', videoEnabled: false });
    expect(next.locale).toBe('es');
    expect(next.videoEnabled).toBe(false);
  });

  it('ensureSettings creates initial locale from chrome.i18n', async () => {
    const s = await ensureSettings();
    expect(s.locale).toBe('en');
    const again = await ensureSettings();
    expect(again.locale).toBe('en');
  });

  it('detectDefaultLocale reads spanish UI language', () => {
    vi.stubGlobal('chrome', {
      ...chrome,
      i18n: { getUILanguage: () => 'es-CO' },
    });
    expect(detectDefaultLocale()).toBe('es');
  });

  it('detectDefaultLocale falls back to en on throw', () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: () => {
          throw new Error('boom');
        },
      },
    });
    expect(detectDefaultLocale()).toBe('en');
  });
});
