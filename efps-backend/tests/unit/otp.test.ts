import { describe, it, expect } from 'vitest';
import { generateOtp, isOtpExpiresAt } from '../../src/shared/utils/otp.js';

describe('OTP utilities', () => {
  it('should generate a 6-digit OTP', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('should generate OTPs with configurable length', () => {
    const otp = generateOtp(8);
    expect(otp).toMatch(/^\d{8}$/);
  });

  it('should generate different OTPs on each call', () => {
    const otp1 = generateOtp();
    const otp2 = generateOtp();
    expect(otp1).not.toBe(otp2);
  });

  it('should detect expired OTP', () => {
    const past = new Date(Date.now() - 1000);
    expect(isOtpExpiresAt(past)).toBe(true);
  });

  it('should detect non-expired OTP', () => {
    const future = new Date(Date.now() + 60000);
    expect(isOtpExpiresAt(future)).toBe(false);
  });
});
