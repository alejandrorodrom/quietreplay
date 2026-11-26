import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  buildBundleZip,
  defaultBundleFilename,
  isQuietReplayBundle,
  loadBundleZip,
  peekZipKind,
  QuietReplayBundleError,
  slugifyCaseLabel,
} from '../../lib/bundle';
import type { ReportJson } from '../../lib/report';

function minimalReport(): ReportJson {
  return {
    schema: 'quietreplay/v1',
    createdAt: '2026-11-26T12:00:00.000Z',
    extensionVersion: '2.0.0',
    page: { url: 'https://example.com/app', title: 'App' },
    environment: {
      userAgent: 'test',
      viewport: [800, 600],
      dpr: 1,
      locale: 'en',
      timezone: 'UTC',
    },
    window: {
      from: '2026-11-26T12:00:00.000Z',
      to: '2026-11-26T12:00:05.000Z',
      seconds: 5,
    },
    summary: {
      errors: 0,
      failedRequests: 0,
      clicks: 0,
      screenshots: 0,
    },
    errors: [],
    failedRequests: [],
    steps: [],
    files: {
      har: null,
      console: 'console.json',
      events: 'events.json',
      screenshots: [],
      video: null,
    },
    redaction: { version: 1, enabled: false, customRules: 0 },
  };
}

async function caseBlob(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('report.json', JSON.stringify(minimalReport()));
  zip.file('console.json', '[]');
  zip.file('events.json', '[]');
  return await zip.generateAsync({ type: 'blob' });
}

describe('bundle helpers', () => {
  it('slugifies labels and builds default filenames', () => {
    expect(slugifyCaseLabel('Happy Path')).toBe('happy-path.zip');
    expect(slugifyCaseLabel('Cupón inválido')).toBe('cupón-inválido.zip');
    expect(slugifyCaseLabel('A/B test')).toBe('a-b-test.zip');
    expect(defaultBundleFilename('Checkout')).toMatch(
      /^quietreplay-bundle-\d{8}-\d{6}-checkout\.zip$/,
    );
  });

  it('detects case vs bundle', async () => {
    const single = await caseBlob();
    expect(await peekZipKind(single)).toBe('case');

    const { blob } = await buildBundleZip({
      title: 'Flow',
      cases: [
        { label: 'Happy path', zipBlob: single },
        { label: 'Error', zipBlob: await caseBlob() },
      ],
    });
    expect(await peekZipKind(blob)).toBe('bundle');
    expect(isQuietReplayBundle({ schema: 'quietreplay-bundle/v1', title: 'x', createdAt: '', cases: [] })).toBe(
      true,
    );
  });
});

describe('buildBundleZip / loadBundleZip', () => {
  it('round-trips labels and nested cases', async () => {
    const a = await caseBlob();
    const b = await caseBlob();
    const { blob, bundle } = await buildBundleZip({
      title: 'Checkout con cupón',
      cases: [
        { label: 'Happy path', zipBlob: a },
        { label: 'Cupón inválido', zipBlob: b },
      ],
    });

    expect(bundle.schema).toBe('quietreplay-bundle/v1');
    expect(bundle.cases).toHaveLength(2);
    expect(bundle.cases[0]!.path).toMatch(/^cases\//);

    const loaded = await loadBundleZip(blob);
    expect(loaded.entries).toHaveLength(2);
    expect(loaded.entries.map((e) => e.label)).toEqual([
      'Happy path',
      'Cupón inválido',
    ]);
    expect(loaded.entries[0]!.loaded.report.schema).toBe('quietreplay/v1');
    expect(loaded.errors).toEqual([]);
  });

  it('keeps unique paths when labels collide', async () => {
    const { bundle } = await buildBundleZip({
      title: 'Dupes',
      cases: [
        { label: 'Same', zipBlob: await caseBlob() },
        { label: 'Same', zipBlob: await caseBlob() },
      ],
    });
    const paths = bundle.cases.map((c) => c.path);
    expect(new Set(paths).size).toBe(2);
  });

  it('rejects empty bundles and invalid ZIPs', async () => {
    await expect(
      buildBundleZip({ title: 'Empty', cases: [] }),
    ).rejects.toBeInstanceOf(QuietReplayBundleError);

    const zip = new JSZip();
    zip.file('nope.txt', 'x');
    const blob = await zip.generateAsync({ type: 'blob' });
    await expect(loadBundleZip(blob)).rejects.toBeInstanceOf(
      QuietReplayBundleError,
    );
  });

  it('reports missing nested cases without failing others', async () => {
    const zip = new JSZip();
    const good = await caseBlob();
    zip.file('cases/ok.zip', await good.arrayBuffer());
    zip.file(
      'bundle.json',
      JSON.stringify({
        schema: 'quietreplay-bundle/v1',
        title: 'Partial',
        createdAt: '2026-11-26T12:00:00.000Z',
        cases: [
          { path: 'cases/ok.zip', label: 'OK' },
          { path: 'cases/missing.zip', label: 'Gone' },
        ],
      }),
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    const result = await loadBundleZip(blob);
    expect(result.entries).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      path: 'cases/missing.zip',
      code: 'missing',
    });
  });
});
