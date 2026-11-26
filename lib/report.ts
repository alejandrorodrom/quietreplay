/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import { displayKey, maybeMaskKey } from './describe-target';
import { t } from './i18n';
import { maybeRedactText, maybeRedactUrl } from './maybe-redact';
import type { CustomRedactionRule } from './redact';
import type { CapturedEvent, Locale, Settings } from './types';
import { mapInChunks } from './yield';

export type ReportJson = {
  schema: 'quietreplay/v1';
  createdAt: string;
  extensionVersion: string;
  page: { url: string; title: string };
  environment: {
    userAgent: string;
    viewport: [number, number];
    dpr: number;
    locale: string;
    timezone: string;
  };
  window: { from: string; to: string; seconds: number };
  summary: {
    errors: number;
    failedRequests: number;
    clicks: number;
    screenshots: number;
  };
  errors: {
    t: number;
    message: string;
    stack?: string;
    source?: string;
  }[];
  failedRequests: {
    t: number;
    method: string;
    url: string;
    status: number;
    durationMs: number;
  }[];
  steps: {
    t: number;
    type: string;
    selector?: string;
    text?: string;
    url?: string;
  }[];
  files: {
    har: string | null;
    console: string;
    events: string;
    screenshots: string[];
    video: string | null;
  };
  redaction: {
    version: number;
    enabled: boolean;
    customRules: number;
  };
};

function envFrom(events: CapturedEvent[]) {
  const env = [...events].reverse().find((e) => e.kind === 'env');
  return env?.kind === 'env' ? env : null;
}

export async function buildReport(
  events: CapturedEvent[],
  settings: Settings,
  opts: {
    extensionVersion: string;
    screenshotFiles: string[];
    hasHar: boolean;
    hasVideo: boolean;
    baseT: number;
  },
): Promise<{ report: ReportJson; markdown: string }> {
  const custom = settings.customRedactionRules;
  const obfuscate = settings.obfuscationEnabled;
  const locale: Locale = settings.locale;
  const env = envFrom(events);
  const now = Date.now();
  const from = events[0]?.t ?? now;
  const to = events[events.length - 1]?.t ?? now;

  const errors = events
    .filter((e) => e.kind === 'error')
    .map((e) => {
      if (e.kind !== 'error') throw new Error('unreachable');
      return {
        t: e.t - opts.baseT,
        message: maybeRedactText(obfuscate, e.message, custom),
        stack: e.stack
          ? maybeRedactText(obfuscate, e.stack, custom)
          : undefined,
        source: e.source
          ? maybeRedactText(obfuscate, e.source, custom)
          : undefined,
      };
    });

  const failedRequests = events
    .filter(
      (e) =>
        e.kind === 'network' && (e.status === 0 || e.status >= 400),
    )
    .map((e) => {
      if (e.kind !== 'network') throw new Error('unreachable');
      return {
        t: e.t - opts.baseT,
        method: e.method,
        url: maybeRedactUrl(obfuscate, e.url, custom),
        status: e.status,
        durationMs: e.durationMs,
      };
    });

  const steps = events
    .filter(
      (e) =>
        e.kind === 'click' || e.kind === 'navigation' || e.kind === 'keydown',
    )
    .map((e) => {
      if (e.kind === 'keydown') {
        const key = maybeMaskKey(e.key, e.inputType, obfuscate);
        return {
          t: e.t - opts.baseT,
          type: e.kind,
          selector: e.selector,
          text: key ? displayKey(key) : undefined,
        };
      }
      if (e.kind === 'click') {
        return {
          t: e.t - opts.baseT,
          type: e.kind,
          selector: e.selector,
          text: e.text
            ? maybeRedactText(obfuscate, e.text, custom)
            : undefined,
        };
      }
      if (e.kind === 'navigation') {
        return {
          t: e.t - opts.baseT,
          type: 'navigation',
          url: maybeRedactUrl(obfuscate, e.url, custom),
          text: maybeRedactText(obfuscate, e.title, custom),
        };
      }
      return { t: 0, type: 'unknown' };
    });

  const clicks = events.filter((e) => e.kind === 'click').length;
  const shots = events.filter((e) => e.kind === 'screenshot').length;

  const report: ReportJson = {
    schema: 'quietreplay/v1',
    createdAt: new Date().toISOString(),
    extensionVersion: opts.extensionVersion,
    page: {
      url: maybeRedactUrl(obfuscate, env?.url ?? '', custom),
      title: maybeRedactText(obfuscate, env?.title ?? '', custom),
    },
    environment: {
      userAgent: maybeRedactText(obfuscate, env?.userAgent ?? '', custom),
      viewport: env?.viewport ?? [0, 0],
      dpr: env?.dpr ?? 1,
      locale: env?.locale ?? '',
      timezone: env?.timezone ?? '',
    },
    window: {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      seconds: Math.max(0, Math.round((to - from) / 1000)),
    },
    summary: {
      errors: errors.length,
      failedRequests: failedRequests.length,
      clicks,
      screenshots: shots,
    },
    errors,
    failedRequests,
    steps,
    files: {
      har: opts.hasHar ? 'network.har' : null,
      console: 'console.json',
      events: 'events.json',
      screenshots: opts.screenshotFiles,
      video: opts.hasVideo ? 'video.webm' : null,
    },
    redaction: {
      version: 1,
      enabled: obfuscate,
      customRules: custom.length,
    },
  };

  const md = buildMarkdown(report, locale, custom, obfuscate);
  await mapInChunks(events, 200, () => null);
  return { report, markdown: md };
}

