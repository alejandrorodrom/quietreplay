import { describe, expect, it } from 'vitest';
import { buildHar } from '../../lib/har';
import { buildZipBlob } from '../../lib/zip';
import { DEFAULT_SETTINGS } from '../../lib/types';
import type { CapturedEvent } from '../../lib/types';

const sample: CapturedEvent[] = [
  {
    kind: 'env',
    t: 1,
    userAgent: 'test',
    viewport: [800, 600],
    dpr: 1,
    locale: 'en',
    timezone: 'UTC',
    url: 'https://example.com/app',
    title: 'App',
  },
  {
    kind: 'click',
    t: 2,
    selector: 'button#go',
    text: 'Go',
  },
  {
    kind: 'keydown',
    t: 2.5,
    selector: 'input#passwordDoc',
    inputType: 'password',
    key: '*',
  },
  {
    kind: 'keydown',
    t: 2.6,
    selector: 'input#login-doc',
    inputType: 'text',
    key: 'a',
  },
  {
    kind: 'click',
    t: 2.7,
    selector: 'button#btnEntendidoAlert > span:nth-of-type(4)',
    text: 'Entendido',
  },
  {
    kind: 'error',
    t: 3,
    message: 'boom',
    stack: 'Error: boom',
    source: 'app.js:1',
  },
  {
    kind: 'network',
    t: 4,
    method: 'GET',
    url: 'https://example.com/api?token=secret',
    status: 500,
    durationMs: 12,
    requestHeaders: { Authorization: 'Bearer x' },
    resourceType: 'fetch',
  },
];

describe('HAR', () => {
  it('keeps the captured URL, including query secrets', () => {
    const har = buildHar(sample) as {
      log: { version: string; entries: { request: { url: string } }[] };
    };
    expect(har.log.version).toBe('1.2');
    expect(har.log.entries[0]!.request.url).toContain('token=secret');
    expect(har.log.entries[0]!.request.url).not.toContain('[REDACTED]');
    expect(
      (har.log.entries[0] as { _resourceType?: string })._resourceType,
    ).toBe('fetch');
  });

  it('keeps the content type, query and body that were captured', () => {
    const har = buildHar(
      [
        {
          kind: 'network',
          t: 10,
          method: 'POST',
          url: 'https://example.com/api/items?q=widget',
          status: 201,
          statusText: 'Created',
          durationMs: 20,
          requestHeaders: {
            'Content-Type': 'application/json; charset=utf-8',
            Cookie: 'sid=abc',
          },
          responseHeaders: {
            'content-type': 'application/json',
            'set-cookie': 'sid=abc; Path=/; HttpOnly\ntheme=light; Secure',
          },
          requestBody: '{"name":"widget"}',
          responseBody: '{"ok":true}',
          size: 11,
          resourceType: 'xhr',
        },
      ],
    ) as {
      log: {
        entries: {
          request: {
            url: string;
            queryString: { name: string; value: string }[];
            cookies: { name: string; value: string }[];
            postData: { mimeType: string; text: string };
          };
          response: {
            statusText: string;
            cookies: { name: string; httpOnly?: boolean; secure?: boolean }[];
            content: { mimeType: string; text: string; encoding?: string };
          };
          _resourceType: string;
        }[];
      };
    };
    const entry = har.log.entries[0]!;
    expect(entry.request.queryString).toEqual([{ name: 'q', value: 'widget' }]);
    expect(entry.request.cookies).toEqual([{ name: 'sid', value: 'abc' }]);
    expect(entry.request.postData.mimeType).toBe(
      'application/json; charset=utf-8',
    );
    expect(entry.request.postData.text).toBe('{"name":"widget"}');
    expect(entry.response.statusText).toBe('Created');
    expect(entry.response.content.mimeType).toBe('application/json');
    expect(entry.response.content.text).toBe('{"ok":true}');
    expect(entry.response.content.encoding).toBeUndefined();
    expect(entry.response.cookies.map((c) => c.name)).toEqual([
      'sid',
      'theme',
    ]);
    expect(entry.response.cookies[0]!.httpOnly).toBe(true);
    expect(entry.response.cookies[1]!.secure).toBe(true);
    expect(entry._resourceType).toBe('xhr');
  });

  it('labels a binary body with its real type and base64 encoding', () => {
    const har = buildHar(
      [
        {
          kind: 'network',
          t: 11,
          method: 'GET',
          url: 'https://example.com/file.bin',
          status: 200,
          durationMs: 5,
          responseHeaders: { 'Content-Type': 'application/octet-stream' },
          responseBody: 'YQ==',
          responseEncoding: 'base64',
          size: 1,
          resourceType: 'fetch',
        },
      ],
    ) as {
      log: {
        entries: {
          response: { content: { mimeType: string; text: string; encoding?: string } };
        }[];
      };
    };
    const content = har.log.entries[0]!.response.content;
    expect(content.mimeType).toBe('application/octet-stream');
    expect(content.encoding).toBe('base64');
    expect(content.text).toBe('YQ==');
  });

  it('uses octet-stream only when the response has no content type', () => {
    const har = buildHar(
      [
        {
          kind: 'network',
          t: 12,
          method: 'GET',
          url: 'https://example.com/raw',
          status: 200,
          durationMs: 1,
          resourceType: 'fetch',
        },
      ],
    ) as {
      log: { entries: { response: { content: { mimeType: string } } }[] };
    };
    expect(har.log.entries[0]!.response.content.mimeType).toBe(
      'application/octet-stream',
    );
  });
});

