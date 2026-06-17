import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, hashOtp, verifyOtpHash, hashToken } from '../../src/shared/utils/hash.js';

describe('Hash utilities', () => {
  it('should hash and verify password correctly', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword(hash, 'wrongpassword');
    expect(isInvalid).toBe(false);
  });

  it('should produce different OTP hashes each time (random salt)', () => {
    const otp = '123456';
    const hash1 = hashOtp(otp);
    const hash2 = hashOtp(otp);
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(otp);
  });

  it('should verify OTP hash correctly', () => {
    const otp = '123456';
    const hash = hashOtp(otp);
    expect(verifyOtpHash(otp, hash)).toBe(true);
    expect(verifyOtpHash('654321', hash)).toBe(false);
  });

  it('should hash tokens consistently', () => {
    const token = 'test-refresh-token';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });
});
