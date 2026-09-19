export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: 'image' | 'container';
}

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_IMAGE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_DIMENSION = 8192; // 8K resolution max
const MIN_DIMENSION = 2;

/**
 * Sanitize a filename to prevent path traversal or unsafe characters.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_image.png';
  }
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.length > 0 ? sanitized : 'unnamed_image.png';
}

/**
 * Validate an uploaded file (either an image or a .pixelcrypt container).
 */
export function validateFile(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'File is empty (0 bytes).' };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit (25 MB) to prevent browser memory exhaustion.`,
    };
  }

  const nameLower = file.name.toLowerCase();

  // Check if .pixelcrypt container
  if (nameLower.endsWith('.pixelcrypt')) {
    return { isValid: true, detectedType: 'container' };
  }

  // Check image mime types or extensions
  const isImageExt = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.webp');
  const isImageMime = SUPPORTED_IMAGE_MIMES.has(file.type);

  if (isImageExt || isImageMime) {
    return { isValid: true, detectedType: 'image' };
  }

  return {
    isValid: false,
    error: `Unsupported file format "${file.name}". Supported formats: PNG, JPEG, WebP, or .pixelcrypt container.`,
  };
}

/**
 * Validate extracted image dimensions.
 */
export function validateDimensions(width: number, height: number): ValidationResult {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return {
      isValid: false,
      error: 'Image dimensions must be valid integers.',
    };
  }

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return {
      isValid: false,
      error: `Image dimensions (${width}x${height}) are too small. Minimum supported is ${MIN_DIMENSION}x${MIN_DIMENSION}.`,
    };
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      isValid: false,
      error: `Image dimensions (${width}x${height}) exceed the browser memory limit of ${MAX_DIMENSION}x${MAX_DIMENSION}.`,
    };
  }

  return { isValid: true };
}
