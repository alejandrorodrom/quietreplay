/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 *
 * Upload (and optionally submit) a QuietReplay ZIP to Microsoft Edge Add-ons.
 *
 * Env:
 *   EDGE_API_KEY, EDGE_CLIENT_ID, EDGE_PRODUCT_ID
 *   ZIP_PATH — required unless MODE=status
 *   MODE=status|upload (default upload)
 *   PUBLISH=1 — after upload, submit draft for certification
 *   FORCE=1 — allow draft upload while Partner Center shows In review
 *
 * Edge has no read-only “is it in review?” API. We probe with POST /submissions
 * and treat errorCode InProgressSubmission as In review (same role as Chrome
 * PENDING_REVIEW).
 */

import { readFileSync, appendFileSync } from 'node:fs';

const API = 'https://api.addons.microsoftedge.microsoft.com';

type PublishProbe =
  | { kind: 'in_review'; message?: string }
  | { kind: 'no_updates' }
  | { kind: 'submitted' }
  | { kind: 'failed'; errorCode?: string; message: string };

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

function isInReviewCode(errorCode?: string, message?: string): boolean {
  const blob = `${errorCode ?? ''} ${message ?? ''}`;
  return (
    errorCode === 'InProgressSubmission' ||
    blob.includes('InProgressSubmission') ||
    /submission is in progress/i.test(blob)
  );
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
    console.log(`Edge ${kind} operation ${operationId}: ${status}${json.errorCode ? ` (${json.errorCode})` : ''}`);
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

/**
 * Probe Partner Center review state via publish.
 * InProgressSubmission ⇒ In review (and draft may also exist — Partner Center UI).
 */
async function probeReviewState(): Promise<PublishProbe> {
  const productId = requireEnv('EDGE_PRODUCT_ID');
  const notes =
    process.env.CERTIFICATION_NOTES?.trim() ||
    'QuietReplay CI status probe / submit.';
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
    let message = text;
    try {
      const parsed = JSON.parse(text) as {
        errorCode?: string;
        message?: string;
      };
      errorCode = parsed.errorCode ?? '';
      message = parsed.message ?? text;
    } catch {
      /* raw text */
    }
    if (isInReviewCode(errorCode, message)) {
      return { kind: 'in_review', message };
    }
    if (errorCode === 'NoModulesUpdated' || /no updates/i.test(message)) {
      return { kind: 'no_updates' };
    }
    return { kind: 'failed', errorCode, message: text };
  }

  const opId = operationIdFromLocation(res.headers.get('Location'));
  const result = await waitForOperation('publish', opId);
  if (isInReviewCode(result.errorCode, result.message)) {
    return { kind: 'in_review', message: result.message };
  }
  if (result.errorCode === 'NoModulesUpdated' || /no updates/i.test(result.message ?? '')) {
    return { kind: 'no_updates' };
  }
  if (result.status === 'Succeeded') {
    return { kind: 'submitted' };
  }
  return {
    kind: 'failed',
    errorCode: result.errorCode,
    message: `${result.status}: ${result.message ?? ''}`.trim(),
  };
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
  console.log('::notice title=Edge Add-ons::Package uploaded to draft (UPDATE)');
  setOutput('upload_status', 'Succeeded');
}

function failInReview(message?: string): never {
  const msg =
    message?.trim() ||
    'Edge already has a submission In review (InProgressSubmission). Partner Center may also show an UPDATE In draft. Wait for Microsoft, cancel the submission, or re-run with force_upload=true to upload a new draft only.';
  console.log(`::warning title=Edge Add-ons in review::${msg}`);
  setOutput('review_state', 'in_progress');
  console.error(`::error::${msg}`);
  process.exit(1);
}

async function main() {
  const mode = (process.env.MODE ?? 'upload').trim();
  const doPublish = process.env.PUBLISH === '1';
  const force = process.env.FORCE === '1';

  console.log('Edge Add-ons');
  console.log(
    '  Note: no read-only review API — probing with publish (InProgressSubmission = In review).',
  );
  console.log(`  product: ${requireEnv('EDGE_PRODUCT_ID')}`);
  console.log(`  mode:    ${mode}`);
  console.log(`  publish: ${doPublish ? 'yes' : 'no'}`);
  console.log(`  force:   ${force ? 'yes' : 'no'}`);

  console.log('Probing Partner Center for In review…');
  const probe = await probeReviewState();
  console.log(`Probe result: ${probe.kind}`);

  if (probe.kind === 'in_review') {
    if (!force) {
      failInReview(probe.message);
    }
    console.log(
      '::warning title=Edge Add-ons in review::In review detected; force_upload=true — will upload draft only and not re-submit.',
    );
    setOutput('review_state', 'in_progress');
    if (mode === 'status') {
      console.log('::notice title=Edge Add-ons::Status-only: In review (forced continue N/A for status mode beyond warning)');
      return;
    }
    await uploadPackage();
    console.log(
      '::notice title=Edge Add-ons::Draft updated while previous submission stays In review. See Partner Center.',
    );
    return;
  }

  if (probe.kind === 'submitted') {
    console.log(
      '::notice title=Edge Add-ons::Probe submitted an existing draft for certification (nothing was In review).',
    );
    setOutput('review_state', 'submitted');
    if (mode === 'status') return;
    // Continue so the new ZIP becomes the next UPDATE draft.
  } else if (probe.kind === 'no_updates') {
    setOutput('review_state', 'clear');
  } else if (probe.kind === 'failed') {
    // Unknown failure — do not block draft upload unless it looks like review.
    console.log(
      `::warning title=Edge Add-ons::Probe failed (${probe.errorCode ?? 'unknown'}): ${probe.message}`,
    );
    setOutput('review_state', 'probe_failed');
  } else {
    setOutput('review_state', 'clear');
  }

  if (mode === 'status') {
    console.log('::notice title=Edge Add-ons::No In review submission detected by probe.');
    return;
  }

  await uploadPackage();

  if (!doPublish) {
    setOutput('upload_only', 'true');
    console.log(
      '::notice title=Edge Add-ons::Draft upload done. Not submitted (publish_stores=false).',
    );
    return;
  }

  // Skip second publish if probe already submitted the previous draft and we
  // only needed to refresh the package — submit the new draft now.
  const outcome = await probeReviewState();
  if (outcome.kind === 'in_review') {
    if (!force) failInReview(outcome.message);
    console.log(
      '::notice title=Edge Add-ons::New draft kept; still In review — not re-submitted.',
    );
    return;
  }
  if (outcome.kind === 'submitted') {
    setOutput('publish_status', 'Succeeded');
    setOutput('review_state', 'submitted');
    console.log(
      '::notice title=Edge Add-ons::Submitted for certification (Partner Center → In review).',
    );
    return;
  }
  if (outcome.kind === 'no_updates') {
    throw new Error(
      'Edge publish reported NoModulesUpdated after upload — package may not have changed vs draft.',
    );
  }
  throw new Error(
    `Edge publish after upload failed: ${outcome.kind} ${'errorCode' in outcome ? outcome.errorCode : ''} ${'message' in outcome ? outcome.message : ''}`.trim(),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
