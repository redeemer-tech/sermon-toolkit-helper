import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { hasValidCronAuthorization } from './cron-auth';

describe('hasValidCronAuthorization', () => {
  test('accepts the configured Vercel cron bearer token', () => {
    assert.equal(
      hasValidCronAuthorization('Bearer daily-secret', 'daily-secret'),
      true
    );
  });

  test('rejects missing or incorrect credentials', () => {
    assert.equal(hasValidCronAuthorization(null, 'daily-secret'), false);
    assert.equal(
      hasValidCronAuthorization('Bearer daily-secret', undefined),
      false
    );
    assert.equal(
      hasValidCronAuthorization('Bearer another-secret', 'daily-secret'),
      false
    );
  });
});
