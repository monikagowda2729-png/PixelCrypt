import type { PixelCryptContainer, PixelCryptHeader } from '../../types/crypto';

const MAGIC_BYTES = new Uint8Array([0x50, 0x49, 0x58, 0x45, 0x4c, 0x43, 0x52, 0x59, 0x50, 0x54]); // "PIXELCRYPT"
const CURRENT_VERSION = 1;

/**
 * Serialize a PixelCrypt container (header + binary payload) into a single binary Uint8Array.
 */
export function packContainer(container: PixelCryptContainer): Uint8Array {
  const headerJson = JSON.stringify(container.header);
  const headerBytes = new TextEncoder().encode(headerJson);
  const headerLength = headerBytes.byteLength;

  const totalLength =
    MAGIC_BYTES.length + // 10 bytes
    2 + // 2 bytes version (Uint16)
    4 + // 4 bytes header length (Uint32)
    headerLength +
    container.payload.byteLength;

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // 1. Write Magic Bytes (10 bytes)
  buffer.set(MAGIC_BYTES, 0);

  // 2. Write Version (Uint16BE at offset 10)
  view.setUint16(10, CURRENT_VERSION, false);

  // 3. Write Header Length (Uint32BE at offset 12)
  view.setUint32(12, headerLength, false);

  // 4. Write Header UTF-8 Bytes (offset 16)
  buffer.set(headerBytes, 16);

  // 5. Write Payload Bytes
  const payloadOffset = 16 + headerLength;
  buffer.set(container.payload, payloadOffset);

  return buffer;
}

/**
 * Unpack a binary .pixelcrypt buffer into a structured container.
 * Performs rigorous header and magic byte validation.
 */
export function unpackContainer(buffer: Uint8Array): PixelCryptContainer {
  if (buffer.byteLength < 16) {
    throw new Error('Invalid PixelCrypt file: File is too small to contain valid container headers.');
  }

  if (buffer.byteLength > 25 * 1024 * 1024) {
    throw new Error('Invalid PixelCrypt file: Container exceeds maximum allowed limit of 25MB.');
  }

  // 1. Verify Magic Bytes
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (buffer[i] !== MAGIC_BYTES[i]) {
      throw new Error('Invalid PixelCrypt file: Magic header identifier mismatch. This is not a valid .pixelcrypt file.');
    }
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // 2. Read Version
  const version = view.getUint16(10, false);
  if (version !== CURRENT_VERSION) {
    throw new Error(`Unsupported PixelCrypt version: v${version}. This application supports v${CURRENT_VERSION}.`);
  }

  // 3. Read Header Length
  const headerLength = view.getUint32(12, false);
  if (headerLength === 0) {
    throw new Error('Corrupted PixelCrypt file: Header metadata length cannot be zero.');
  }
  if (headerLength > 65536) {
    throw new Error('Corrupted PixelCrypt file: Header length exceeds maximum metadata limit of 64KB.');
  }
  if (16 + headerLength > buffer.byteLength) {
    throw new Error('Corrupted PixelCrypt file: Header length exceeds file size.');
  }

  // 4. Parse Header JSON
  const headerBytes = buffer.subarray(16, 16 + headerLength);
  const headerJson = new TextDecoder().decode(headerBytes);
  let header: PixelCryptHeader;
  try {
    header = JSON.parse(headerJson) as PixelCryptHeader;
  } catch {
    throw new Error('Corrupted PixelCrypt file: Malformed JSON header metadata.');
  }

  if (header.magic !== 'PIXELCRYPT') {
    throw new Error('Invalid PixelCrypt file: Corrupted header metadata structure.');
  }

  if (header.mode !== 'educational-pixel' && header.mode !== 'secure-aes-gcm') {
    throw new Error('Invalid PixelCrypt file: Unsupported or invalid encryption mode declared in header.');
  }

  if (
    !Number.isInteger(header.width) ||
    !Number.isInteger(header.height) ||
    header.width < 2 ||
    header.height < 2 ||
    header.width > 8192 ||
    header.height > 8192
  ) {
    throw new Error('Invalid PixelCrypt file: Declared raster dimensions are outside safe boundaries (2-8192px).');
  }

  if (typeof header.salt !== 'string' || header.salt.length === 0 || typeof header.iv !== 'string' || header.iv.length === 0) {
    throw new Error('Corrupted PixelCrypt file: Cryptographic salt or IV metadata is missing.');
  }

  if (typeof header.integrityTag !== 'string' || header.integrityTag.length === 0) {
    throw new Error('Corrupted PixelCrypt file: Integrity authentication tag metadata is missing.');
  }

  // 5. Extract Payload
  const payloadOffset = 16 + headerLength;
  const payload = buffer.subarray(payloadOffset);

  return {
    header,
    payload,
  };
}

/**
 * Trigger browser file download of a Uint8Array or Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
