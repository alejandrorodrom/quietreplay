/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

/** Safe ZIP basename for chrome.downloads (no path separators). */
export function sanitizeZipFilename(raw: string): string {
  let name = raw.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-');
  name = name.replace(/-+/g, '-').replace(/^\.+/, '');
  if (!name) return '';
  if (!/\.zip$/i.test(name)) name += '.zip';
  return name.slice(0, 180);
}

export function defaultZipFilename(host = 'page'): string {
  const safeHost = (host || 'page').replace(/[/\\?%*:|"<>]/g, '-') || 'page';
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
  return `quietreplay-${stamp}-${safeHost}.zip`;
}

export function hostFromUrl(url: string | undefined): string {
  if (!url) return 'page';
  try {
    return new URL(url).hostname || 'page';
  } catch {
    return 'page';
  }
}