describe('ZIP', () => {
  it('embeds video and screenshot bytes including invalid data URLs', async () => {
    const withMedia: CapturedEvent[] = [
      ...sample,
      {
        kind: 'screenshot',
        t: 20,
        id: 's1',
        mime: 'image/png',
        dataUrl: 'data:image/png;base64,QQ==',
      },
      {
        kind: 'screenshot',
        t: 21,
        id: 's2',
        mime: 'image/jpeg',
        dataUrl: 'not-a-data-url',
      },
      {
        kind: 'navigation',
        t: 22,
        url: 'https://example.com/next?token=abc',
        title: 'Next',
      },
      {
        kind: 'network',
        t: 23,
        method: 'POST',
        url: 'https://example.com/api',
        status: 200,
        durationMs: 1,
        requestBody: '{"password":"hunter2"}',
        responseBody: 'AAAA',
        responseEncoding: 'base64' as const,
        size: 4,
        resourceType: 'fetch',
      },
    ];
    const videoBlob = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: 'video/webm',
    });
    const { blob } = await buildZipBlob(
      withMedia,
      { ...DEFAULT_SETTINGS, obfuscationEnabled: true },
      { extensionVersion: '1.0.0', videoBlob },
    );
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files).some((p) => p.startsWith('screenshots/'))).toBe(
      true,
    );
    expect(zip.file('video.webm')).toBeTruthy();
    const events = JSON.parse(await zip.file('events.json')!.async('string'));
    expect(events.some((e: { kind: string }) => e.kind === 'navigation')).toBe(
      true,
    );
  });


  it('builds a zip blob with report files', async () => {
    const { blob, filename } = await buildZipBlob(sample, DEFAULT_SETTINGS, {
      extensionVersion: '1.0.0',
    });

    expect(blob.size).toBeGreaterThan(100);
    expect(filename).toMatch(/^quietreplay-.*-example\.com\.zip$/);

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file('report.json')).toBeTruthy();
    expect(zip.file('report.md')).toBeTruthy();
    expect(zip.file('network.har')).toBeTruthy();
    expect(zip.file('console.json')).toBeTruthy();
    expect(zip.file('events.json')).toBeTruthy();
    expect(zip.file('manifest.json')).toBeTruthy();

    const report = JSON.parse(await zip.file('report.json')!.async('string'));
    expect(report.schema).toBe('quietreplay/v1');
    expect(report.summary.errors).toBe(1);
    expect(report.summary.failedRequests).toBe(1);
    expect(report.redaction.enabled).toBe(false);

    const consoleLog = JSON.parse(
      await zip.file('console.json')!.async('string'),
    ) as { level: string; args: string[]; source?: string }[];
    expect(consoleLog).toEqual([
      expect.objectContaining({
        level: 'error',
        source: 'app.js:1',
        args: ['boom'],
      }),
    ]);
  });

  it('redacts secrets in network.har when obfuscation is on', async () => {
    const { blob } = await buildZipBlob(sample, {
      ...DEFAULT_SETTINGS,
      obfuscationEnabled: true,
    }, { extensionVersion: '1.0.0' });
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const har = JSON.parse(await zip.file('network.har')!.async('string')) as {
      log: {
        entries: {
          request: { url: string; headers: { name: string; value: string }[] };
        }[];
      };
    };
    const entry = har.log.entries[0]!;
    expect(entry.request.url).not.toContain('secret');
    expect(entry.request.url).toContain('[REDACTED]');
    const auth = entry.request.headers.find(
      (h) => h.name.toLowerCase() === 'authorization',
    );
    expect(auth?.value).toContain('[REDACTED]');

    const events = JSON.parse(
      await zip.file('events.json')!.async('string'),
    ) as { kind: string; url?: string; requestHeaders?: Record<string, string> }[];
    const net = events.find((e) => e.kind === 'network')!;
    expect(net.url).toContain('[REDACTED]');
    expect(net.requestHeaders?.Authorization ?? net.requestHeaders?.authorization).toContain(
      '[REDACTED]',
    );
  });

  it('drops extension-owned HAR entries from the zip', async () => {
    const withExt: CapturedEvent[] = [
      ...sample,
      {
        kind: 'network',
        t: 5,
        method: 'GET',
        url: 'chrome-extension://abcdefghijklmnop/offscreen.html',
        status: 200,
        durationMs: 1,
        resourceType: 'fetch',
      },
    ];
    const { blob } = await buildZipBlob(withExt, DEFAULT_SETTINGS, {
      extensionVersion: '1.0.0',
      extensionId: 'abcdefghijklmnop',
    });
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const har = JSON.parse(await zip.file('network.har')!.async('string')) as {
      log: { entries: { request: { url: string } }[] };
    };
    expect(har.log.entries).toHaveLength(1);
    expect(har.log.entries[0]!.request.url).toContain('example.com');
  });

  it('localizes report.md in Spanish', async () => {
    const { blob } = await buildZipBlob(
      sample,
      { ...DEFAULT_SETTINGS, locale: 'es' },
      { extensionVersion: '1.0.0' },
    );
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const md = await zip.file('report.md')!.async('string');
    expect(md).toContain('Qué hiciste');
    expect(md).toContain('Clic en «Go»');
    expect(md).toContain('Pulsó la tecla *');
    expect(md).toContain('Pulsó la tecla a');
    expect(md).toContain('Clic en «Entendido»');

    const report = JSON.parse(await zip.file('report.json')!.async('string'));
    const keySteps = report.steps.filter(
      (s: { type: string }) => s.type === 'keydown',
    );
    expect(keySteps).toEqual([
      expect.objectContaining({ text: '*' }),
      expect.objectContaining({ text: 'a' }),
    ]);
  });

  it('keeps every step in report.json and report.md', async () => {
    const manyKeys: CapturedEvent[] = [
      sample[0]!,
      ...Array.from({ length: 250 }, (_, i) => ({
        kind: 'keydown' as const,
        t: 10 + i,
        selector: 'input#x',
        inputType: 'text',
        key: String(i % 10),
      })),
    ];
    const { blob } = await buildZipBlob(manyKeys, DEFAULT_SETTINGS, {
      extensionVersion: '1.0.0',
    });
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const report = JSON.parse(await zip.file('report.json')!.async('string'));
    const md = await zip.file('report.md')!.async('string');
    expect(report.steps).toHaveLength(250);
    expect(md).toContain('250. Pressed the 9 key');
  });
});
