/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

export type Locale = 'es' | 'en';

export type TabStatus = 'idle' | 'armed' | 'saving' | 'ready';

/** Same labels Chrome writes in `_resourceType` when you download a HAR. */
export type NetworkResourceType = 'fetch' | 'xhr';

export type CapturedEvent =
  | {
      kind: 'console';
      t: number;
      level: string;
      args: string[];
      /** File and line Chrome shows next to the message, such as `app.js:253`. */
      source?: string;
      stack?: string;
    }
  | {
      kind: 'error';
      t: number;
      message: string;
      stack?: string;
      source?: string;
    }
  | {
      kind: 'click' | 'keydown';
      t: number;
      selector: string;
      text?: string;
      inputType?: string;
      x?: number;
      y?: number;
      key?: string;
    }
  | {
      kind: 'navigation';
      t: number;
      url: string;
      title: string;
    }
  | {
      kind: 'network';
      t: number;
      method: string;
      url: string;
      status: number;
      durationMs: number;
      statusText?: string;
      requestHeaders?: Record<string, string>;
      responseHeaders?: Record<string, string>;
      requestBody?: string;
      requestEncoding?: 'base64';
      responseBody?: string;
      responseEncoding?: 'base64';
      size?: number;
      /** `fetch` or `xhr`, matching Chrome's HAR `_resourceType`. */
      resourceType: NetworkResourceType;
    }
  | {
      kind: 'screenshot';
      t: number;
      id: string;
      mime: string;
      dataUrl: string;
    }
  | {
      kind: 'env';
      t: number;
      userAgent: string;
      viewport: [number, number];
      dpr: number;
      locale: string;
      timezone: string;
      url: string;
      title: string;
    };

export type Settings = {
  /** Bumps when default UX settings change so existing installs migrate once. */
  settingsVersion: number;
  locale: Locale;
  captureBodies: boolean;
  videoEnabled: boolean;
  /** When true, hide secrets and blur what the user types. Off by default. */
  obfuscationEnabled: boolean;
  downloadSubfolder: string;
  customRedactionRules: { pattern: string; flags?: string }[];
  customBlurSelectors: string[];
};

export const SETTINGS_VERSION = 4;

export const DEFAULT_SETTINGS: Settings = {
  settingsVersion: SETTINGS_VERSION,
  locale: 'en',
  captureBodies: true,
  videoEnabled: true,
  obfuscationEnabled: false,
  downloadSubfolder: 'quietreplay',
  customRedactionRules: [],
  customBlurSelectors: [],
};
