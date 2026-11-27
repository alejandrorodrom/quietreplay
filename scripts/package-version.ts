/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 *
 * Read the extension version from a store ZIP (manifest.json at archive root).
 */

import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

export async function readZipManifestVersion(zipPath: string): Promise<string> {
  const buf = readFileSync(zipPath);
  const zip = await JSZip.loadAsync(buf);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error(`No manifest.json at ZIP root: ${zipPath}`);
  }
  const raw = JSON.parse(await manifestFile.async('string')) as {
    version?: string;
  };
  const version = raw.version?.trim();
  if (!version) {
    throw new Error(`manifest.json has no version in ${zipPath}`);
  }
  return version;
}

export function versionsEqual(a: string, b: string): boolean {
  return a.trim() === b.trim();
}
