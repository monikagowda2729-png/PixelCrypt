import { deriveKeyMaterial, deriveHmacKey, computeHmac, verifyHmac, bytesToBase64, base64ToBytes } from './keyDerivation';
import { DeterministicKeystream } from './deterministicStream';

export interface EducationalEncryptResult {
  encryptedPixels: Uint8ClampedArray;
  salt: Uint8Array;
  iv: Uint8Array;
  integrityTag: string; // Base64 HMAC-SHA256 of original plaintext
  executionTimeMs: number;
}

export interface EducationalDecryptResult {
  decryptedPixels: Uint8ClampedArray;
  isValidKey: boolean;
  executionTimeMs: number;
}

/**
 * Educational Pixel Mode Encryption
 * 
 * Satisfies the cybersecurity internship requirement:
 * "Develop a simple image encryption tool using pixel manipulation.
 * Support operations like swapping pixel values or applying a basic mathematical operation to each pixel."
 * 
 * Pipeline:
 * 1. Key Derivation: Derive 32-byte master key + 12-byte nonce from user key & 16-byte random salt via PBKDF2-SHA256
 * 2. Integrity Tag: Compute HMAC-SHA256 of original plaintext for reliable wrong-key / corruption detection
 * 3. Spatial Permutation: Fisher-Yates shuffle of pixel positions derived from ChaCha20 DRBG (confounds spatial correlation)
 * 4. Modular Mathematical Operation: C'(i) = (C(i) + M_i) mod 256
 * 5. Keystream Diffusion: C''(i) = C'(i) XOR X_i
 * 
 * Preserves alpha channel to prevent canvas alpha-premultiplication loss in browser export.
 */
export async function educationalEncrypt(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  key: string,
  providedSalt?: Uint8Array,
  providedIv?: Uint8Array
): Promise<EducationalEncryptResult> {
  const startTime = performance.now();

  if (!key || key.trim().length === 0) {
    throw new Error('Educational encryption failed: Key cannot be empty.');
  }

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    width > 8192 ||
    height > 8192
  ) {
    throw new Error(`Educational encryption failed: Dimensions (${width}x${height}) must be integers between 2 and 8192.`);
  }

  const totalPixels = width * height;

  if (pixels.length !== totalPixels * 4) {
    throw new Error(`Pixel array length (${pixels.length}) does not match dimensions (${width}x${height}x4 = ${totalPixels * 4})`);
  }

  // 1. Generate or use provided cryptographically secure random salt (16 bytes) and IV (12 bytes)
  const salt = providedSalt || crypto.getRandomValues(new Uint8Array(16));
  const iv = providedIv || crypto.getRandomValues(new Uint8Array(12));

  if (salt.byteLength !== 16) {
    throw new Error('Educational encryption failed: Salt must be exactly 16 bytes.');
  }
  if (iv.byteLength !== 12) {
    throw new Error('Educational encryption failed: IV must be exactly 12 bytes.');
  }

  // 2. Derive deterministic key material and HMAC authentication key
  const keyBytes = await deriveKeyMaterial(key, salt, 100000, 256);
  const hmacKey = await deriveHmacKey(key, salt, 100000);

  // 3. Compute plaintext integrity tag before transformation
  // Convert pixels to a Uint8Array view for HMAC
  const plaintextBytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  const hmacTagBytes = await computeHmac(hmacKey, plaintextBytes);
  const integrityTag = bytesToBase64(hmacTagBytes);

  // 4. Initialize deterministic ChaCha20 keystream generator
  const stream = new DeterministicKeystream(keyBytes, iv);

  // 5. Generate deterministic permutation for all pixel coordinates [0 ... totalPixels - 1]
  const perm = stream.generatePermutation(totalPixels);

  // 6. Perform pixel permutation
  // perm[i] is the target destination for pixel i
  const permutedPixels = new Uint8ClampedArray(pixels.length);
  for (let srcIdx = 0; srcIdx < totalPixels; srcIdx++) {
    const dstIdx = perm[srcIdx];
    const srcByteOffset = srcIdx * 4;
    const dstByteOffset = dstIdx * 4;

    permutedPixels[dstByteOffset] = pixels[srcByteOffset]; // R
    permutedPixels[dstByteOffset + 1] = pixels[srcByteOffset + 1]; // G
    permutedPixels[dstByteOffset + 2] = pixels[srcByteOffset + 2]; // B
    permutedPixels[dstByteOffset + 3] = pixels[srcByteOffset + 3]; // A (preserved)
  }

  // 7. Apply modular mathematical transformation + keystream XOR diffusion on RGB channels
  const encryptedPixels = new Uint8ClampedArray(permutedPixels.length);
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;

    // Fetch key-derived modular shift bytes (0-255)
    const shiftR = stream.nextByte();
    const shiftG = stream.nextByte();
    const shiftB = stream.nextByte();

    // Fetch key-derived XOR diffusion bytes (0-255)
    const xorR = stream.nextByte();
    const xorG = stream.nextByte();
    const xorB = stream.nextByte();

    // Step A: Modular addition (mod 256)
    const modR = (permutedPixels[offset] + shiftR) & 0xff;
    const modG = (permutedPixels[offset + 1] + shiftG) & 0xff;
    const modB = (permutedPixels[offset + 2] + shiftB) & 0xff;

    // Step B: Keystream XOR
    encryptedPixels[offset] = (modR ^ xorR) & 0xff;
    encryptedPixels[offset + 1] = (modG ^ xorG) & 0xff;
    encryptedPixels[offset + 2] = (modB ^ xorB) & 0xff;
    encryptedPixels[offset + 3] = permutedPixels[offset + 3]; // Preserve Alpha
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    encryptedPixels,
    salt,
    iv,
    integrityTag,
    executionTimeMs,
  };
}

