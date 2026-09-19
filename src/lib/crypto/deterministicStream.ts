/**
 * Deterministic Key-Derived Keystream & Permutation Generator
 * Based on the ChaCha20 stream cipher specification (RFC 8439 / RFC 7539).
 * 
 * Satisfies Requirement 6: A mathematically rigorous, cryptographically standard
 * deterministic construction for educational pixel permutation, modular transforms,
 * and keystream diffusion, avoiding insecure non-cryptographic PRNGs like Mulberry32.
 */

export class DeterministicKeystream {
  private key: Uint32Array; // 8 x 32-bit words (256 bits)
  private nonce: Uint32Array; // 3 x 32-bit words (96 bits)
  private counter: number; // 32-bit block counter
  private buffer: Uint8Array;
  private bufferIndex: number;

  /**
   * Initialize keystream generator with a 32-byte key and 12-byte nonce.
   */
  constructor(keyBytes: Uint8Array, nonceBytes: Uint8Array) {
    if (keyBytes.length !== 32) {
      throw new Error(`ChaCha20 requires a 32-byte key (received ${keyBytes.length} bytes)`);
    }
    if (nonceBytes.length !== 12) {
      throw new Error(`ChaCha20 requires a 12-byte nonce (received ${nonceBytes.length} bytes)`);
    }

    this.key = new Uint32Array(8);
    for (let i = 0; i < 8; i++) {
      this.key[i] =
        keyBytes[i * 4] |
        (keyBytes[i * 4 + 1] << 8) |
        (keyBytes[i * 4 + 2] << 16) |
        (keyBytes[i * 4 + 3] << 24);
    }

    this.nonce = new Uint32Array(3);
    for (let i = 0; i < 3; i++) {
      this.nonce[i] =
        nonceBytes[i * 4] |
        (nonceBytes[i * 4 + 1] << 8) |
        (nonceBytes[i * 4 + 2] << 16) |
        (nonceBytes[i * 4 + 3] << 24);
    }

    this.counter = 0;
    this.buffer = new Uint8Array(64);
    this.bufferIndex = 64; // Force generation on first read
  }

  /**
   * ChaCha quarter round operation.
   */
  private static quarterRound(x: Uint32Array, a: number, b: number, c: number, d: number): void {
    x[a] = (x[a] + x[b]) >>> 0;
    x[d] ^= x[a];
    x[d] = ((x[d] << 16) | (x[d] >>> 16)) >>> 0;

    x[c] = (x[c] + x[d]) >>> 0;
    x[b] ^= x[c];
    x[b] = ((x[b] << 12) | (x[b] >>> 20)) >>> 0;

    x[a] = (x[a] + x[b]) >>> 0;
    x[d] ^= x[a];
    x[d] = ((x[d] << 8) | (x[d] >>> 24)) >>> 0;

    x[c] = (x[c] + x[d]) >>> 0;
    x[b] ^= x[c];
    x[b] = ((x[b] << 7) | (x[b] >>> 25)) >>> 0;
  }

  /**
   * Generate next 64-byte block using ChaCha20 core.
   */
  private generateBlock(): void {
    const state = new Uint32Array(16);
    // Constants "expand 32-byte k"
    state[0] = 0x61707865;
    state[1] = 0x3320646e;
    state[2] = 0x79622d32;
    state[3] = 0x6b206574;

    // Key (words 4-11)
    for (let i = 0; i < 8; i++) {
      state[4 + i] = this.key[i];
    }

    // Counter (word 12)
    state[12] = this.counter >>> 0;
    this.counter = (this.counter + 1) >>> 0;

    // Nonce (words 13-15)
    state[13] = this.nonce[0];
    state[14] = this.nonce[1];
    state[15] = this.nonce[2];

    const workingState = new Uint32Array(state);

    // 20 rounds (10 column rounds + 10 diagonal rounds)
    for (let i = 0; i < 10; i++) {
      // Column round
      DeterministicKeystream.quarterRound(workingState, 0, 4, 8, 12);
      DeterministicKeystream.quarterRound(workingState, 1, 5, 9, 13);
      DeterministicKeystream.quarterRound(workingState, 2, 6, 10, 14);
      DeterministicKeystream.quarterRound(workingState, 3, 7, 11, 15);

      // Diagonal round
      DeterministicKeystream.quarterRound(workingState, 0, 5, 10, 15);
      DeterministicKeystream.quarterRound(workingState, 1, 6, 11, 12);
      DeterministicKeystream.quarterRound(workingState, 2, 7, 8, 13);
      DeterministicKeystream.quarterRound(workingState, 3, 4, 9, 14);
    }

    // Add initial state to working state and write to buffer
    for (let i = 0; i < 16; i++) {
      const val = (workingState[i] + state[i]) >>> 0;
      this.buffer[i * 4] = val & 0xff;
      this.buffer[i * 4 + 1] = (val >>> 8) & 0xff;
      this.buffer[i * 4 + 2] = (val >>> 16) & 0xff;
      this.buffer[i * 4 + 3] = (val >>> 24) & 0xff;
    }

    this.bufferIndex = 0;
  }

  /**
   * Get next byte from the deterministic keystream.
   */
  public nextByte(): number {
    if (this.bufferIndex >= 64) {
      this.generateBlock();
    }
    return this.buffer[this.bufferIndex++];
  }

  /**
   * Fill a byte array with deterministic keystream bytes.
   */
  public getBytes(length: number): Uint8Array {
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.nextByte();
    }
    return result;
  }

  /**
   * Get a 32-bit unsigned integer from keystream.
   */
  public nextUint32(): number {
    const b0 = this.nextByte();
    const b1 = this.nextByte();
    const b2 = this.nextByte();
    const b3 = this.nextByte();
    return ((b3 << 24) | (b2 << 16) | (b1 << 8) | b0) >>> 0;
  }

  /**
   * Generate an unbiased random integer in the range [0, maxExcluded - 1]
   * using rejection sampling to eliminate modulo bias.
   */
  public nextInt(maxExcluded: number): number {
    if (maxExcluded <= 1) return 0;
    const maxUint32 = 0xffffffff;
    const limit = maxUint32 - (maxUint32 % maxExcluded);
    let sample: number;
    do {
      sample = this.nextUint32();
    } while (sample >= limit);

    return sample % maxExcluded;
  }

  /**
   * Generate a deterministic permutation of array [0, 1, ..., n - 1]
   * using the Fisher-Yates shuffle with unbiased rejection sampling.
   */
  public generatePermutation(n: number): Uint32Array {
    const perm = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      perm[i] = i;
    }

    for (let i = n - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      const temp = perm[i];
      perm[i] = perm[j];
      perm[j] = temp;
    }

    return perm;
  }

  /**
   * Compute the inverse permutation of P such that invP[P[i]] = i.
   */
  public static invertPermutation(perm: Uint32Array): Uint32Array {
    const n = perm.length;
    const inv = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      inv[perm[i]] = i;
    }
    return inv;
  }
}
