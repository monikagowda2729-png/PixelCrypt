import React from 'react';
import { ArrowRight, Grid, Lock, CheckCircle2, BookOpen } from 'lucide-react';
import type { ActiveTab } from './Navbar';

interface HeroProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <div className="relative overflow-hidden pt-8 pb-12 cyber-grid border-b border-slate-800/80">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Task Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-cyan-800/50 text-cyan-300 text-xs font-mono mb-6 shadow-sm shadow-cyan-950">
          <span>SkillCraft Technology Cybersecurity Internship — Task 02</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight max-w-4xl mx-auto leading-tight">
          Transforming Pixels.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
            Securing Images.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          A focused image encryption and decryption application using pixel manipulation.
          Demonstrates deterministic pixel permutation, reversible modular transformations,
          and exact image restoration.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('encrypt')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>Start Encrypting</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('visualizer')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 font-medium text-sm transition-all"
          >
            <Grid className="w-4 h-4 text-cyan-400" />
            <span>Pixel Matrix Visualizer</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('how-it-works')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 font-medium text-sm transition-all"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>How It Works</span>
          </button>
        </div>

        {/* Core Architecture highlights */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pixel Extraction</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Direct RGBA pixel buffer extraction using HTML5 Canvas ImageData.</p>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pixel Permutation</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Deterministic Fisher-Yates pixel shuffling derived from the encryption key.</p>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Modular Arithmetic</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Reversible finite-field integer operations (mod 256) per color channel.</p>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exact Restoration</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">100% bit-level identical restoration upon decryption with the matching key.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
