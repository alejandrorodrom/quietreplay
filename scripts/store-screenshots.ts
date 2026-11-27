/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 *
 * Capture Chrome Web Store / Edge listing screenshots from the real UI.
 * Usage: pnpm run store:screenshots
 */

import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type BrowserContext } from '@playwright/test';
import { buildZipBlob } from '../lib/zip';
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type CapturedEvent,
} from '../lib/types';

const ROOT = path.resolve('.');
const EXT = path.join(ROOT, '.output', 'chrome-mv3');
const OUT = path.join(ROOT, 'store', 'assets');
const DEMO = path.join(ROOT, 'store', 'fixtures', 'demo-page.html');
const WIDTH = 1280;
const HEIGHT = 800;

type PopupMode = 'idle' | 'armed';

async function waitForExtensionId(context: BrowserContext): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    for (const sw of context.serviceWorkers()) {
      try {
        const host = new URL(sw.url()).host;
        if (host) return host;
      } catch {
        /* ignore */
      }
    }
    const next = await context
      .waitForEvent('serviceworker', { timeout: 1_000 })
      .catch(() => null);
    if (next) {
      try {
        const host = new URL(next.url()).host;
        if (host) return host;
      } catch {
        /* ignore */
      }
    }
  }
  throw new Error('Extension service worker not found');
}

async function startDemoServer(): Promise<{ base: string; close: () => void }> {
  const html = await readFile(DEMO, 'utf8');
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => server.close(),
  };
}

function mockStatusInit(mode: PopupMode): string {
  const status = mode === 'armed' ? 'armed' : 'idle';
  return `(() => {
    const mock = {
      status: ${JSON.stringify(status)},
      settings: {
        settingsVersion: ${SETTINGS_VERSION},
        locale: 'en',
        captureBodies: true,
        videoEnabled: true,
        obfuscationEnabled: false,
        downloadSubfolder: 'quietreplay',
        customRedactionRules: [],
        customBlurSelectors: [],
      },
      videoActive: ${mode === 'armed' ? 'true' : 'false'},
      videoEnabled: true,
      lastVideoError: null,
      suggestedFilename: 'quietreplay-20261126-153045-demo-shop.zip',
    };
    const send = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = ((msg, ...rest) => {
      if (msg && msg.type === 'qr:get-status') {
        return Promise.resolve(mock);
      }
      return send(msg, ...rest);
    });
  })();`;
}

