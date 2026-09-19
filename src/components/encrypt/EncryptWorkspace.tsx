import React, { useState } from 'react';
import { Lock, Cpu, Sparkles, ArrowRight, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../common/Dropzone';
import { KeyInput } from '../common/KeyInput';
import { ImageCompare } from '../comparison/ImageCompare';
import type { EncryptionMode, PixelCryptContainer } from '../../types/crypto';
import { loadImageFromFile, extractImageData, pixelsToDataUrl, createExportCanvas, canvasToBlob } from '../../lib/image/canvasUtils';
import { educationalEncrypt } from '../../lib/crypto/educational';
import { aesGcmEncrypt } from '../../lib/crypto/aesGcm';
import { packContainer, downloadBlob } from '../../lib/crypto/container';
import { bytesToBase64 } from '../../lib/crypto/keyDerivation';
import type { ActiveTab } from '../layout/Navbar';

interface EncryptWorkspaceProps {
  onNavigate: (tab: ActiveTab) => void;
  onEncryptionComplete: (data: {
    container: PixelCryptContainer;
    packedBytes: Uint8Array;
    originalImageDataUrl: string;
    encryptedImageDataUrl: string;
    originalPixels: Uint8ClampedArray;
    encryptedPixels?: Uint8ClampedArray;
    key: string;
  }) => void;
}

export const EncryptWorkspace: React.FC<EncryptWorkspaceProps> = ({
  onNavigate,
  onEncryptionComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [imageDetails, setImageDetails] = useState<{
    width: number;
    height: number;
    fileSize: number;
    fileName: string;
    mimeType: string;
    pixels: Uint8ClampedArray;
  } | null>(null);

  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>('educational-pixel');
  const [key, setKey] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [encryptedResult, setEncryptedResult] = useState<{
    container: PixelCryptContainer;
    packedBytes: Uint8Array;
    encryptedDataUrl: string;
    executionTimeMs: number;
    encryptedPixels?: Uint8ClampedArray;
  } | null>(null);

  // Handle uploaded file
  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    setEncryptedResult(null);
    try {
      const loaded = await loadImageFromFile(file);
      const { imageData } = extractImageData(loaded.img);
      const dataUrl = URL.createObjectURL(file);

      setSelectedFile(file);
      setOriginalImageUrl(dataUrl);
      setImageDetails({
        width: loaded.width,
        height: loaded.height,
        fileSize: loaded.fileSize,
        fileName: loaded.fileName,
        mimeType: loaded.mimeType,
        pixels: imageData.data,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load image.');
    }
  };

  // Perform Encryption
  const handleEncrypt = async () => {
    if (!imageDetails || !selectedFile) {
      setErrorMessage('Please upload an image first.');
      return;
    }
    if (!key.trim()) {
      setErrorMessage('Please enter or generate an encryption key.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const startTime = performance.now();
      const { width, height, pixels, mimeType, fileName, fileSize } = imageDetails;

      let payload: Uint8Array;
      let salt: Uint8Array;
      let iv: Uint8Array;
      let integrityTag: string;
      let encryptedDataUrl = '';
      let encryptedPixels: Uint8ClampedArray | undefined;

      if (encryptionMode === 'educational-pixel') {
        // Educational Pixel Mode
        const res = await educationalEncrypt(pixels, width, height, key);
        salt = res.salt;
        iv = res.iv;
        integrityTag = res.integrityTag;
        encryptedPixels = res.encryptedPixels;
        payload = new Uint8Array(res.encryptedPixels.buffer, res.encryptedPixels.byteOffset, res.encryptedPixels.byteLength);

        // Generate visual encrypted preview data URL
        encryptedDataUrl = pixelsToDataUrl(res.encryptedPixels, width, height, 'image/png');
      } else {
        // Standard Secure AES-256-GCM Mode
        // Encrypt raw image file binary bytes or pixel bytes
        const rawBytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
        const res = await aesGcmEncrypt(rawBytes, key);
        salt = res.salt;
        iv = res.iv;
        integrityTag = 'AES-GCM-AUTHENTICATED';
        payload = res.ciphertext;

        // In AES-GCM, raw ciphertext is not an image raster; generate abstract ciphertext pattern representation
        encryptedDataUrl = '';
      }

      const totalTimeMs = performance.now() - startTime;

      // Construct canonical .pixelcrypt container
      const container: PixelCryptContainer = {
        header: {
          magic: 'PIXELCRYPT',
          version: 1,
          mode: encryptionMode,
          mimeType: mimeType || 'image/png',
          width,
          height,
          channels: 4,
          salt: bytesToBase64(salt),
          iv: bytesToBase64(iv),
          integrityTag,
          createdAt: new Date().toISOString(),
          metadata: {
            filename: fileName,
            originalSize: fileSize,
            preservedAlpha: true,
          },
        },
        payload,
      };

      const packedBytes = packContainer(container);

      setEncryptedResult({
        container,
        packedBytes,
        encryptedDataUrl,
        executionTimeMs: totalTimeMs,
        encryptedPixels,
      });

      onEncryptionComplete({
        container,
        packedBytes,
        originalImageDataUrl: originalImageUrl!,
        encryptedImageDataUrl: encryptedDataUrl,
        originalPixels: pixels,
        encryptedPixels,
        key,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Encryption failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Canonical .pixelcrypt container
  const handleDownloadContainer = () => {
    if (!encryptedResult || !imageDetails) return;
    const blob = new Blob([encryptedResult.packedBytes as BlobPart], { type: 'application/octet-stream' });
    const baseName = imageDetails.fileName.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${baseName}.pixelcrypt`);
  };

  // Download Scrambled PNG (Educational mode visual export)
  const handleDownloadScrambledPng = async () => {
    if (!encryptedResult?.encryptedPixels || !imageDetails) return;
    const canvas = createExportCanvas(
      encryptedResult.encryptedPixels,
      imageDetails.width,
      imageDetails.height
    );
    const blob = await canvasToBlob(canvas, 'image/png');
    const baseName = imageDetails.fileName.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${baseName}_encrypted.png`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workflow Steps Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-6 h-6 text-cyan-400" />
            Image Encryption Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure cryptographic parameters, execute pixel permutations, and export canonical .pixelcrypt containers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Upload Image */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs flex items-center justify-center font-mono">
                  1
                </span>
                Upload Image
              </h3>
              {imageDetails && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Loaded
                </span>
              )}
            </div>

            <Dropzone
              onFileSelect={handleFileSelect}
              allowContainer={false}
              acceptedFormatsText="PNG, JPEG, WebP (max 25MB)"
            />

            {imageDetails && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Dimensions:</span>
                  <div className="text-slate-200 font-semibold">{imageDetails.width} × {imageDetails.height}</div>
                </div>
                <div>
                  <span className="text-slate-500">Total Pixels:</span>
                  <div className="text-slate-200 font-semibold">{(imageDetails.width * imageDetails.height).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-500">File Size:</span>
                  <div className="text-slate-200 font-semibold">{(imageDetails.fileSize / 1024).toFixed(1)} KB</div>
                </div>
                <div>
                  <span className="text-slate-500">Format:</span>
                  <div className="text-slate-200 font-semibold uppercase">{imageDetails.mimeType.split('/')[1]}</div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Choose Encryption Mode */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs flex items-center justify-center font-mono">
                2
              </span>
              Select Cryptographic Engine
            </h3>

            <div className="space-y-3">
              {/* Option A: Educational Mode */}
              <div
                onClick={() => setEncryptionMode('educational-pixel')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  encryptionMode === 'educational-pixel'
                    ? 'bg-cyan-950/50 border-cyan-600 ring-1 ring-cyan-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Educational Pixel Mode
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded font-semibold">
                    Task 02
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Pixel permutation (Fisher-Yates + ChaCha20 DRBG), modular finite-field arithmetic, and keystream XOR with HMAC-SHA256 integrity verification. Exportable as both a canonical container and a visual scrambled PNG.
                </p>
              </div>

              {/* Option B: Standard Secure Mode */}
              <div
                onClick={() => setEncryptionMode('secure-aes-gcm')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  encryptionMode === 'secure-aes-gcm'
                    ? 'bg-purple-950/50 border-purple-600 ring-1 ring-purple-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    Secure AES-256-GCM Mode
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 rounded font-semibold">
                    Standard
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  NIST-standardized Galois/Counter Mode authenticated encryption via Web Crypto API with PBKDF2 key stretching (100k rounds) and 96-bit random IVs.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Key Management */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs flex items-center justify-center font-mono">
                3
              </span>
              Key Management
            </h3>

            <KeyInput
              value={key}
              onChange={setKey}
              label="Encryption Key"
              placeholder="Enter passphrase or generate secure 256-bit key..."
            />
          </div>

          {/* Step 4: Encrypt Button */}
          <div>
            <button
              type="button"
              onClick={handleEncrypt}
              disabled={isProcessing || !imageDetails || !key.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Executing Cryptographic Pipeline...' : 'Encrypt Image'}</span>
            </button>

            {errorMessage && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Previews & Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {encryptedResult && originalImageUrl ? (
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Encryption Complete
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Algorithm: <span className="font-mono text-cyan-300">{encryptedResult.container.header.mode}</span> • Completed in <span className="font-mono text-emerald-400">{encryptedResult.executionTimeMs.toFixed(1)}ms</span>
                  </p>
                </div>

                <span className="text-xs px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-full font-mono">
                  Integrity Tag Generated
                </span>
              </div>

              {/* Visual Result Preview */}
              {encryptedResult.container.header.mode === 'educational-pixel' && encryptedResult.encryptedDataUrl ? (
                <div className="space-y-3">
                  <ImageCompare
                    originalUrl={originalImageUrl}
                    comparisonUrl={encryptedResult.encryptedDataUrl}
                    originalLabel="Original Plaintext Image"
                    comparisonLabel="Permuted & Modulo-Diffused Ciphertext"
                  />
                </div>
              ) : (
                <div className="p-8 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400 flex items-center justify-center mx-auto">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">AES-256-GCM Ciphertext Stream</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Authenticated ciphertext generated. In standard cryptographic mode, data is protected by Galois authentication tags and cannot be rendered as a raw raster image without decryption.
                  </p>
                </div>
              )}

              {/* Download Actions */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-slate-300">Export Encrypted Results:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Canonical .pixelcrypt container download */}
                  <button
                    type="button"
                    onClick={handleDownloadContainer}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-semibold shadow-md transition"
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Download Canonical .pixelcrypt</span>
                  </button>

                  {/* Scrambled PNG download (for educational mode) */}
                  {encryptedResult.container.header.mode === 'educational-pixel' && (
                    <button
                      type="button"
                      onClick={handleDownloadScrambledPng}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Download Scrambled PNG</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Post-encryption transition */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => onNavigate('decrypt')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-xs font-semibold text-cyan-200 shadow-sm transition"
                >
                  <span>Proceed to Decrypt Tab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : originalImageUrl ? (
            /* Image Preview before Encryption */
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Original Image Loaded
              </h3>
              <div className="w-full max-h-96 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                <img
                  src={originalImageUrl}
                  alt="Original Preview"
                  className="max-h-80 w-auto object-contain rounded"
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                Configure your key and click <strong className="text-cyan-400">"Encrypt Image"</strong> to begin.
              </p>
            </div>
          ) : (
            /* Empty State Guide */
            <div className="p-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center space-y-4 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                <Lock className="w-8 h-8 text-slate-400" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-semibold text-slate-300">Ready to Encrypt</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload an image from your device or select one of the test patterns on the left to begin the cryptographic workflow.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
