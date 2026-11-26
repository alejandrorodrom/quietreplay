import { test } from '@playwright/test';

/**
 * Informational suite for fragile / channel-specific cases.
 * Kept separate so upstream or Chrome-channel flakiness does not block merge.
 */
test('external placeholder — chrome channel smoke', async () => {
  test.skip(
    !process.env.QR_E2E_EXTERNAL,
    'Set QR_E2E_EXTERNAL=1 to enable fragile external cases',
  );
});
