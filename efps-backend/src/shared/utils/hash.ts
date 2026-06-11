import * as argon2 from 'argon2';
import { createHash as createCryptoHash } from 'node:crypto';

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
  return createCryptoHash('sha256').update(otp).digest('hex');
}

export function hashToken(token: string): string {
  return createCryptoHash('sha256').update(token).digest('hex');
}
