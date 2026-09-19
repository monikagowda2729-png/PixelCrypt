/**
 * Browser Canvas & ImageData Utilities
 * Ensures zero external server uploads and cleans up memory promptly.
 */

export interface LoadedImageInfo {
  img: HTMLImageElement;
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
}

/**
 * Load an HTMLImageElement from a browser File.
 */
export async function loadImageFromFile(file: File): Promise<LoadedImageInfo> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileSize: file.size,
        fileName: file.name,
        mimeType: file.type || 'image/png',
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file. The file may be corrupt or an unsupported format.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Extract raw ImageData from an HTMLImageElement using an offscreen canvas.
 */
export function extractImageData(img: HTMLImageElement): {
  imageData: ImageData;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not create 2D Canvas rendering context.');
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return { imageData, canvas, ctx };
}

/**
 * Convert ImageData or Uint8ClampedArray back to an HTMLCanvasElement.
 */
export function createExportCanvas(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to obtain canvas context for export.');
  }

  const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Convert ImageData to a PNG/JPEG/WebP Blob for export.
 */
export async function canvasToBlob(canvas: HTMLCanvasElement, mimeType = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob conversion failed.'));
      }
    }, mimeType);
  });
}

/**
 * Convert pixel array to a Data URL string for image preview.
 */
export function pixelsToDataUrl(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  mimeType = 'image/png'
): string {
  const canvas = createExportCanvas(pixels, width, height);
  return canvas.toDataURL(mimeType);
}

/**
 * Sample an NxN grid of pixels around the center for visual educational representation.
 */
export function samplePixelMatrix(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  gridSize = 4
): {
  matrix: Array<Array<{ r: number; g: number; b: number; a: number; x: number; y: number }>>;
  startX: number;
  startY: number;
} {
  const actualGrid = Math.min(gridSize, width, height);
  const startX = Math.max(0, Math.floor((width - actualGrid) / 2));
  const startY = Math.max(0, Math.floor((height - actualGrid) / 2));

  const matrix: Array<Array<{ r: number; g: number; b: number; a: number; x: number; y: number }>> = [];

  for (let r = 0; r < actualGrid; r++) {
    const row: Array<{ r: number; g: number; b: number; a: number; x: number; y: number }> = [];
    for (let c = 0; c < actualGrid; c++) {
      const curX = startX + c;
      const curY = startY + r;
      const offset = (curY * width + curX) * 4;
      row.push({
        r: pixels[offset],
        g: pixels[offset + 1],
        b: pixels[offset + 2],
        a: pixels[offset + 3],
        x: curX,
        y: curY,
      });
    }
    matrix.push(row);
  }

  return { matrix, startX, startY };
}
