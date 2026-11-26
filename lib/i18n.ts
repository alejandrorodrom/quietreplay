/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import { en, type MessageKey } from '../locales/en';
import { es } from '../locales/es';
import type { Locale } from './types';

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es };

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  let text = catalogs[locale][key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

export function getCatalog(locale: Locale) {
  return catalogs[locale];
}
