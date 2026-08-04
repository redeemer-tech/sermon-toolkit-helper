import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const PASSWORD_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

type ChurchSessionPayload = {
  churchId: string;
  expiresAt: number;
};

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hashChurchPassword(
  password: string,
  salt = randomBytes(16)
): string {
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY,
  });

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

export function verifyChurchPassword(
  password: string,
  encodedHash: string
): boolean {
  const [algorithm, cost, blockSize, parallelization, salt, expectedHash] =
    encodedHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  try {
    const derivedHash = scryptSync(
      password,
      Buffer.from(salt, 'base64url'),
      PASSWORD_KEY_LENGTH,
      {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallelization),
        maxmem: SCRYPT_MAX_MEMORY,
      }
    );

    return safeEqual(derivedHash, Buffer.from(expectedHash, 'base64url'));
  } catch {
    return false;
  }
}

export function createChurchSessionToken(
  churchId: string,
  sessionSecret: string,
  expiresAt: number
): string {
  const payload = Buffer.from(
    JSON.stringify({ churchId, expiresAt } satisfies ChurchSessionPayload)
  ).toString('base64url');
  const signature = createHmac('sha256', sessionSecret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function verifyChurchSessionToken(
  token: string,
  sessionSecret: string,
  now = Date.now()
): ChurchSessionPayload | null {
  const [payload, providedSignature] = token.split('.');
  if (!payload || !providedSignature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', sessionSecret)
    .update(payload)
    .digest();

  try {
    if (
      !safeEqual(
        expectedSignature,
        Buffer.from(providedSignature, 'base64url')
      )
    ) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as Partial<ChurchSessionPayload>;

    if (
      typeof parsed.churchId !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= now
    ) {
      return null;
    }

    return parsed as ChurchSessionPayload;
  } catch {
    return null;
  }
}
