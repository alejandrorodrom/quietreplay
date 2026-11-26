import { describe, expect, it } from 'vitest';
import { applyStoredSettings } from '../../lib/settings';
import { DEFAULT_SETTINGS } from '../../lib/types';

describe('applyStoredSettings', () => {
  it('keeps every value the user already saved', () => {
    const stored = applyStoredSettings({
      settingsVersion: 1,
      locale: 'es',
      captureBodies: false,
      videoEnabled: false,
      obfuscationEnabled: true,
      downloadSubfolder: 'bugs',
      customRedactionRules: [{ pattern: 'SECRET' }],
      customBlurSelectors: ['input[type="password"]'],
    });

    expect(stored.locale).toBe('es');
    expect(stored.captureBodies).toBe(false);
    expect(stored.videoEnabled).toBe(false);
    expect(stored.obfuscationEnabled).toBe(true);
    expect(stored.downloadSubfolder).toBe('bugs');
    expect(stored.customRedactionRules).toEqual([{ pattern: 'SECRET' }]);
    expect(stored.customBlurSelectors).toEqual(['input[type="password"]']);
  });

  it('fills only keys that were never saved', () => {
    const stored = applyStoredSettings({ locale: 'es' });
    expect(stored.locale).toBe('es');
    expect(stored.captureBodies).toBe(DEFAULT_SETTINGS.captureBodies);
    expect(stored.videoEnabled).toBe(DEFAULT_SETTINGS.videoEnabled);
    expect(stored.obfuscationEnabled).toBe(false);
  });

  it('drops the legacy bufferSeconds setting', () => {
    const stored = applyStoredSettings({
      locale: 'en',
      bufferSeconds: 30,
    } as Partial<typeof DEFAULT_SETTINGS> & { bufferSeconds: number });
    expect(stored).not.toHaveProperty('bufferSeconds');
  });
});
