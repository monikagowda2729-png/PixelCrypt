import React, { useState, useEffect } from 'react';
import { Grid, Play, Pause, SkipForward, SkipBack, RotateCcw, Sparkles } from 'lucide-react';
import { samplePixelMatrix } from '../../lib/image/canvasUtils';
import { DeterministicKeystream } from '../../lib/crypto/deterministicStream';
import { deriveKeyMaterial } from '../../lib/crypto/keyDerivation';

interface PixelMatrixViewProps {
  pixels?: Uint8ClampedArray | null;
  width?: number;
  height?: number;
  encryptionKey?: string;
}

interface PixelCell {
  r: number;
  g: number;
  b: number;
  a: number;
  x: number;
  y: number;
  stepR?: number;
  stepG?: number;
  stepB?: number;
  permutedFrom?: { x: number; y: number };
}

export const PixelMatrixView: React.FC<PixelMatrixViewProps> = ({
  pixels,
  width = 16,
  height = 16,
  encryptionKey = 'PixelCryptKeyDemo2026',
}) => {
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gridSize, setGridSize] = useState<4 | 8>(4);
  const [matrixData, setMatrixData] = useState<{
    original: PixelCell[][];
    permuted: PixelCell[][];
    modular: PixelCell[][];
    xor: PixelCell[][];
  } | null>(null);

  // Compute transformation steps for the sampled subgrid
  useEffect(() => {
    async function computeMatrix() {
      // Fallback synthetic pattern if no image uploaded
      let sampleData: Uint8ClampedArray;
      let actualW = width;
      let actualH = height;

      if (pixels && width >= 4 && height >= 4) {
        sampleData = pixels;
      } else {
        actualW = 16;
        actualH = 16;
        sampleData = new Uint8ClampedArray(actualW * actualH * 4);
        for (let i = 0; i < actualW * actualH; i++) {
          sampleData[i * 4] = (i * 17) % 256;
          sampleData[i * 4 + 1] = (i * 31) % 256;
          sampleData[i * 4 + 2] = (i * 53) % 256;
          sampleData[i * 4 + 3] = 255;
        }
      }

      const { matrix } = samplePixelMatrix(sampleData, actualW, actualH, gridSize);
      const totalCells = gridSize * gridSize;

      // Deterministic keystream derived from key
      const salt = new Uint8Array(16).fill(0xaa);
      const iv = new Uint8Array(12).fill(0x55);
      const keyBytes = await deriveKeyMaterial(encryptionKey || 'demo', salt, 10000, 256);
      const stream = new DeterministicKeystream(keyBytes, iv);
      const perm = stream.generatePermutation(totalCells);

      // Step 0: Original
      const original: PixelCell[][] = matrix.map(row => row.map(cell => ({ ...cell })));

      // Step 1: Permuted
      const flatOriginal: PixelCell[] = [];
      original.forEach(row => row.forEach(c => flatOriginal.push(c)));

      const flatPermuted: PixelCell[] = new Array(totalCells);
      for (let i = 0; i < totalCells; i++) {
        const dest = perm[i];
        flatPermuted[dest] = {
          ...flatOriginal[i],
          permutedFrom: { x: flatOriginal[i].x, y: flatOriginal[i].y },
        };
      }

      const permuted: PixelCell[][] = [];
      for (let r = 0; r < gridSize; r++) {
        permuted.push(flatPermuted.slice(r * gridSize, (r + 1) * gridSize));
      }

      // Step 2: Modular Shift
      const modular: PixelCell[][] = [];
      for (let r = 0; r < gridSize; r++) {
        const row: PixelCell[] = [];
        for (let c = 0; c < gridSize; c++) {
          const base = permuted[r][c];
          const shiftR = stream.nextByte();
          const shiftG = stream.nextByte();
          const shiftB = stream.nextByte();
          row.push({
            ...base,
            r: (base.r + shiftR) & 0xff,
            g: (base.g + shiftG) & 0xff,
            b: (base.b + shiftB) & 0xff,
          });
        }
        modular.push(row);
      }

      // Step 3: Keystream XOR
      const xor: PixelCell[][] = [];
      for (let r = 0; r < gridSize; r++) {
        const row: PixelCell[] = [];
        for (let c = 0; c < gridSize; c++) {
          const base = modular[r][c];
          const xorR = stream.nextByte();
          const xorG = stream.nextByte();
          const xorB = stream.nextByte();
          row.push({
            ...base,
            r: (base.r ^ xorR) & 0xff,
            g: (base.g ^ xorG) & 0xff,
            b: (base.b ^ xorB) & 0xff,
          });
        }
        xor.push(row);
      }

      setMatrixData({ original, permuted, modular, xor });
    }

    computeMatrix();
  }, [pixels, width, height, gridSize, encryptionKey]);

  // Automated playback
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setStep(prev => (prev < 3 ? prev + 1 : 0));
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const stepDescriptions = [
    {
      title: 'Phase 0: Plaintext Image Matrix',
      description: 'Raw pixel intensities extracted from the spatial coordinate grid. Neighboring pixels share high statistical correlation.',
      formula: 'P(x, y) = [Red, Green, Blue, Alpha]',
    },
    {
      title: 'Phase 1: Deterministic Pixel Permutation',
      description: 'Pixels are shuffled across positions using an unbiased Fisher-Yates permutation seeded by the ChaCha20 DRBG. Spatial adjacency is severed.',
      formula: 'P_dest = Permutation[P_src]',
    },
    {
      title: 'Phase 2: Reversible Modular Arithmetic',
      description: 'Key-derived pseudorandom shift bytes are added to each channel modulo 256. Fully invertible via modular subtraction: C = (C\' - S + 256) mod 256.',
      formula: 'C\' = (C + S_k) mod 256',
    },
    {
      title: 'Phase 3: Keystream XOR Diffusion',
      description: 'Final bit-level diffusion applied through keystream byte masking. Invertible via identity: (A ⊕ B) ⊕ B = A.',
      formula: 'C\'\' = C\' ⊕ K_stream',
    },
  ];

  const currentMatrix =
    step === 0
      ? matrixData?.original
      : step === 1
      ? matrixData?.permuted
      : step === 2
      ? matrixData?.modular
      : matrixData?.xor;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Grid className="w-6 h-6 text-cyan-400" />
            Interactive Pixel Matrix Visualizer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Step-by-step visual demonstration of spatial permutation, modular shifts, and bitwise diffusion on a sampled micro-matrix.
          </p>
        </div>

        {/* Grid size toggle */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-xs">
          <span className="text-slate-400 px-2">Sample Matrix:</span>
          <button
            type="button"
            onClick={() => setGridSize(4)}
            className={`px-2.5 py-1 rounded font-mono ${gridSize === 4 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
          >
            4×4
          </button>
          <button
            type="button"
            onClick={() => setGridSize(8)}
            className={`px-2.5 py-1 rounded font-mono ${gridSize === 8 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
          >
            8×8
          </button>
        </div>
      </div>

      {/* Scrubber & Phase Indicator */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stepDescriptions.map((desc, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setStep(idx);
              setIsPlaying(false);
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              step === idx
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200 shadow-md shadow-cyan-950'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span>Step {idx}</span>
              {step === idx && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
            </div>
            <div className="text-xs font-semibold mt-1 truncate">{desc.title.split(':')[1]}</div>
          </button>
        ))}
      </div>

      {/* Interactive Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
            title="Previous step"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-medium hover:bg-cyan-900 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(prev => Math.min(3, prev + 1))}
            disabled={step === 3}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
            title="Next step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(0);
              setIsPlaying(false);
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750 transition ml-2"
            title="Reset to Phase 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Current Formula Display */}
        <div className="font-mono text-xs text-cyan-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          Formula: <span className="text-slate-100">{stepDescriptions[step].formula}</span>
        </div>
      </div>

      {/* Visual Matrix Grid Canvas */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[380px]">
        {currentMatrix ? (
          <div
            className="grid gap-2 transition-all duration-300"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {currentMatrix.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="group relative p-2 rounded-lg border border-slate-700/80 bg-slate-950 flex flex-col items-center justify-center space-y-1 shadow-sm hover:scale-105 transition-transform"
                  style={{ width: gridSize === 4 ? '90px' : '52px', height: gridSize === 4 ? '90px' : '52px' }}
                >
                  {/* Swatch indicator */}
                  <div
                    className="w-full h-4 rounded-sm border border-slate-800"
                    style={{ backgroundColor: `rgb(${cell.r}, ${cell.g}, ${cell.b})` }}
                  />

                  {/* Intensity labels */}
                  {gridSize === 4 ? (
                    <div className="text-[10px] font-mono text-slate-400 text-center leading-tight">
                      <span className="text-red-400">{cell.r}</span>{' '}
                      <span className="text-emerald-400">{cell.g}</span>{' '}
                      <span className="text-blue-400">{cell.b}</span>
                    </div>
                  ) : (
                    <div className="text-[9px] font-mono text-slate-400">
                      {Math.round((cell.r + cell.g + cell.b) / 3)}
                    </div>
                  )}

                  {/* Position coordinate */}
                  <span className="text-[8px] text-slate-600 font-mono">
                    ({cIdx},{rIdx})
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-xs">Computing visual matrix...</div>
        )}

        {/* Phase Info Box */}
        <div className="mt-6 max-w-xl text-center space-y-1">
          <h4 className="text-sm font-semibold text-slate-200">{stepDescriptions[step].title}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{stepDescriptions[step].description}</p>
        </div>
      </div>
    </div>
  );
};
