import type { KeyStrengthInfo } from '../../types/crypto';

/**
 * Generate a cryptographically secure random key.
 * Uses Web Crypto API crypto.getRandomValues().
 * @param byteLength Number of random bytes (default 32 = 256 bits)
 * @returns Hex string representation of the key
 */
export function generateRandomKey(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a Uint8Array to a Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a Base64 string to a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof base64 !== 'string') {
    throw new Error('Invalid Base64 input: Expected a string.');
  }
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new Error('Invalid Base64 encoding: String contains invalid characters or corrupted padding.');
  }
}

/**
 * Convert a UTF-8 string to a Uint8Array.
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Evaluate key strength based on Shannon entropy, length, and character pool.
 */
export function evaluateKeyStrength(key: string): KeyStrengthInfo {
  if (!key || key.length === 0) {
    return {
      score: 0,
      label: 'Very Weak',
      entropyBits: 0,
      feedback: ['Key cannot be empty.'],
    };
  }

  const feedback: string[] = [];
  let poolSize = 0;
  if (/[a-z]/.test(key)) poolSize += 26;
  if (/[A-Z]/.test(key)) poolSize += 26;
  if (/[0-9]/.test(key)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(key)) poolSize += 32;

  // Approximate information entropy: L * log2(poolSize)
  const entropyBits = Math.round(key.length * (poolSize > 0 ? Math.log2(poolSize) : 0));

  let score = 0;
  if (key.length >= 8) score += 20;
  if (key.length >= 16) score += 20;
  if (key.length >= 32) score += 20;
  if (/[a-z]/.test(key) && /[A-Z]/.test(key)) score += 15;
  if (/[0-9]/.test(key)) score += 10;
  if (/[^a-zA-Z0-9]/.test(key)) score += 15;

  score = Math.min(100, score);

  let label: KeyStrengthInfo['label'] = 'Very Weak';
  if (score >= 85 || entropyBits >= 128) {
    label = 'Cryptographic';
  } else if (score >= 70 || entropyBits >= 80) {
    label = 'Strong';
  } else if (score >= 50) {
    label = 'Fair';
  } else if (score >= 30) {
    label = 'Weak';
  }

  if (key.length < 12) {
    feedback.push('Recommendation: Use at least 16 characters or a 256-bit generated key.');
  }
  if (!/[^a-zA-Z0-9]/.test(key) && key.length < 32) {
    feedback.push('Adding special characters or using a hex key increases entropy.');
  }

  return {
    score,
    label,
    entropyBits,
    feedback,
  };
}

/**
 * Derive raw key material using PBKDF2-HMAC-SHA256 via Web Crypto API.
 * Uses 100,000 iterations to resist brute-force/dictionary search.
 */
export async function deriveKeyMaterial(
  passwordOrKey: string,
  salt: Uint8Array,
  iterations = 100000,
  derivedBitsLength = 256
): Promise<Uint8Array> {
  if (!passwordOrKey || passwordOrKey.length === 0) {
    throw new Error('Key derivation failed: Password or encryption key cannot be empty.');
  }
  if (!salt || salt.byteLength !== 16) {
    throw new Error('Key derivation failed: Salt must be a 128-bit (16-byte) buffer.');
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passwordOrKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    derivedBitsLength
  );

  return new Uint8Array(derivedBits);
}

/**
 * Derive an HMAC-SHA256 CryptoKey for integrity authentication.
 */
export async function deriveHmacKey(
  passwordOrKey: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  if (!passwordOrKey || passwordOrKey.length === 0) {
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
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256,
    },
    false,
    ['sign', 'verify']
  );
}

/**
 * Calculate HMAC-SHA256 authentication tag for data integrity.
 */
export async function computeHmac(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign('HMAC', key, data as BufferSource);
  return new Uint8Array(signature);
}

/**
 * Verify HMAC-SHA256 tag in constant time.
 */
export async function verifyHmac(key: CryptoKey, tag: Uint8Array, data: Uint8Array): Promise<boolean> {
  return crypto.subtle.verify('HMAC', key, tag as BufferSource, data as BufferSource);
}
