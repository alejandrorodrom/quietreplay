/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import JSZip from 'jszip';
import type { ReportJson } from './report';

export type ConsoleLine = {
  t: number;
  level: string;
  source?: string;
  args: string[];
  stack?: string;
};

export type CaseMedia = {
  path: string;
  blob: Blob;
};

export type LoadedCase = {
  report: ReportJson;
  console: ConsoleLine[];
  events: unknown[];
  filePaths: string[];
  screenshots: CaseMedia[];
  video: Blob | null;
  /** Original case ZIP bytes for re-export into a bundle. */
  sourceBlob: Blob;
};

export type CaseErrorCode = 'unreadable' | 'not-recording';

export class QuietReplayCaseError extends Error {
  readonly code: CaseErrorCode;
  constructor(code: CaseErrorCode) {
    super(code);
    this.name = 'QuietReplayCaseError';
    this.code = code;
  }
}

export function isQuietReplayReport(value: unknown): value is ReportJson {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return r.schema === 'quietreplay/v1' && typeof r.createdAt === 'string';
}

function mimeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

async function readJson<T>(zip: JSZip, path: string): Promise<T | null> {
  const file = zip.file(path);
  if (!file) return null;
  const text = await file.async('string');
  return JSON.parse(text) as T;
}

/**
 * Parse a QuietReplay case ZIP (`report.json` with schema quietreplay/v1).
 */
export async function loadQuietReplayCase(file: Blob): Promise<LoadedCase> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new QuietReplayCaseError('unreadable');
  }

  const report = await readJson<unknown>(zip, 'report.json');
  if (!isQuietReplayReport(report)) {
    throw new QuietReplayCaseError('not-recording');
  }

  const consoleRaw =
    (await readJson<ConsoleLine[]>(zip, report.files.console)) ?? [];
  const eventsRaw =
    (await readJson<unknown[]>(zip, report.files.events)) ?? [];

  const filePaths = Object.keys(zip.files).filter((p) => !zip.files[p]!.dir);

  const screenshots: CaseMedia[] = [];
  for (const path of report.files.screenshots) {
    const f = zip.file(path);
    if (!f) continue;
    const buf = await f.async('arraybuffer');
    screenshots.push({
      path,
      blob: new Blob([new Uint8Array(buf)], { type: mimeForPath(path) }),
    });
  }

  let video: Blob | null = null;
  if (report.files.video) {
    const f = zip.file(report.files.video);
    if (f) {
      const buf = await f.async('arraybuffer');
      video = new Blob([new Uint8Array(buf)], {
        type: mimeForPath(report.files.video),
      });
    }
  }

  return {
    report,
    console: Array.isArray(consoleRaw) ? consoleRaw : [],
    events: Array.isArray(eventsRaw) ? eventsRaw : [],
    filePaths,
    screenshots,
    video,
    sourceBlob: file,
  };
}

/** Default list label from a file name (strip .zip). */
export function labelFromFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '');
  return base.replace(/\.zip$/i, '') || base || 'case';
}
