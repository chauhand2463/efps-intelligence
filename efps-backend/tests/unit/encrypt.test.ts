import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptMany } from '../../src/shared/utils/encrypt.js';

describe('Encrypt (AES-256-GCM)', () => {
  it('should encrypt and decrypt a string correctly', () => {
    const plaintext = 'my-secret-password-123';
    const encrypted = encrypt(plaintext);

    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(encrypted.ciphertext).not.toBe(plaintext);

    const decrypted = decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same input (unique IV)', () => {
    const plaintext = 'same-value';
    const result1 = encrypt(plaintext);
    const result2 = encrypt(plaintext);

    expect(result1.ciphertext).not.toBe(result2.ciphertext);
    expect(result1.iv).not.toBe(result2.iv);

    const dec1 = decrypt(result1.ciphertext, result1.iv, result1.authTag);
    const dec2 = decrypt(result2.ciphertext, result2.iv, result2.authTag);
    expect(dec1).toBe(plaintext);
    expect(dec2).toBe(plaintext);
  });

  it('should reject decryption with wrong key', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
    const encrypted = encrypt('sensitive-data');
    process.env.ENCRYPTION_KEY = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    expect(() => decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag)).toThrow();
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('should encrypt many fields at once', () => {
    const result = encryptMany({
      username: 'dealer123',
      password: 'pass456',
    });

    expect(result.username).toBeDefined();
    expect(result.password).toBeDefined();

    expect(decrypt(result.username!.ciphertext, result.username!.iv, result.username!.authTag)).toBe('dealer123');
    expect(decrypt(result.password!.ciphertext, result.password!.iv, result.password!.authTag)).toBe('pass456');
  });

  it('should handle empty string', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe('');
  });
});
