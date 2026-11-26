/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ROOTS = ['lib', 'entrypoints', 'scripts', 'locales'];
const BLOCK = `/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

`;

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

let updated = 0;
for (const file of ROOTS.flatMap((r) => walk(join(ROOT, r)))) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('SPDX-License-Identifier: MIT')) continue;
  writeFileSync(file, BLOCK + text, 'utf8');
  updated += 1;
}

console.log(`Applied headers to ${updated} files.`);
