import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createChurchSessionToken,
  hashChurchPassword,
  verifyChurchPassword,
  verifyChurchSessionToken,
} from '@/lib/church-auth-crypto';

describe('church authentication crypto', () => {
  test('verifies only the password used to create a scrypt hash', () => {
    const encoded = hashChurchPassword(
      'correct horse battery staple',
      Buffer.from('0123456789abcdef')
    );

    assert.equal(
      verifyChurchPassword('correct horse battery staple', encoded),
      true
    );
    assert.equal(verifyChurchPassword('incorrect password', encoded), false);
    assert.equal(verifyChurchPassword('anything', 'invalid-hash'), false);
  });

  test('accepts a signed, unexpired church session', () => {
    const now = Date.parse('2026-08-04T12:00:00.000Z');
    const secret = 'a-secure-test-session-secret-that-is-long-enough';
    const token = createChurchSessionToken(
      'e274faaf-c34f-4234-a862-04153b45f901',
      secret,
      now + 60_000
    );

    assert.deepEqual(verifyChurchSessionToken(token, secret, now), {
      churchId: 'e274faaf-c34f-4234-a862-04153b45f901',
      expiresAt: now + 60_000,
    });
  });

  test('rejects expired, tampered, or differently signed sessions', () => {
    const now = Date.parse('2026-08-04T12:00:00.000Z');
    const secret = 'a-secure-test-session-secret-that-is-long-enough';
    const token = createChurchSessionToken('church-id', secret, now - 1);

    assert.equal(verifyChurchSessionToken(token, secret, now), null);
    assert.equal(
      verifyChurchSessionToken(`${token}tampered`, secret, now - 2),
      null
    );
    assert.equal(
      verifyChurchSessionToken(
        token,
        'a-different-session-secret-that-is-long-enough',
        now - 2
      ),
      null
    );
  });
});
