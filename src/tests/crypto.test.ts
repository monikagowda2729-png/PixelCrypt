import { describe, it, expect } from 'vitest';
import { educationalEncrypt, educationalDecrypt } from '../lib/crypto/educational';
import { aesGcmEncrypt, aesGcmDecrypt } from '../lib/crypto/aesGcm';
import { generateRandomKey, evaluateKeyStrength, base64ToBytes } from '../lib/crypto/keyDerivation';
import { DeterministicKeystream } from '../lib/crypto/deterministicStream';

describe('Key Management & Derivation', () => {
  it('generates random hex keys with expected length', () => {
    const key = generateRandomKey(32);
    expect(key).toHaveLength(64); // 32 bytes * 2 hex chars
    expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
  });

  it('evaluates key strength accurately', () => {
    const weak = evaluateKeyStrength('12345');
    expect(weak.score).toBeLessThan(50);
    expect(weak.label).toBe('Very Weak');

    const strong = evaluateKeyStrength('PixelCrypt#2026!SecOps');
    expect(strong.score).toBeGreaterThanOrEqual(70);

    const cryptoKey = evaluateKeyStrength(generateRandomKey(32));
    expect(cryptoKey.label).toBe('Cryptographic');
  });
});

describe('Deterministic Keystream & Permutation', () => {
  it('produces identical deterministic sequences for identical key and nonce', () => {
    const key = new Uint8Array(32).fill(42);
    const nonce = new Uint8Array(12).fill(7);

    const stream1 = new DeterministicKeystream(key, nonce);
    const stream2 = new DeterministicKeystream(key, nonce);

    const bytes1 = stream1.getBytes(128);
    const bytes2 = stream2.getBytes(128);

    expect(bytes1).toEqual(bytes2);
  });

  it('produces distinct sequences for different nonces', () => {
    const key = new Uint8Array(32).fill(42);
    const nonce1 = new Uint8Array(12).fill(1);
    const nonce2 = new Uint8Array(12).fill(2);

    const stream1 = new DeterministicKeystream(key, nonce1);
    const stream2 = new DeterministicKeystream(key, nonce2);

    const bytes1 = stream1.getBytes(64);
    const bytes2 = stream2.getBytes(64);

    expect(bytes1).not.toEqual(bytes2);
  });

  it('generates valid permutations with no duplicates or dropped indices', () => {
    const key = new Uint8Array(32).fill(15);
    const nonce = new Uint8Array(12).fill(9);
    const stream = new DeterministicKeystream(key, nonce);

    const n = 100;
    const perm = stream.generatePermutation(n);
    expect(perm).toHaveLength(n);

    // Check all indices 0..n-1 are present
    const seen = new Set(perm);
    expect(seen.size).toBe(n);

    // Check inverse permutation
    const inv = DeterministicKeystream.invertPermutation(perm);
    for (let i = 0; i < n; i++) {
      expect(inv[perm[i]]).toBe(i);
    }
  });
});

