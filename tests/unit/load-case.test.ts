import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { ReportJson } from '../../lib/report';
import {
  isQuietReplayReport,
  labelFromFilename,
  loadQuietReplayCase,
  QuietReplayCaseError,
} from '../../lib/load-case';

function minimalReport(overrides?: Partial<ReportJson>): ReportJson {
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
      to: '2026-11-26T12:00:10.000Z',
      seconds: 10,
    },
    summary: {
      errors: 0,
      failedRequests: 0,
      clicks: 1,
      screenshots: 0,
    },
    errors: [],
    failedRequests: [],
    steps: [{ t: 100, type: 'click', text: 'Go' }],
    files: {
      har: null,
      console: 'console.json',
      events: 'events.json',
      screenshots: [],
      video: null,
    },
    redaction: { version: 1, enabled: false, customRules: 0 },
    ...overrides,
  };
}

async function caseZip(
  report: ReportJson,
  extras?: { png?: boolean; jpg?: boolean; webm?: boolean },
): Promise<Blob> {
  const zip = new JSZip();
  zip.file('report.json', JSON.stringify(report));
  zip.file('console.json', JSON.stringify([{ t: 1, level: 'log', args: ['hi'] }]));
  zip.file('events.json', JSON.stringify([{ kind: 'click', t: 1 }]));
  zip.file('report.md', '# report');
  if (extras?.png) zip.file('shots/a.png', new Uint8Array([1, 2, 3]));
  if (extras?.jpg) zip.file('shots/b.jpg', new Uint8Array([4, 5, 6]));
  if (extras?.webm) zip.file('video/clip.webm', new Uint8Array([7, 8, 9]));
  return await zip.generateAsync({ type: 'blob' });
}

describe('loadQuietReplayCase', () => {
  it('loads a valid quietreplay/v1 case', async () => {
    const blob = await caseZip(minimalReport());
    const loaded = await loadQuietReplayCase(blob);
    expect(loaded.report.page.title).toBe('App');
    expect(loaded.console).toHaveLength(1);
    expect(loaded.events).toHaveLength(1);
    expect(loaded.video).toBeNull();
    expect(loaded.sourceBlob).toBe(blob);
  });

  it('rejects ZIPs without a QuietReplay report', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'nope');
    const blob = await zip.generateAsync({ type: 'blob' });
    await expect(loadQuietReplayCase(blob)).rejects.toBeInstanceOf(
      QuietReplayCaseError,
    );
  });

  it('loads screenshots and video with mime types', async () => {
    const report = minimalReport({
      files: {
        har: null,
        console: 'console.json',
        events: 'events.json',
        screenshots: ['shots/a.png', 'shots/b.jpg', 'shots/missing.png'],
        video: 'video/clip.webm',
      },
    });
    const blob = await caseZip(report, { png: true, jpg: true, webm: true });
    const loaded = await loadQuietReplayCase(blob);
    expect(loaded.screenshots).toHaveLength(2);
    expect(loaded.screenshots[0]?.blob.type).toBe('image/png');
    expect(loaded.screenshots[1]?.blob.type).toBe('image/jpeg');
    expect(loaded.video?.type).toBe('video/webm');
  });

  it('rejects unreadable blobs', async () => {
    await expect(
      loadQuietReplayCase(new Blob(['not-a-zip'], { type: 'text/plain' })),
    ).rejects.toMatchObject({ code: 'unreadable' });
  });

  it('rejects wrong schema', async () => {
    const blob = await caseZip(
      minimalReport({ schema: 'other/v1' as ReportJson['schema'] }),
    );
    await expect(loadQuietReplayCase(blob)).rejects.toBeInstanceOf(
      QuietReplayCaseError,
    );
  });
});

describe('helpers', () => {
  it('detects report shape', () => {
    expect(isQuietReplayReport(minimalReport())).toBe(true);
    expect(isQuietReplayReport({ schema: 'nope' })).toBe(false);
  });

  it('derives labels from filenames', () => {
    expect(labelFromFilename('quietreplay-20261126-example.com.zip')).toBe(
      'quietreplay-20261126-example.com',
    );
    expect(labelFromFilename('/tmp/case.ZIP')).toBe('case');
  });
});
