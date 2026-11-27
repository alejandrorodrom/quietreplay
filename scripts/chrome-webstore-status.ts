/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 *
 * Print Chrome Web Store item status (published + submitted revisions).
 * Env: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, EXTENSION_ID, PUBLISHER_ID
 * Optional: FAIL_IF_PENDING=1 — exit 1 when submitted revision is PENDING_REVIEW
 * Optional: GITHUB_OUTPUT — write submitted_state / published_state for Actions
 */

import { appendFileSync } from 'node:fs';

type ItemRevisionStatus = {
  state?: string;
};

type FetchStatusResponse = {
  itemId?: string;
  takenDown?: boolean;
  warned?: boolean;
  lastAsyncUploadState?: string;
  publishedItemRevisionStatus?: ItemRevisionStatus;
  submittedItemRevisionStatus?: ItemRevisionStatus;
  error?: { message?: string; status?: string };
  error_description?: string;
};

const STATE_HELP: Record<string, string> = {
  PENDING_REVIEW: 'In review (wait; do not upload another package unless forced)',
  STAGED: 'Approved and staged — publish from the dashboard or API within the window',
  PUBLISHED: 'Live on the Chrome Web Store',
  PUBLISHED_TO_TESTERS: 'Published to trusted testers only',
  REJECTED: 'Rejected — check the Developer Dashboard for details',
  CANCELLED: 'Submission cancelled',
  ITEM_STATE_UNSPECIFIED: 'Unknown / unspecified',
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

/** Safe shape check — never logs secret values. */
function logCredentialShape() {
  const id = requireEnv('CLIENT_ID');
  const secret = requireEnv('CLIENT_SECRET');
  const refresh = requireEnv('REFRESH_TOKEN');
  console.log('OAuth credential shape (values hidden)');
  console.log(
    `  CLIENT_ID:     len=${id.length} suffix=${id.slice(-28)} googleusercontent=${id.endsWith('.apps.googleusercontent.com')}`,
  );
  console.log(
    `  CLIENT_SECRET: len=${secret.length} prefix=${secret.slice(0, 7)}`,
  );
  console.log(
    `  REFRESH_TOKEN: len=${refresh.length} prefix=${refresh.slice(0, 4)}`,
  );
}

function describe(state: string | undefined): string {
  if (!state) return '(none)';
  return `${state} — ${STATE_HELP[state] ?? 'See Chrome Web Store docs'}`;
}

function setOutput(key: string, value: string) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  appendFileSync(out, `${key}=${value}\n`);
}

async function fetchAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: requireEnv('CLIENT_ID'),
    client_secret: requireEnv('CLIENT_SECRET'),
    refresh_token: requireEnv('REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      `OAuth token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim(),
    );
  }
  return json.access_token;
}

async function fetchStatus(token: string): Promise<FetchStatusResponse> {
  const publisherId = requireEnv('PUBLISHER_ID');
  const extensionId = requireEnv('EXTENSION_ID');
  const url = `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}:fetchStatus`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as FetchStatusResponse;
  if (!res.ok) {
    throw new Error(
      `fetchStatus failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return json;
}

async function main() {
  logCredentialShape();
  const token = await fetchAccessToken();
  const status = await fetchStatus(token);
  const published = status.publishedItemRevisionStatus?.state;
  const submitted = status.submittedItemRevisionStatus?.state;

  console.log('Chrome Web Store status');
  console.log(`  itemId:     ${status.itemId ?? requireEnv('EXTENSION_ID')}`);
  console.log(`  published:  ${describe(published)}`);
  console.log(`  submitted:  ${describe(submitted)}`);
  if (status.lastAsyncUploadState) {
    console.log(`  lastUpload: ${status.lastAsyncUploadState}`);
  }
  if (status.takenDown) {
    console.log('  takenDown:  true (policy takedown — check the dashboard)');
  }
  if (status.warned) {
    console.log('  warned:     true (policy warning — check the dashboard)');
  }

  const summary = `published=${published ?? 'none'}; submitted=${submitted ?? 'none'}`;
  console.log(`::notice title=Chrome Web Store::${summary}`);

  setOutput('published_state', published ?? '');
  setOutput('submitted_state', submitted ?? '');
  setOutput('taken_down', status.takenDown ? 'true' : 'false');
  setOutput('warned', status.warned ? 'true' : 'false');

  if (process.env.FAIL_IF_PENDING === '1' && submitted === 'PENDING_REVIEW') {
    console.error(
      '::error::Chrome Web Store item is PENDING_REVIEW. Wait for the review to finish, or re-run with force_chrome_upload=true.',
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
