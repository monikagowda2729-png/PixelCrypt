import { describe, it, expect } from 'vitest';
import { packContainer, unpackContainer } from '../lib/crypto/container';
import type { PixelCryptContainer } from '../types/crypto';

describe('.pixelcrypt Binary Container Format', () => {
  it('serializes and deserializes container preserving all headers and binary payload', () => {
    const originalContainer: PixelCryptContainer = {
      header: {
        magic: 'PIXELCRYPT',
        version: 1,
        mode: 'educational-pixel',
        mimeType: 'image/png',
        width: 1920,
        height: 1080,
        channels: 4,
        salt: 'AQIDBAUGBwgJCgsMDQ4PEA==',
        iv: 'ERITFBUWFxgZGhsc',
        integrityTag: 'dGVzdFRhZw==',
        createdAt: '2026-09-17T12:00:00.000Z',
        metadata: {
          originalSize: 102400,
          filename: 'confidential_blueprint.png',
        },
      },
      payload: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]),
    };

    const packedBytes = packContainer(originalContainer);
    expect(packedBytes).toBeInstanceOf(Uint8Array);
    expect(packedBytes.byteLength).toBeGreaterThan(originalContainer.payload.byteLength);

    const unpacked = unpackContainer(packedBytes);

    expect(unpacked.header.magic).toBe('PIXELCRYPT');
    expect(unpacked.header.version).toBe(1);
    expect(unpacked.header.mode).toBe('educational-pixel');
    expect(unpacked.header.width).toBe(1920);
    expect(unpacked.header.height).toBe(1080);
    expect(unpacked.header.metadata?.filename).toBe('confidential_blueprint.png');
    expect(unpacked.payload).toEqual(originalContainer.payload);
  });

  it('rejects files without PIXELCRYPT magic header', () => {
    const invalidBytes = new Uint8Array(50).fill(0x00);
    expect(() => unpackContainer(invalidBytes)).toThrow(/Magic header identifier mismatch/);
  });

  it('rejects truncated container data', () => {
    const tinyBytes = new Uint8Array(5);
    expect(() => unpackContainer(tinyBytes)).toThrow(/File is too small/);
  });

  it('rejects containers with unsupported future versions', () => {
    const originalContainer: PixelCryptContainer = {
      header: {
        magic: 'PIXELCRYPT',
        version: 1,
        mode: 'educational-pixel',
        mimeType: 'image/png',
        width: 10,
        height: 10,
        channels: 4,
        salt: 'AQIDBA==',
        iv: 'ERITFA==',
        integrityTag: 'dGVzdA==',
        createdAt: new Date().toISOString(),
      },
      payload: new Uint8Array([1, 2, 3]),
    };
    const packed = packContainer(originalContainer);
    // Modify version from 1 to 99 at bytes 10-11
    packed[10] = 0x00;
    packed[11] = 0x63; // version 99

    expect(() => unpackContainer(packed)).toThrow(/Unsupported PixelCrypt version/);
  });

  it('rejects corrupted container with malformed JSON header metadata', () => {
    const originalContainer: PixelCryptContainer = {
      header: {
        magic: 'PIXELCRYPT',
        version: 1,
        mode: 'educational-pixel',
        mimeType: 'image/png',
        width: 10,
        height: 10,
        channels: 4,
        salt: 'AQIDBA==',
        iv: 'ERITFA==',
        integrityTag: 'dGVzdA==',
        createdAt: new Date().toISOString(),
      },
      payload: new Uint8Array([1, 2, 3]),
    };
    const packed = packContainer(originalContainer);
    // Corrupt JSON characters at offset 16
    packed[16] = 0xff;
    packed[17] = 0xff;

    expect(() => unpackContainer(packed)).toThrow(/Malformed JSON header metadata/);
  });

  it('rejects container with oversized declared header length (> 64KB)', () => {
    const validBytes = packContainer({
      header: {
        magic: 'PIXELCRYPT',
        version: 1,
        mode: 'educational-pixel',
        mimeType: 'image/png',
        width: 10,
        height: 10,
        channels: 4,
        salt: 'AQIDBA==',
        iv: 'ERITFA==',
        integrityTag: 'dGVzdA==',
        createdAt: new Date().toISOString(),
      },
      payload: new Uint8Array([1, 2, 3]),
    });
    const tampered = new Uint8Array(validBytes);
    const view = new DataView(tampered.buffer);
    view.setUint32(12, 70000, false); // 70KB > 64KB limit

    expect(() => unpackContainer(tampered)).toThrow(/maximum metadata limit/);
  });

  it('rejects container declaring unsupported encryption mode', () => {
    const invalidModeContainer = {
      header: {
        magic: 'PIXELCRYPT' as const,
        version: 1,
        mode: 'unsupported-cipher' as any,
        mimeType: 'image/png',
        width: 10,
        height: 10,
        channels: 4,
        salt: 'AQIDBA==',
        iv: 'ERITFA==',
        integrityTag: 'dGVzdA==',
        createdAt: new Date().toISOString(),
      },
      payload: new Uint8Array([1, 2, 3]),
    };
    const packed = packContainer(invalidModeContainer);
    expect(() => unpackContainer(packed)).toThrow(/Unsupported or invalid encryption mode/);
  });

  it('rejects container declaring unsafe or non-integer dimensions', () => {
    const invalidDimContainer = {
      header: {
        magic: 'PIXELCRYPT' as const,
        version: 1,
        mode: 'educational-pixel' as const,
        mimeType: 'image/png',
        width: 99999, // exceeds 8192
        height: 10,
        channels: 4,
        salt: 'AQIDBA==',
        iv: 'ERITFA==',
        integrityTag: 'dGVzdA==',
        createdAt: new Date().toISOString(),
      },
      payload: new Uint8Array([1, 2, 3]),
    };
    const packed = packContainer(invalidDimContainer);
    expect(() => unpackContainer(packed)).toThrow(/Declared raster dimensions are outside safe boundaries/);
  });
});
