/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

import JSZip from 'jszip';
import { sanitizeZipFilename } from './filename';
import {
  labelFromFilename,
  loadQuietReplayCase,
  QuietReplayCaseError,
  type LoadedCase,
} from './load-case';

export type BundleCaseMeta = {
  path: string;
  label: string;
};

export type BundleJson = {
  schema: 'quietreplay-bundle/v1';
  title: string;
  createdAt: string;
  cases: BundleCaseMeta[];
};

export type BundleCaseInput = {
  label: string;
  zipBlob: Blob;
};

export type LoadedBundleResult = {
  bundle: BundleJson;
  entries: {
    label: string;
    path: string;
    loaded: LoadedCase;
  }[];
  errors: BundleLoadError[];
};

export type BundleErrorCode = 'empty' | 'unreadable' | 'not-group';

export class QuietReplayBundleError extends Error {
  readonly code: BundleErrorCode;
  constructor(code: BundleErrorCode) {
    super(code);
    this.name = 'QuietReplayBundleError';
    this.code = code;
  }
}

export type BundleLoadError = {
  path: string;
  code: 'missing' | 'unreadable' | 'not-recording';
};

export function isQuietReplayBundle(value: unknown): value is BundleJson {
  if (!value || typeof value !== 'object') return false;
  const b = value as Record<string, unknown>;
  return (
    b.schema === 'quietreplay-bundle/v1' &&
    typeof b.title === 'string' &&
    Array.isArray(b.cases)
  );
}

/** Safe nested case basename from a display label. */
export function slugifyCaseLabel(label: string): string {
  let name = label.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-');
  name = name.replace(/-+/g, '-').replace(/^\.+/, '').toLowerCase();
  if (!name) name = 'case';
  if (!/\.zip$/i.test(name)) name += '.zip';
  return name.slice(0, 120);
}

export function defaultBundleFilename(title?: string): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '-',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
  if (title?.trim()) {
    const slug = slugifyCaseLabel(title).replace(/\.zip$/i, '');
    return sanitizeZipFilename(`quietreplay-bundle-${stamp}-${slug}`) ||
      `quietreplay-bundle-${stamp}.zip`;
  }
  return `quietreplay-bundle-${stamp}.zip`;
}

export type ZipKind = 'case' | 'bundle' | 'unknown';

/** Detect whether a ZIP is a QuietReplay case, a variant bundle, or neither. */
export async function peekZipKind(file: Blob): Promise<ZipKind> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return 'unknown';
  }
  if (zip.file('bundle.json')) {
    try {
      const raw = JSON.parse(await zip.file('bundle.json')!.async('string'));
      if (isQuietReplayBundle(raw)) return 'bundle';
    } catch {
      /* fall through */
    }
  }
  if (zip.file('report.json')) {
    try {
      const raw = JSON.parse(await zip.file('report.json')!.async('string'));
      if (raw && typeof raw === 'object' && raw.schema === 'quietreplay/v1') {
        return 'case';
      }
    } catch {
      /* fall through */
    }
  }
  return 'unknown';
}

function uniqueCasePath(label: string, used: Set<string>): string {
  const base = slugifyCaseLabel(label);
  let candidate = `cases/${base}`;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const stem = base.replace(/\.zip$/i, '');
    candidate = `cases/${stem}-${n}.zip`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/** Build a quietreplay-bundle/v1 ZIP from labeled case blobs. */
export async function buildBundleZip(opts: {
  title: string;
  cases: BundleCaseInput[];
  filename?: string;
}): Promise<{ blob: Blob; filename: string; bundle: BundleJson }> {
  if (opts.cases.length === 0) {
    throw new QuietReplayBundleError('empty');
  }

  const zip = new JSZip();
  const used = new Set<string>();
  const meta: BundleCaseMeta[] = [];

  for (const c of opts.cases) {
    const path = uniqueCasePath(c.label, used);
    const buf = await c.zipBlob.arrayBuffer();
    zip.file(path, buf);
    meta.push({ path, label: c.label.trim() || labelFromFilename(path) });
  }

  const bundle: BundleJson = {
    schema: 'quietreplay-bundle/v1',
    title: opts.title.trim() || 'QuietReplay bundle',
    createdAt: new Date().toISOString(),
    cases: meta,
  };
  zip.file('bundle.json', JSON.stringify(bundle, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename =
    sanitizeZipFilename(opts.filename ?? '') ||
    defaultBundleFilename(bundle.title);
  return { blob, filename, bundle };
}

/**
 * Open a bundle ZIP. Valid nested cases are returned; failures are listed in
 * `errors` without failing the whole load.
 */
export async function loadBundleZip(file: Blob): Promise<LoadedBundleResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new QuietReplayBundleError('unreadable');
  }

  const bundleFile = zip.file('bundle.json');
  if (!bundleFile) {
    throw new QuietReplayBundleError('not-group');
  }

  let bundle: BundleJson;
  try {
    const raw = JSON.parse(await bundleFile.async('string'));
    if (!isQuietReplayBundle(raw)) {
      throw new Error('bad schema');
    }
    bundle = raw;
  } catch {
    throw new QuietReplayBundleError('not-group');
  }

  const entries: LoadedBundleResult['entries'] = [];
  const errors: BundleLoadError[] = [];

  for (const item of bundle.cases) {
    const nested = zip.file(item.path);
    if (!nested) {
      errors.push({ path: item.path, code: 'missing' });
      continue;
    }
    try {
      const buf = await nested.async('arraybuffer');
      const caseBlob = new Blob([new Uint8Array(buf)], {
        type: 'application/zip',
      });
      const loaded = await loadQuietReplayCase(caseBlob);
      entries.push({
        label: item.label || labelFromFilename(item.path),
        path: item.path,
        loaded,
      });
    } catch (e) {
      const code =
        e instanceof QuietReplayCaseError && e.code === 'not-recording'
          ? 'not-recording'
          : 'unreadable';
      errors.push({ path: item.path, code });
    }
  }

  return { bundle, entries, errors };
}
