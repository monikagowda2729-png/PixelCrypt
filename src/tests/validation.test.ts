import { describe, it, expect } from 'vitest';
import { validateFile, validateDimensions, sanitizeFilename } from '../lib/image/validation';

describe('File and Dimension Validation', () => {
  it('rejects empty files (0 bytes)', () => {
    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    const res = validateFile(emptyFile);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/empty/i);
  });

  it('rejects unsupported file formats', () => {
    const exeFile = new File([new Uint8Array(100)], 'malware.exe', { type: 'application/x-msdownload' });
    const res = validateFile(exeFile);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/unsupported file format/i);
  });

  it('accepts valid PNG, JPEG, and WebP files', () => {
    const png = new File([new Uint8Array(100)], 'photo.png', { type: 'image/png' });
    const jpg = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' });
    const webp = new File([new Uint8Array(100)], 'photo.webp', { type: 'image/webp' });

    expect(validateFile(png).isValid).toBe(true);
    expect(validateFile(png).detectedType).toBe('image');

    expect(validateFile(jpg).isValid).toBe(true);
    expect(validateFile(jpg).detectedType).toBe('image');

    expect(validateFile(webp).isValid).toBe(true);
    expect(validateFile(webp).detectedType).toBe('image');
  });

  it('accepts .pixelcrypt container files', () => {
    const container = new File([new Uint8Array(100)], 'secret.pixelcrypt', { type: 'application/octet-stream' });
    const res = validateFile(container);
    expect(res.isValid).toBe(true);
    expect(res.detectedType).toBe('container');
  });

  it('validates image dimension bounds correctly', () => {
    // Too small (< 2x2)
    expect(validateDimensions(1, 1).isValid).toBe(false);

    // Valid dimensions
    expect(validateDimensions(1920, 1080).isValid).toBe(true);

    // Too large (> 8192)
    expect(validateDimensions(10000, 10000).isValid).toBe(false);
    // Non-integer dimensions
    expect(validateDimensions(100.5, 200).isValid).toBe(false);
  });

  it('sanitizes unsafe filenames to prevent path traversal', () => {
    expect(sanitizeFilename('../../../etc/passwd.png')).toBe('.._.._.._etc_passwd.png');
    expect(sanitizeFilename('test<script>alert(1)</script>.png')).toBe('test_script_alert_1___script_.png');
    expect(sanitizeFilename('')).toBe('unnamed_image.png');
  });
});
