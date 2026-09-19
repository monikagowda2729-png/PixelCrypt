import React, { useState } from 'react';
import { Unlock, CheckCircle2, XCircle, Download, ShieldCheck } from 'lucide-react';
import { Dropzone } from '../common/Dropzone';
import { KeyInput } from '../common/KeyInput';
import { ImageCompare } from '../comparison/ImageCompare';
import type { PixelCryptContainer } from '../../types/crypto';
import { unpackContainer, downloadBlob } from '../../lib/crypto/container';
import { educationalDecrypt } from '../../lib/crypto/educational';
import { aesGcmDecrypt } from '../../lib/crypto/aesGcm';
import { base64ToBytes } from '../../lib/crypto/keyDerivation';
import { loadImageFromFile, extractImageData, pixelsToDataUrl, createExportCanvas, canvasToBlob } from '../../lib/image/canvasUtils';

interface DecryptWorkspaceProps {
  initialKey?: string;
  initialContainer?: PixelCryptContainer | null;
  initialPackedBytes?: Uint8Array | null;
  cachedOriginalDataUrl?: string | null;
  onDecryptionComplete?: (info: { mode: string; success: boolean; error?: string }) => void;
}

export const DecryptWorkspace: React.FC<DecryptWorkspaceProps> = ({
  initialKey = '',
  initialContainer = null,
  initialPackedBytes: _initialPackedBytes = null,
  cachedOriginalDataUrl = null,
  onDecryptionComplete,
}) => {
  const [, setUploadedFile] = useState<File | null>(null);

  // Sync state with incoming props during render
  const [prevInitialKey, setPrevInitialKey] = useState(initialKey);
  const [key, setKey] = useState<string>(initialKey);
  if (initialKey !== prevInitialKey) {
    setPrevInitialKey(initialKey);
    setKey(initialKey);
  }

  const [prevInitialContainer, setPrevInitialContainer] = useState(initialContainer);
  const [container, setContainer] = useState<PixelCryptContainer | null>(initialContainer);
  if (initialContainer !== prevInitialContainer) {
    setPrevInitialContainer(initialContainer);
    setContainer(initialContainer);
  }

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // Scrambled PNG input fallback
  const [scrambledPngPixels, setScrambledPngPixels] = useState<{
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
  } | null>(null);

  // Decryption result
  const [restoredResult, setRestoredResult] = useState<{
    dataUrl: string;
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
    executionTimeMs: number;
  } | null>(null);

  // Handle uploaded file (either .pixelcrypt container or PNG)
  const handleFileSelect = async (file: File) => {
    setStatusMessage(null);
    setRestoredResult(null);
    setUploadedFile(file);

    const nameLower = file.name.toLowerCase();

    if (nameLower.endsWith('.pixelcrypt')) {
      // Parse .pixelcrypt binary container
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const unpacked = unpackContainer(buffer);
        setContainer(unpacked);
        setScrambledPngPixels(null);
        setStatusMessage({
          type: 'info',
          title: 'PixelCrypt Container Loaded',
          description: `Algorithm: ${unpacked.header.mode} • Dimensions: ${unpacked.header.width}x${unpacked.header.height} • Integrity Tag: Ready`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          title: 'Corrupted Container',
          description: err.message || 'Failed to parse .pixelcrypt container headers.',
        });
      }
    } else {
      // Scrambled image (PNG/JPEG)
      try {
        const loaded = await loadImageFromFile(file);
        const { imageData } = extractImageData(loaded.img);
        setScrambledPngPixels({
          pixels: imageData.data,
          width: loaded.width,
          height: loaded.height,
        });
        setContainer(null);
        setStatusMessage({
          type: 'info',
          title: 'Encrypted Image Loaded',
          description: `Image: ${loaded.fileName} (${loaded.width}x${loaded.height}). Ready for Educational Mode reversal.`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          title: 'Image Load Error',
          description: err.message || 'Could not load image bytes.',
        });
      }
    }
  };

  // Execute Decryption
  const handleDecrypt = async () => {
    if (!key.trim()) {
      setStatusMessage({
        type: 'error',
        title: 'Missing Key',
        description: 'Please enter the decryption key.',
      });
      return;
    }

    if (!container && !scrambledPngPixels) {
      setStatusMessage({
        type: 'error',
        title: 'No File Uploaded',
        description: 'Please upload a .pixelcrypt container or an encrypted image first.',
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      if (container) {
        // Decrypt from canonical .pixelcrypt container
        const { mode, width, height, salt: saltB64, iv: ivB64, integrityTag } = container.header;
        const salt = base64ToBytes(saltB64);
        const iv = base64ToBytes(ivB64);

        if (mode === 'educational-pixel') {
          // Educational Mode Decryption
          const encryptedPixels = new Uint8ClampedArray(
            container.payload.buffer,
            container.payload.byteOffset,
            container.payload.byteLength
          );

          const decRes = await educationalDecrypt(
            encryptedPixels,
            width,
            height,
            key,
            salt,
            iv,
            integrityTag
          );

          if (!decRes.isValidKey) {
            const errorMsg = 'Decryption failed. Integrity verification could not be completed. The key may be incorrect or the encrypted data may be corrupted.';
            setStatusMessage({
              type: 'error',
              title: 'Integrity Verification Failed',
              description: errorMsg,
            });
            onDecryptionComplete?.({
              mode: 'educational-pixel',
              success: false,
              error: 'HMAC-SHA256 integrity tag mismatch or corrupted ciphertext',
            });
            setRestoredResult(null);
            return;
          }

          // Exact plaintext match verified!
          const dataUrl = pixelsToDataUrl(decRes.decryptedPixels, width, height, 'image/png');
          setRestoredResult({
            dataUrl,
            pixels: decRes.decryptedPixels,
            width,
            height,
            executionTimeMs: decRes.executionTimeMs,
          });

          setStatusMessage({
            type: 'success',
            title: 'Decryption Successful — Integrity Verified',
            description: `Exact bit-level image restoration verified via HMAC-SHA256 in ${decRes.executionTimeMs.toFixed(1)}ms.`,
          });
          onDecryptionComplete?.({
            mode: 'educational-pixel',
            success: true,
          });
        } else {
          // Standard Secure AES-256-GCM Mode Decryption
          const decRes = await aesGcmDecrypt(container.payload, key, salt, iv);

          // The plaintext payload is the raw RGBA pixels
          const restoredPixels = new Uint8ClampedArray(
            decRes.plaintext.buffer,
            decRes.plaintext.byteOffset,
            decRes.plaintext.byteLength
          );

          const dataUrl = pixelsToDataUrl(restoredPixels, width, height, 'image/png');
          setRestoredResult({
            dataUrl,
            pixels: restoredPixels,
            width,
            height,
            executionTimeMs: decRes.executionTimeMs,
          });

          setStatusMessage({
            type: 'success',
            title: 'AES-GCM Decryption Successful',
            description: `Galois authentication tag validated. Plaintext restored in ${decRes.executionTimeMs.toFixed(1)}ms.`,
          });
          onDecryptionComplete?.({
            mode: 'aes-256-gcm',
            success: true,
          });
        }
      } else if (scrambledPngPixels) {
        // Fallback decryption from raw PNG without container metadata
        const defaultSalt = new Uint8Array(16);
        const defaultIv = new Uint8Array(12);
        const decRes = await educationalDecrypt(
          scrambledPngPixels.pixels,
          scrambledPngPixels.width,
          scrambledPngPixels.height,
          key,
          defaultSalt,
          defaultIv
        );

        const dataUrl = pixelsToDataUrl(
          decRes.decryptedPixels,
          scrambledPngPixels.width,
          scrambledPngPixels.height,
          'image/png'
        );

        setRestoredResult({
          dataUrl,
          pixels: decRes.decryptedPixels,
          width: scrambledPngPixels.width,
          height: scrambledPngPixels.height,
          executionTimeMs: decRes.executionTimeMs,
        });

        setStatusMessage({
          type: 'info',
          title: 'Decryption Reversal Complete',
          description: 'Inverse permutation and modular transformations applied to the image raster.',
        });
        onDecryptionComplete?.({
          mode: 'standalone-png',
          success: true,
        });
      }
    } catch (err: any) {
      let errorDesc = 'Decryption failed. Integrity verification could not be completed. The key may be incorrect or the encrypted data may be corrupted.';
      if (err?.name === 'OperationError' || err?.message?.includes('operation-specific') || err?.message?.includes('tag')) {
        errorDesc = 'Authentication failed. The encrypted payload appears to have been modified or the key is incorrect.';
      } else if (err?.message?.includes('tamper') || err?.message?.includes('corrupt')) {
        errorDesc = 'Authentication failed. The encrypted payload appears to have been modified.';
      }

      setStatusMessage({
        type: 'error',
        title: 'Decryption Failed',
        description: errorDesc,
      });
      onDecryptionComplete?.({
        mode: container?.header.mode || 'unknown',
        success: false,
        error: errorDesc,
      });
      setRestoredResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download restored image
  const handleDownloadRestored = async () => {
    if (!restoredResult) return;
    const canvas = createExportCanvas(
      restoredResult.pixels,
      restoredResult.width,
      restoredResult.height
    );
    const blob = await canvasToBlob(canvas, 'image/png');
    downloadBlob(blob, 'restored_original.png');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Unlock className="w-6 h-6 text-emerald-400" />
            Image Decryption & Restoration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticate cryptographic tags, invert permutations, and restore bit-exact original images.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Key Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Upload encrypted file */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs flex items-center justify-center font-mono">
                  1
                </span>
                Upload Encrypted File
              </h3>
              {(container || scrambledPngPixels) && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Loaded
                </span>
              )}
            </div>

            <Dropzone
              onFileSelect={handleFileSelect}
              allowContainer={true}
              acceptedFormatsText=".pixelcrypt container (recommended) or encrypted PNG"
            />

            {/* Container metadata preview */}
            {container && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
                  <span>Container Metadata</span>
                  <span className="text-cyan-400 font-bold uppercase">{container.header.mode}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500">Dimensions:</span> {container.header.width} × {container.header.height}
                  </div>
                  <div>
                    <span className="text-slate-500">Payload:</span> {(container.payload.byteLength / 1024).toFixed(1)} KB
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-slate-500">Integrity Tag:</span> {container.header.integrityTag.substring(0, 20)}...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Decryption Key Input */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs flex items-center justify-center font-mono">
                2
              </span>
              Enter Decryption Key
            </h3>

            <KeyInput
              value={key}
              onChange={setKey}
              label="Secret Decryption Key"
              placeholder="Enter matching key used during encryption..."
            />
          </div>

          {/* Step 3: Decrypt Button */}
          <div>
            <button
              type="button"
              onClick={handleDecrypt}
              disabled={isProcessing || (!container && !scrambledPngPixels) || !key.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Unlock className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Verifying Integrity & Restoring...' : 'Decrypt Image'}</span>
            </button>

            {/* Status & Error feedback banner */}
            {statusMessage && (
              <div
                className={`mt-4 p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                    : 'bg-cyan-950/60 border-cyan-800 text-cyan-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : statusMessage.type === 'error' ? (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-bold">{statusMessage.title}</div>
                  <p className="opacity-90">{statusMessage.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Restored Preview & Verification (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {restoredResult ? (
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Original Image Restored
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dimensions: <span className="font-mono text-slate-200">{restoredResult.width} × {restoredResult.height}</span> • Restored in <span className="font-mono text-emerald-400">{restoredResult.executionTimeMs.toFixed(1)}ms</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadRestored}
                  className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 text-xs font-semibold shadow-md transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Restored PNG</span>
                </button>
              </div>

              {/* Comparison against cached original if available */}
              {cachedOriginalDataUrl ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    Verification Comparison (Cached Original vs. Restored):
                  </div>
                  <ImageCompare
                    originalUrl={cachedOriginalDataUrl}
                    comparisonUrl={restoredResult.dataUrl}
                    originalLabel="Original Reference"
                    comparisonLabel="Decrypted Restored Image"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-full max-h-96 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={restoredResult.dataUrl}
                      alt="Restored Image"
                      className="max-h-80 w-auto object-contain rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State Guide */
            <div className="p-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center space-y-4 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                <Unlock className="w-8 h-8 text-slate-400" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-semibold text-slate-300">Awaiting Encrypted Input</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a <strong className="text-cyan-400 font-mono">.pixelcrypt</strong> container file, enter the decryption key, and click "Decrypt Image" to restore your original image.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