/**
 * Educational Pixel Mode Decryption
 * 
 * Inverts the transformation in strict reverse order:
 * 1. Invert Keystream XOR: C'(i) = C''(i) XOR X_i
 * 2. Invert Modular Addition: C(i) = (C'(i) - M_i + 256) mod 256
 * 3. Invert Spatial Permutation: Move pixels from P[i] back to i
 * 4. Verify Integrity Tag: Compare candidate plaintext HMAC against header tag
 */
export async function educationalDecrypt(
  encryptedPixels: Uint8ClampedArray,
  width: number,
  height: number,
  key: string,
  salt: Uint8Array,
  iv: Uint8Array,
  expectedIntegrityTag?: string
): Promise<EducationalDecryptResult> {
  const startTime = performance.now();

  if (!key || key.trim().length === 0) {
    throw new Error('Educational decryption failed: Key cannot be empty.');
  }

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 2 ||
    height < 2 ||
    width > 8192 ||
    height > 8192
  ) {
    throw new Error(`Educational decryption failed: Dimensions (${width}x${height}) must be integers between 2 and 8192.`);
  }

  if (!salt || salt.byteLength !== 16) {
    throw new Error('Educational decryption failed: Salt must be exactly 16 bytes.');
  }
  if (!iv || iv.byteLength !== 12) {
    throw new Error('Educational decryption failed: IV must be exactly 12 bytes.');
  }

  const totalPixels = width * height;

  if (encryptedPixels.length !== totalPixels * 4) {
    throw new Error(`Pixel array length (${encryptedPixels.length}) does not match dimensions (${width}x${height}x4 = ${totalPixels * 4})`);
  }

  // 1. Derive key material and HMAC key from user key and salt
  const keyBytes = await deriveKeyMaterial(key, salt, 100000, 256);
  const stream = new DeterministicKeystream(keyBytes, iv);

  // 2. Generate same deterministic permutation
  const perm = stream.generatePermutation(totalPixels);

  // 3. Invert Keystream XOR and Modular Addition to recover permuted pixels
  const unshiftedPixels = new Uint8ClampedArray(encryptedPixels.length);
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;

    const shiftR = stream.nextByte();
    const shiftG = stream.nextByte();
    const shiftB = stream.nextByte();

    const xorR = stream.nextByte();
    const xorG = stream.nextByte();
    const xorB = stream.nextByte();

    // Step A: Invert XOR
    const unXorR = (encryptedPixels[offset] ^ xorR) & 0xff;
    const unXorG = (encryptedPixels[offset + 1] ^ xorG) & 0xff;
    const unXorB = (encryptedPixels[offset + 2] ^ xorB) & 0xff;

    // Step B: Invert modular addition (mod 256)
    unshiftedPixels[offset] = (unXorR - shiftR + 256) & 0xff;
    unshiftedPixels[offset + 1] = (unXorG - shiftG + 256) & 0xff;
    unshiftedPixels[offset + 2] = (unXorB - shiftB + 256) & 0xff;
    unshiftedPixels[offset + 3] = encryptedPixels[offset + 3]; // Preserve Alpha
  }

  // 4. Invert Permutation: restore pixels to their original positions
  const decryptedPixels = new Uint8ClampedArray(unshiftedPixels.length);
  for (let dstIdx = 0; dstIdx < totalPixels; dstIdx++) {
    const srcIdx = perm[dstIdx]; // pixel currently at srcIdx belongs at dstIdx
    const srcOffset = srcIdx * 4;
    const dstOffset = dstIdx * 4;

    decryptedPixels[dstOffset] = unshiftedPixels[srcOffset];
    decryptedPixels[dstOffset + 1] = unshiftedPixels[srcOffset + 1];
    decryptedPixels[dstOffset + 2] = unshiftedPixels[srcOffset + 2];
    decryptedPixels[dstOffset + 3] = unshiftedPixels[srcOffset + 3];
  }

  // 5. Verify integrity tag if provided
  let isValidKey = true;
  if (expectedIntegrityTag) {
    try {
      const hmacKey = await deriveHmacKey(key, salt, 100000);
      const decryptedBytes = new Uint8Array(decryptedPixels.buffer, decryptedPixels.byteOffset, decryptedPixels.byteLength);
      const tagBytes = base64ToBytes(expectedIntegrityTag);
      isValidKey = await verifyHmac(hmacKey, tagBytes, decryptedBytes);
    } catch {
      isValidKey = false;
    }
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    decryptedPixels,
    isValidKey,
    executionTimeMs,
  };
}
