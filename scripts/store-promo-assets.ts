/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 *
 * Build Chrome Web Store promo tile (440×280) and a no-alpha 128 icon.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const OUT = path.resolve('store/assets');

async function render(width: number, height: number, html: string, file: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: file, type: 'png' });
  await browser.close();
}

async function main() {
  const icon = (await readFile(path.join(OUT, 'store-icon-128.png'))).toString(
    'base64',
  );
  const shot = (
    await readFile(path.join(OUT, 'screenshot-1-popup-ready.png'))
  ).toString('base64');

  const small = `<!doctype html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:440px;height:280px;overflow:hidden;font-family:"Segoe UI",system-ui,sans-serif;
    background:linear-gradient(135deg,#14213D 0%,#1b3a5a 55%,#0f766e 100%);color:#f2f0ea;position:relative}
  .bg{position:absolute;inset:0;opacity:.18;background:url(data:image/png;base64,${shot}) center/cover no-repeat}
  .card{position:relative;z-index:1;height:100%;padding:22px 24px;display:flex;flex-direction:column;justify-content:space-between}
  .top{display:flex;align-items:center;gap:14px}
  img{width:64px;height:64px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.35)}
  h1{font-size:28px;letter-spacing:-.03em;line-height:1.1}
  p{font-size:15px;line-height:1.35;max-width:24rem;color:#d7efe9;margin-top:6px}
  .pill{align-self:flex-start;font-size:12px;font-weight:600;padding:6px 10px;border-radius:999px;background:rgba(94,234,212,.18);color:#5EEAD4;border:1px solid rgba(94,234,212,.35)}
</style></head><body>
  <div class="bg"></div>
  <div class="card">
    <div class="top">
      <img src="data:image/png;base64,${icon}" alt="">
      <div>
        <h1>QuietReplay</h1>
        <p>Record a page. Save it on your computer. Nothing is sent online.</p>
      </div>
    </div>
    <div class="pill">Local recording · No account</div>
  </div>
</body></html>`;

  await render(440, 280, small, path.join(OUT, 'promo-small-440x280.png'));

  const flatIcon = `<!doctype html><html><body style="margin:0;width:128px;height:128px;background:#14213D">
<img src="data:image/png;base64,${icon}" width="128" height="128" style="display:block" alt="">
</body></html>`;
  await render(128, 128, flatIcon, path.join(OUT, 'store-icon-128-noalpha.png'));

  console.log('Wrote store/assets/promo-small-440x280.png');
  console.log('Wrote store/assets/store-icon-128-noalpha.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