describe('Educational Pixel Manipulation Mode', () => {
  it('performs 100% exact mathematical round-trip encryption and decryption', async () => {
    const width = 8;
    const height = 8;
    const totalPixels = width * height;
    const originalPixels = new Uint8ClampedArray(totalPixels * 4);

    // Create gradient pattern
    for (let i = 0; i < totalPixels; i++) {
      originalPixels[i * 4] = (i * 3) % 256; // R
      originalPixels[i * 4 + 1] = (i * 7) % 256; // G
      originalPixels[i * 4 + 2] = (i * 13) % 256; // B
      originalPixels[i * 4 + 3] = 255; // Alpha
    }

    const key = 'TestKey_Alpha_123!';

    // Encrypt
    const encrypted = await educationalEncrypt(originalPixels, width, height, key);
    expect(encrypted.encryptedPixels).not.toEqual(originalPixels);
    expect(encrypted.integrityTag).toBeDefined();

    // Decrypt with correct key
    const decrypted = await educationalDecrypt(
      encrypted.encryptedPixels,
      width,
      height,
      key,
      encrypted.salt,
      encrypted.iv,
      encrypted.integrityTag
    );

    expect(decrypted.isValidKey).toBe(true);
    expect(decrypted.decryptedPixels).toEqual(originalPixels);
  });

  it('preserves alpha channel across encryption and decryption', async () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Distinct alpha values
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = 100;
      pixels[i * 4 + 1] = 150;
      pixels[i * 4 + 2] = 200;
      pixels[i * 4 + 3] = (i * 15) % 256; // Varied Alpha
    }

    const key = 'AlphaPreserveKey';
    const encrypted = await educationalEncrypt(pixels, width, height, key);
    const decrypted = await educationalDecrypt(
      encrypted.encryptedPixels,
      width,
      height,
      key,
      encrypted.salt,
      encrypted.iv,
      encrypted.integrityTag
    );

    expect(decrypted.decryptedPixels).toEqual(pixels);
  });

  it('produces different ciphertexts for different keys', async () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(128);

    const salt = new Uint8Array(16).fill(1);
    const iv = new Uint8Array(12).fill(2);

    const encA = await educationalEncrypt(pixels, width, height, 'SecretKeyA', salt, iv);
    const encB = await educationalEncrypt(pixels, width, height, 'SecretKeyB', salt, iv);

    expect(encA.encryptedPixels).not.toEqual(encB.encryptedPixels);
  });

  it('detects incorrect decryption keys via HMAC integrity check', async () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(75);

    const correctKey = 'CorrectPassword99';
    const wrongKey = 'WrongPassword00';

    const enc = await educationalEncrypt(pixels, width, height, correctKey);

    const dec = await educationalDecrypt(
      enc.encryptedPixels,
      width,
      height,
      wrongKey,
      enc.salt,
      enc.iv,
      enc.integrityTag
    );

    expect(dec.isValidKey).toBe(false);
    expect(dec.decryptedPixels).not.toEqual(pixels);
  });

  it('handles non-square image dimensions round-trip (e.g., 5x11)', async () => {
    const width = 5;
    const height = 11;
    const totalPixels = width * height;
    const pixels = new Uint8ClampedArray(totalPixels * 4);

    for (let i = 0; i < totalPixels; i++) {
      pixels[i * 4] = (i * 17) % 256;
      pixels[i * 4 + 1] = (i * 29) % 256;
      pixels[i * 4 + 2] = (i * 41) % 256;
      pixels[i * 4 + 3] = 255;
    }

    const key = 'NonSquareKey_5x11';
    const enc = await educationalEncrypt(pixels, width, height, key);
    const dec = await educationalDecrypt(
      enc.encryptedPixels,
      width,
      height,
      key,
      enc.salt,
      enc.iv,
      enc.integrityTag
    );

    expect(dec.isValidKey).toBe(true);
    expect(dec.decryptedPixels).toEqual(pixels);
  });

  it('handles fully transparent and mixed opacity alpha pixels', async () => {
    const width = 3;
    const height = 3;
    const totalPixels = width * height;
    const pixels = new Uint8ClampedArray(totalPixels * 4);

    for (let i = 0; i < totalPixels; i++) {
      pixels[i * 4] = 255;
      pixels[i * 4 + 1] = 0;
      pixels[i * 4 + 2] = 128;
      pixels[i * 4 + 3] = i === 0 ? 0 : i === 1 ? 128 : 255;
    }

    const key = 'AlphaTransparentKey';
    const enc = await educationalEncrypt(pixels, width, height, key);
    const dec = await educationalDecrypt(
      enc.encryptedPixels,
      width,
      height,
      key,
      enc.salt,
      enc.iv,
      enc.integrityTag
    );

    expect(dec.isValidKey).toBe(true);
    expect(dec.decryptedPixels[3]).toBe(0);
    expect(dec.decryptedPixels[7]).toBe(128);
    expect(dec.decryptedPixels).toEqual(pixels);
  });

  it('rejects tampered educational ciphertext via HMAC failure', async () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(200);

    const key = 'TamperTestKey';
    const enc = await educationalEncrypt(pixels, width, height, key);

    // Tamper with 1 byte in the encrypted pixel array
    const tamperedPixels = new Uint8ClampedArray(enc.encryptedPixels);
    tamperedPixels[0] ^= 0x01;

    const dec = await educationalDecrypt(
      tamperedPixels,
      width,
      height,
      key,
      enc.salt,
      enc.iv,
      enc.integrityTag
    );

    expect(dec.isValidKey).toBe(false);
  });
});

describe('Secure AES-256-GCM Mode', () => {
  it('performs authenticated encryption and decryption round-trip', async () => {
    const data = new TextEncoder().encode('PixelCrypt Confidential Image Payload');
    const password = 'SuperSecurePassphrase_2026!';

    const enc = await aesGcmEncrypt(data, password);
    expect(enc.ciphertext).toBeDefined();
    expect(enc.ciphertext).not.toEqual(data);

    const dec = await aesGcmDecrypt(enc.ciphertext, password, enc.salt, enc.iv);
    expect(dec.plaintext).toEqual(data);
  });

  it('rejects decryption with an incorrect key', async () => {
    const data = new TextEncoder().encode('Sensitive Payload');
    const enc = await aesGcmEncrypt(data, 'Key1');

    await expect(
      aesGcmDecrypt(enc.ciphertext, 'WrongKey2', enc.salt, enc.iv)
    ).rejects.toThrow(/Authentication tag mismatch/);
  });

  it('rejects tampered ciphertext', async () => {
    const data = new TextEncoder().encode('Tamper Proof Data');
    const enc = await aesGcmEncrypt(data, 'ValidKey');

    // Tamper with 1 byte in ciphertext
    const tampered = new Uint8Array(enc.ciphertext);
    tampered[5] ^= 0xff;

    await expect(
      aesGcmDecrypt(tampered, 'ValidKey', enc.salt, enc.iv)
    ).rejects.toThrow(/Authentication tag mismatch/);
  });

  it('rejects empty password in AES-GCM encryption and decryption', async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    await expect(aesGcmEncrypt(data, '')).rejects.toThrow(/cannot be empty/);
    await expect(aesGcmDecrypt(data, '', new Uint8Array(16), new Uint8Array(12))).rejects.toThrow(/cannot be empty/);
  });

  it('safely rejects corrupted or non-string base64 decoding', () => {
    expect(() => base64ToBytes('not-valid-base64!!@@')).toThrow(/Invalid Base64 encoding/);
    expect(() => base64ToBytes(null as any)).toThrow(/Expected a string/);
  });
});
