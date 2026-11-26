/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ROOTS = ['lib', 'entrypoints', 'scripts', 'locales'];
const HEADER_MARK = 'SPDX-License-Identifier: MIT';
const COPYRIGHT_MARK = 'Copyright QuietReplay contributors';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|js|mjs)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(join(ROOT, r)));
const missing: string[] = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const head = text.slice(0, 400);
  if (!head.includes(HEADER_MARK) || !head.includes(COPYRIGHT_MARK)) {
    missing.push(relative(ROOT, file));
  }
}

if (missing.length) {
  console.error('Missing SPDX/copyright headers in:');
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(`OK: ${files.length} source files have SPDX/copyright headers.`);
