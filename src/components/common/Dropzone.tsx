import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, Sparkles } from 'lucide-react';
import { validateFile } from '../../lib/image/validation';
import { createTestPatternFile } from './SampleImages';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormatsText?: string;
  allowContainer?: boolean;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  acceptedFormatsText = 'PNG, JPEG, WebP, or .pixelcrypt container (max 25MB)',
  allowContainer = true,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);
    const validation = validateFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid file.');
      return;
    }

    if (!allowContainer && validation.detectedType === 'container') {
      setErrorMessage('Please upload a standard image file (PNG, JPEG, WebP) for encryption.');
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadSample = (type: 'cyber' | 'gradient' | 'checkerboard') => {
    const file = createTestPatternFile(type, 128, 128);
    processFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
            : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowContainer ? 'image/png,image/jpeg,image/webp,.pixelcrypt' : 'image/png,image/jpeg,image/webp'}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <p className="text-base font-medium text-slate-200">
              Drag and drop your image or file here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or <span className="text-cyan-400 underline font-medium">browse local files</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{acceptedFormatsText}</span>
          </div>
        </div>
      </div>

      {/* Preset sample buttons for immediate zero-friction evaluation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Quick test patterns:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleLoadSample('cyber')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-cyan-950/80 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700/50 rounded text-slate-300 transition"
          >
            Cyber Shield
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('gradient')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-cyan-950/80 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700/50 rounded text-slate-300 transition"
          >
            Color Gradient
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('checkerboard')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-cyan-950/80 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700/50 rounded text-slate-300 transition"
          >
            Checkerboard
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