function buildMarkdown(
  report: ReportJson,
  locale: Locale,
  custom: CustomRedactionRule[],
  obfuscate: boolean,
): string {
  const lines: string[] = [];
  lines.push(`# ${t(locale, 'reportTitle')}: ${report.page.url}`);
  lines.push('');
  lines.push(`${report.createdAt}`);
  lines.push('');
  lines.push(`## ${t(locale, 'reportSteps')}`);
  if (!report.steps.length) {
    lines.push(`- ${t(locale, 'reportNoSteps')}`);
  } else {
    report.steps.forEach((s, i) => {
      if (s.type === 'navigation') {
        const name = s.text?.trim() || s.url || '';
        lines.push(`${i + 1}. ${t(locale, 'stepOpen')} ${name}`.trim());
      } else if (s.type === 'keydown') {
        lines.push(
          `${i + 1}. ${
            s.text
              ? t(locale, 'stepKey', { text: s.text })
              : t(locale, 'stepKeyBare')
          }`,
        );
      } else {
        lines.push(
          `${i + 1}. ${
            s.text
              ? t(locale, 'stepClick', { text: s.text })
              : t(locale, 'stepClickPage')
          }`,
        );
      }
    });
  }
  lines.push('');
  lines.push(`## ${t(locale, 'reportErrors')}`);
  if (!report.errors.length) {
    lines.push(`- ${t(locale, 'reportNoErrors')}`);
  } else {
    for (const e of report.errors) {
      const stack = e.stack ? `\n\`${e.stack.split('\n')[0]}\`` : '';
      lines.push(`- ${e.message}${stack}`);
    }
  }
  lines.push('');
  lines.push(`## ${t(locale, 'reportFailed')}`);
  if (!report.failedRequests.length) {
    lines.push(`- ${t(locale, 'reportNoFailed')}`);
  } else {
    for (const r of report.failedRequests) {
      lines.push(`- ${r.method} ${r.url} → ${r.status} (${r.durationMs}ms)`);
    }
  }
  lines.push('');
  lines.push(`## ${t(locale, 'reportEnv')}`);
  lines.push(
    `${report.environment.userAgent} | ${report.environment.viewport.join('x')} @${report.environment.dpr} | ${report.environment.locale} | ${report.environment.timezone}`,
  );
  return maybeRedactText(obfuscate, lines.join('\n'), custom);
}
