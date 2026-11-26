import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.output');
const FORBIDDEN =
  /\b(XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts)\s*\(/;
const FETCH_CALL = /\bfetch\s*\(/;
const REMOTE_URL = /https?:\/\/[^\s"'`]+/g;

const ALLOWED_URL_SNIPPETS = [
  'https://example.invalid',
  'http://www.w3.org/',
  'https://json-schema.org/',
  'https://quietreplay.local/',
  // Bundled dependency docs strings (not executed as network calls)
  'https://stuk.github.io/jszip/',
  'https://github.com/Stuk/jszip',
];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.error(`Missing build output at ${dir}. Run pnpm run build first.`);
    process.exit(1);
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(js|mjs|html|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

function isAllowedUrl(url: string): boolean {
  return ALLOWED_URL_SNIPPETS.some((a) => url.startsWith(a) || url.includes(a));
}

async function main() {
  const st = await stat(ROOT).catch(() => null);
  if (!st?.isDirectory()) {
    console.error('No .output directory. Run pnpm run build first.');
    process.exit(1);
  }

  const files = await walk(ROOT);
  const violations: string[] = [];

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const rel = path.relative(process.cwd(), file);

    // Page-world inject bundles may contain fetch/XHR patches — only flag extension chrome pages loosely;
    // still forbid WebSocket/sendBeacon/EventSource/importScripts everywhere, and remote http(s) URLs.
    if (FORBIDDEN.test(text)) {
      violations.push(`${rel}: forbidden network constructor/API`);
    }

    // fetch( in extension UI/background is forbidden; allow in recorder-main (page patch).
    if (FETCH_CALL.test(text) && !rel.includes('recorder-main')) {
      // JSZip / tooling shouldn't call fetch; background must not.
      if (
        rel.includes('background') ||
        rel.includes('popup') ||
        rel.includes('options') ||
        rel.includes('offscreen')
      ) {
        violations.push(`${rel}: fetch( not allowed in extension pages`);
      }
    }

    const urls = text.match(REMOTE_URL) ?? [];
    for (const url of urls) {
      if (!isAllowedUrl(url)) {
        violations.push(`${rel}: remote URL ${url}`);
      }
    }
  }

  if (violations.length) {
    console.error('Zero-network check failed:');
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(`Zero-network check passed (${files.length} files).`);
}

void main();