async function shotPopup(
  context: BrowserContext,
  extId: string,
  mode: PopupMode,
): Promise<Buffer> {
  const page = await context.newPage();
  await page.addInitScript({ content: mockStatusInit(mode) });
  await page.setViewportSize({ width: 420, height: 640 });
  await page.goto(`chrome-extension://${extId}/popup.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('#status-text');
  await page.waitForFunction(
    (expected) =>
      document.getElementById('status-text')?.textContent?.includes(expected) ??
      false,
    mode === 'armed' ? 'Recording' : 'Ready',
  );
  const buf = await page.locator('main').screenshot({ type: 'png' });
  await page.close();
  return buf;
}

async function composeWithPopup(
  context: BrowserContext,
  backgroundUrl: string,
  popupPng: Buffer,
  outFile: string,
): Promise<void> {
  const page = await context.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.goto(backgroundUrl, { waitUntil: 'domcontentloaded' });
  const bg = await page.screenshot({ type: 'png' });
  const popupB64 = popupPng.toString('base64');
  const bgB64 = bg.toString('base64');
  await page.setContent(`<!doctype html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#111">
  <img alt="" src="data:image/png;base64,${bgB64}"
    style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
  <div style="position:absolute;top:64px;right:56px;width:384px;
    border-radius:14px;overflow:hidden;
    box-shadow:0 18px 50px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.12);
    background:#f6f4ef">
    <img alt="" src="data:image/png;base64,${popupB64}" style="display:block;width:100%" />
  </div>
</body></html>`);
  await page.locator('body').screenshot({
    path: outFile,
    type: 'png',
  });
  await page.close();
}

function tinyJpegDataUrl(): string {
  // 1x1 JPEG
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wAAAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z';
}

async function sampleZipBytes(): Promise<Uint8Array> {
  const t0 = Date.now() - 18_000;
  const events: CapturedEvent[] = [
    {
      kind: 'env',
      t: t0,
      userAgent: 'QuietReplay store screenshot',
      viewport: [1280, 800],
      dpr: 1,
      locale: 'en',
      timezone: 'UTC',
      url: 'https://demo.shop/checkout',
      title: 'Checkout — Demo Shop',
    },
    {
      kind: 'click',
      t: t0 + 1200,
      selector: 'button#pay',
      text: 'Pay now',
    },
    {
      kind: 'keydown',
      t: t0 + 2400,
      selector: 'input#promo',
      inputType: 'text',
      key: 'S',
    },
    {
      kind: 'navigation',
      t: t0 + 4000,
      url: 'https://demo.shop/checkout',
      title: 'Checkout — Demo Shop',
    },
    {
      kind: 'console',
      t: t0 + 4500,
      level: 'info',
      args: ['Pay clicked'],
      source: 'checkout.js',
    },
    {
      kind: 'error',
      t: t0 + 6000,
      message: 'Payment provider timeout',
      source: 'checkout.js:88',
    },
    {
      kind: 'network',
      t: t0 + 7000,
      method: 'POST',
      url: 'https://demo.shop/api/pay',
      status: 500,
      durationMs: 842,
      resourceType: 'fetch',
    },
    {
      kind: 'screenshot',
      t: t0 + 7500,
      id: 'shot-1',
      mime: 'image/jpeg',
      dataUrl: tinyJpegDataUrl(),
    },
    {
      kind: 'click',
      t: t0 + 9000,
      selector: 'button#back',
      text: 'Back to cart',
    },
  ];
  const { blob } = await buildZipBlob(events, DEFAULT_SETTINGS, {
    extensionVersion: '2.1.1',
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function forceEnglishLocale(context: BrowserContext, extId: string) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/options.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.evaluate(async () => {
    const KEY = 'quietreplay.settings';
    const data = await chrome.storage.local.get(KEY);
    const current = (data[KEY] ?? {}) as Record<string, unknown>;
    await chrome.storage.local.set({
      [KEY]: { ...current, locale: 'en' },
    });
  });
  await page.close();
}

async function shotViewer(context: BrowserContext, extId: string, outFile: string) {
  const zipPath = path.join(OUT, 'demo-shop-checkout.zip');
  await writeFile(zipPath, await sampleZipBytes());
  const page = await context.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.goto(`chrome-extension://${extId}/viewer.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('#file-input', { state: 'attached' });
  await page.locator('#file-input').setInputFiles(zipPath);
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#case-list .case-item').length > 0,
      undefined,
      { timeout: 15_000 },
    );
  } catch (err) {
    const diag = await page.evaluate(() => ({
      error: document.getElementById('load-error')?.textContent ?? null,
      empty: document.getElementById('case-empty')?.textContent ?? null,
      listHtml: document.getElementById('case-list')?.innerHTML ?? null,
      files: (document.getElementById('file-input') as HTMLInputElement | null)
        ?.files?.length,
    }));
    console.error('Viewer load failed:', diag);
    await page.screenshot({
      path: path.join(OUT, 'screenshot-3-viewer-debug.png'),
      type: 'png',
    });
    throw err;
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: outFile, type: 'png' });
  await page.close();
}

async function shotOptions(context: BrowserContext, extId: string, outFile: string) {
  const page = await context.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.goto(`chrome-extension://${extId}/options.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('#options-form');
  await page.screenshot({ path: outFile, type: 'png' });
  await page.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const demo = await startDemoServer();
  // MV3 extensions need a real Chromium window; plain headless shell skips them.
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: WIDTH, height: HEIGHT },
  });

  try {
    // Nudge the worker awake before reading its URL.
    const warm = await context.newPage();
    await warm.goto('about:blank').catch(() => undefined);
    const extId = await waitForExtensionId(context);
    await warm.close().catch(() => undefined);
    const site = await context.newPage();
    await site.goto(demo.base, { waitUntil: 'domcontentloaded' });

    const idlePopup = await shotPopup(context, extId, 'idle');
    const armedPopup = await shotPopup(context, extId, 'armed');

    await composeWithPopup(
      context,
      demo.base,
      idlePopup,
      path.join(OUT, 'screenshot-1-popup-ready.png'),
    );
    await composeWithPopup(
      context,
      demo.base,
      armedPopup,
      path.join(OUT, 'screenshot-2-popup-recording.png'),
    );
    await forceEnglishLocale(context, extId);
    await shotViewer(context, extId, path.join(OUT, 'screenshot-3-viewer.png'));
    await shotOptions(context, extId, path.join(OUT, 'screenshot-4-settings.png'));

    await writeFile(
      path.join(OUT, 'popup-idle.png'),
      idlePopup,
    );
    await writeFile(
      path.join(OUT, 'popup-recording.png'),
      armedPopup,
    );

    console.log(`Wrote store screenshots to ${OUT}`);
    console.log(' - screenshot-1-popup-ready.png');
    console.log(' - screenshot-2-popup-recording.png');
    console.log(' - screenshot-3-viewer.png');
    console.log(' - screenshot-4-settings.png');
  } finally {
    await context.close();
    demo.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
