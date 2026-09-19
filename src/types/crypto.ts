export type EncryptionMode = 'educational-pixel' | 'secure-aes-gcm';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface PixelCryptHeader {
  magic: 'PIXELCRYPT';
  version: number;
  mode: EncryptionMode;
  mimeType: string;
  width: number;
  height: number;
  channels: number;
  salt: string; // Base64 encoded 16 bytes
  iv: string; // Base64 encoded 12 bytes
  integrityTag: string; // Base64 encoded HMAC-SHA256 or GCM auth tag
  createdAt: string;
  metadata?: {
    originalSize?: number;
    filename?: string;
    preservedAlpha?: boolean;
    educationalNotes?: string;
  };
}

export interface PixelCryptContainer {
  header: PixelCryptHeader;
  payload: Uint8Array;
}

export interface KeyStrengthInfo {
  score: number; // 0 - 100
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Cryptographic';
  entropyBits: number;
  feedback: string[];
}
