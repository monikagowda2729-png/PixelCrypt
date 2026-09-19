/**
 * Standardized Secure Mode: AES-256-GCM Authenticated Encryption
 * Uses browser-native Web Crypto API (crypto.subtle).
 * 
 * Complies with modern cryptographic standards:
 * - PBKDF2-HMAC-SHA256 (100,000 iterations) for key stretching
 * - 256-bit AES key in Galois/Counter Mode (GCM)
 * - 96-bit (12-byte) cryptographically secure random IV per encryption
 * - 128-bit authentication tag (integrity & authenticity verification)
 */

export interface AesGcmEncryptResult {
  ciphertext: Uint8Array;
  salt: Uint8Array;
  iv: Uint8Array;
  executionTimeMs: number;
}

export interface AesGcmDecryptResult {
  plaintext: Uint8Array;
  executionTimeMs: number;
}

/**
 * Derive an AES-GCM 256-bit CryptoKey from a user password/key and salt.
 */
export async function deriveAesGcmKey(
  passwordOrKey: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  if (!passwordOrKey || passwordOrKey.trim().length === 0) {
    throw new Error('Key derivation failed: Password or encryption key cannot be empty.');
  }
  if (!salt || salt.byteLength !== 16) {
    throw new Error('Key derivation failed: Salt must be a 128-bit (16-byte) buffer.');
  }

  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passwordOrKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary binary payload (e.g. raw image bytes or pixel array) with AES-256-GCM.
 */
export async function aesGcmEncrypt(
  data: Uint8Array,
  passwordOrKey: string,
  providedSalt?: Uint8Array,
  providedIv?: Uint8Array
): Promise<AesGcmEncryptResult> {
  const startTime = performance.now();

  if (!data || data.byteLength === 0) {
    throw new Error('AES-GCM Encryption failed: Payload data cannot be empty.');
  }
  if (!passwordOrKey || passwordOrKey.trim().length === 0) {
    throw new Error('AES-GCM Encryption failed: Password or encryption key cannot be empty.');
  }

  const salt = providedSalt || crypto.getRandomValues(new Uint8Array(16));
  const iv = providedIv || crypto.getRandomValues(new Uint8Array(12));

  if (salt.byteLength !== 16) {
    throw new Error('AES-GCM Encryption failed: Salt must be exactly 16 bytes.');
  }
  if (iv.byteLength !== 12) {
    throw new Error('AES-GCM Encryption failed: Initialization vector (IV) must be exactly 12 bytes.');
  }

  const key = await deriveAesGcmKey(passwordOrKey, salt, 100000);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128, // 16 bytes tag
    },
    key,
    data as BufferSource
  );

  const executionTimeMs = performance.now() - startTime;

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    salt,
    iv,
    executionTimeMs,
  };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Automatically verifies the 128-bit authentication tag.
 * Throws an explicit error if the key is incorrect or data was tampered with.
 */
export async function aesGcmDecrypt(
  ciphertext: Uint8Array,
  passwordOrKey: string,
  salt: Uint8Array,
  iv: Uint8Array
): Promise<AesGcmDecryptResult> {
  const startTime = performance.now();

  if (!passwordOrKey || passwordOrKey.trim().length === 0) {
    throw new Error('AES-GCM Decryption failed: Password or key cannot be empty.');
  }
  if (!salt || salt.byteLength !== 16) {
    throw new Error('AES-GCM Decryption failed: Invalid salt length (expected 16 bytes).');
  }
  if (!iv || iv.byteLength !== 12) {
    throw new Error('AES-GCM Decryption failed: Invalid IV length (expected 12 bytes).');
  }
  if (!ciphertext || ciphertext.byteLength < 16) {
    throw new Error('AES-GCM Decryption failed: Ciphertext is too short to contain an authentication tag.');
  }

  const key = await deriveAesGcmKey(passwordOrKey, salt, 100000);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        tagLength: 128,
      },
      key,
      ciphertext as BufferSource
    );

    const executionTimeMs = performance.now() - startTime;

    return {
      plaintext: new Uint8Array(plaintextBuffer),
      executionTimeMs,
    };
  } catch {
    throw new Error(
      'AES-GCM Decryption failed: Authentication tag mismatch. Either the key is incorrect or the ciphertext was tampered with.'
    );
  }
}
