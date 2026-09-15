import { describe, expect, test } from 'bun:test';

import { hasValidCronAuthorization } from './cron-auth';

describe('hasValidCronAuthorization', () => {
  test('accepts the configured Vercel cron bearer token', () => {
    expect(hasValidCronAuthorization('Bearer daily-secret', 'daily-secret')).toBe(
      true
    );
  });

  test('rejects missing or incorrect credentials', () => {
    expect(hasValidCronAuthorization(null, 'daily-secret')).toBe(false);
    expect(hasValidCronAuthorization('Bearer daily-secret', undefined)).toBe(
      false
    );
    expect(hasValidCronAuthorization('Bearer another-secret', 'daily-secret')).toBe(
      false
    );
  });
});
