/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 *
 * Upload (and optionally submit) a QuietReplay ZIP to Microsoft Edge Add-ons.
 *
 * Env:
 *   EDGE_API_KEY, EDGE_CLIENT_ID, EDGE_PRODUCT_ID, ZIP_PATH
 *   PUBLISH=1 — submit draft for certification after upload
 *   FORCE=1 — if publish fails with InProgressSubmission, warn and exit 0
 *            (Edge has no read-only "is in review?" API; this is the signal)
 */

import { readFileSync, appendFileSync } from 'node:fs';

const API = 'https://api.addons.microsoftedge.microsoft.com';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

function setOutput(key: string, value: string) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  appendFileSync(out, `${key}=${value}\n`);
}

function headers(): HeadersInit {
  return {
    Authorization: `ApiKey ${requireEnv('EDGE_API_KEY')}`,
    'X-ClientID': requireEnv('EDGE_CLIENT_ID'),
  };
}

function operationIdFromLocation(location: string | null): string {
  if (!location) throw new Error('Missing Location header from Edge API');
  const parts = location.split('/').filter(Boolean);
  const id = parts[parts.length - 1];
  if (!id) throw new Error(`Could not parse operation id from Location: ${location}`);
  return id;
}

async function waitForOperation(
  kind: 'package' | 'publish',
  operationId: string,
): Promise<{ status: string; errorCode?: string; message?: string }> {
  const productId = requireEnv('EDGE_PRODUCT_ID');
  const path =
    kind === 'package'
      ? `/v1/products/${productId}/submissions/draft/package/operations/${operationId}`
      : `/v1/products/${productId}/submissions/operations/${operationId}`;

  for (let i = 0; i < 60; i++) {
    const res = await fetch(`${API}${path}`, { headers: headers() });
    const json = (await res.json()) as {
      status?: string;
      errorCode?: string;
      message?: string;
    };
    const status = json.status ?? 'Unknown';
    console.log(`Edge ${kind} operation ${operationId}: ${status}`);
    if (status !== 'InProgress') {
      return {
        status,
        errorCode: json.errorCode,
        message: json.message,
      };
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw new Error(`Timed out waiting for Edge ${kind} operation ${operationId}`);
}

async function uploadPackage(): Promise<void> {
  const productId = requireEnv('EDGE_PRODUCT_ID');
  const zipPath = requireEnv('ZIP_PATH');
  const body = readFileSync(zipPath);
  const res = await fetch(
    `${API}/v1/products/${productId}/submissions/draft/package`,
    {
      method: 'POST',
      headers: {
        ...headers(),
        'Content-Type': 'application/zip',
      },
      body,
    },
  );
  if (res.status !== 202) {
    const text = await res.text();
    throw new Error(`Edge package upload failed (${res.status}): ${text}`);
  }
  const opId = operationIdFromLocation(res.headers.get('Location'));
  const result = await waitForOperation('package', opId);
  if (result.status !== 'Succeeded') {
    throw new Error(
      `Edge package upload ${result.status}: ${result.errorCode ?? ''} ${result.message ?? ''}`.trim(),
    );
  }
  console.log('::notice title=Edge Add-ons::Package uploaded to draft');
  setOutput('upload_status', 'Succeeded');
}

async function publishSubmission(): Promise<'submitted' | 'in_review' | 'skipped'> {
  const productId = requireEnv('EDGE_PRODUCT_ID');
  const notes =
    process.env.CERTIFICATION_NOTES?.trim() ||
    'QuietReplay update. Test on https page: Record → interact → Stop and save.';
  const res = await fetch(`${API}/v1/products/${productId}/submissions`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (res.status !== 202) {
    const text = await res.text();
    let errorCode = '';
    try {
      errorCode = (JSON.parse(text) as { errorCode?: string }).errorCode ?? '';
    } catch {
      /* ignore */
    }
    if (errorCode === 'InProgressSubmission' || text.includes('InProgressSubmission')) {
      return 'in_review';
    }
    throw new Error(`Edge publish failed (${res.status}): ${text}`);
  }

  const opId = operationIdFromLocation(res.headers.get('Location'));
  const result = await waitForOperation('publish', opId);
  if (result.errorCode === 'InProgressSubmission') {
    return 'in_review';
  }
  if (result.status === 'Failed' && result.errorCode === 'InProgressSubmission') {
    return 'in_review';
  }
  if (result.status !== 'Succeeded') {
    throw new Error(
      `Edge publish ${result.status}: ${result.errorCode ?? ''} ${result.message ?? ''}`.trim(),
    );
  }
  console.log(
    '::notice title=Edge Add-ons::Submitted for certification (check Partner Center for In review)',
  );
  setOutput('publish_status', 'Succeeded');
  return 'submitted';
}

async function main() {
  const doPublish = process.env.PUBLISH === '1';
  const force = process.env.FORCE === '1';

  console.log('Edge Add-ons');
  console.log(
    '  Note: Microsoft has no read-only API for “is this in review?”. Partner Center is source of truth.',
  );
  console.log(`  product: ${requireEnv('EDGE_PRODUCT_ID')}`);
  console.log(`  publish: ${doPublish ? 'yes' : 'draft upload only'}`);
  console.log(`  force:   ${force ? 'yes' : 'no'}`);

  await uploadPackage();

  if (!doPublish) {
    setOutput('review_state', 'draft_only');
    return;
  }

  const outcome = await publishSubmission();
  if (outcome === 'in_review') {
    const msg =
      'Edge already has a submission in progress (InProgressSubmission). Wait for Partner Center review, or re-run with force_upload=true to keep the new draft and skip failing the job.';
    console.log(`::warning title=Edge Add-ons in review::${msg}`);
    setOutput('review_state', 'in_progress');
    if (!force) {
      console.error(`::error::${msg}`);
      process.exit(1);
    }
    console.log(
      '::notice title=Edge Add-ons::force_upload=true — draft kept; certification not re-submitted while in review',
    );
    return;
  }

  setOutput('review_state', 'submitted');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
