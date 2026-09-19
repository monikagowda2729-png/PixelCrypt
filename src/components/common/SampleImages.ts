/**
 * Generates synthetic test images on-the-fly using HTML5 Canvas.
 * Provides immediate zero-click testing samples for demonstrations and viva presentations.
 */

export interface SampleImageOption {
  id: string;
  name: string;
  description: string;
  generate: () => File;
}

export function createTestPatternFile(type: 'cyber' | 'gradient' | 'checkerboard', width = 128, height = 128): File {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (type === 'cyber') {
    // Cyber shield / badge pattern
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#0e7490');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glowing core
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();

    // Inner symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(width / 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PX', width / 2, height / 2);
  } else if (type === 'gradient') {
    // Multi-color gradient
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = `rgb(${Math.floor((x / width) * 255)}, ${Math.floor((y / height) * 255)}, 180)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else {
    // High-contrast geometric checkerboard
    const tileSize = 16;
    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#10b981' : '#1e1b4b';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }

  // Convert canvas to data URL then Blob/File
  const dataUrl = canvas.toDataURL('image/png');
  const binStr = atob(dataUrl.split(',')[1]);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }

  const blob = new Blob([arr], { type: 'image/png' });
  return new File([blob], `sample_${type}_${width}x${height}.png`, { type: 'image/png' });
}
