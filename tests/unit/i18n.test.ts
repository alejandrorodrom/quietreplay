import { describe, expect, it } from 'vitest';
import { t } from '../../lib/i18n';
import { detectDefaultLocale } from '../../lib/settings';

describe('i18n', () => {
  it('returns Spanish strings', () => {
    expect(t('es', 'statusArmed')).toBe('Grabando…');
  });

  it('returns English strings', () => {
    expect(t('en', 'statusArmed')).toBe('Recording…');
  });

  it('interpolates template variables', () => {
    expect(
      t('en', 'viewerMissingNested', { name: 'demo.zip' }),
    ).toContain('demo.zip');
  });
});



describe('detectDefaultLocale', () => {
  it('returns a locale', () => {
    expect(['es', 'en']).toContain(detectDefaultLocale());
  });
});
