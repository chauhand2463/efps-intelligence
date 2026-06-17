import * as argon2 from 'argon2';
import { createHash as createCryptoHash, randomUUID } from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function hashOtp(otp: string): string {
  const salt = createCryptoHash('sha256').update(randomUUID()).digest('hex').slice(0, 16);
  return salt + ':' + createCryptoHash('sha256').update(salt + otp).digest('hex');
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const parts = hash.split(':');
  if (parts.length !== 2) return false;
  const expected = parts[0] + ':' + createCryptoHash('sha256').update(parts[0] + otp).digest('hex');
  return hash === expected;
}

export function hashToken(token: string): string {
  return createCryptoHash('sha256').update(token).digest('hex');
}
