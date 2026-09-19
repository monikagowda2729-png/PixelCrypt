import React from 'react';
import { BookOpen, Shuffle, Binary, Cpu, ShieldCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-mono">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Educational Cryptography Guide</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          How PixelCrypt Transforms and Restores Images
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          A step-by-step breakdown of digital image representations, deterministic spatial permutation,
          modular finite-field arithmetic, and authenticated decryption.
        </p>
      </div>

      {/* Pipeline Diagram Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stage 1 */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Shuffle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono text-cyan-400 font-semibold">Stage 1</span>
            <h3 className="text-base font-semibold text-slate-100 mt-1">Spatial Pixel Permutation</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every digital image is stored as an array of pixels $P(x, y) = [R, G, B, A]$. In natural images, neighboring pixels are strongly correlated ($\sim 0.95$). PixelCrypt runs an unbiased Fisher-Yates shuffle derived deterministically from the user key via ChaCha20 DRBG, severing spatial adjacency.
          </p>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[11px] text-cyan-300">
            P_dest = FisherYates(P_src, Key_Seed)
          </div>
        </div>

        {/* Stage 2 */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono text-emerald-400 font-semibold">Stage 2</span>
            <h3 className="text-base font-semibold text-slate-100 mt-1">Modular Arithmetic (mod 256)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Each color channel is an 8-bit integer in the finite ring Z₂₅₆ = [0, 1, ..., 255]. PixelCrypt adds a key-derived modular shift S_k in Z₂₅₆. Decryption simply subtracts S_k modulo 256, guaranteeing 100% exact bit-level mathematical inversion without roundoff errors.
          </p>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[11px] text-emerald-300">
            C' = (C + S_k) mod 256
          </div>
        </div>

        {/* Stage 3 */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono text-purple-400 font-semibold">Stage 3</span>
            <h3 className="text-base font-semibold text-slate-100 mt-1">Keystream XOR Diffusion</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Following modular addition, each pixel byte is bitwise XORed with pseudorandom keystream bytes $X_k$. Based on the self-inverse property of XOR ($(A \oplus B) \oplus B = A$), the operation is reversible, flattening the histogram toward maximum entropy.
          </p>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[11px] text-purple-300">
            C'' = C' ⊕ K_stream
          </div>
        </div>
      </div>

      {/* Educational Mode vs Secure Mode Comparison Table */}
      <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Comparative Analysis: Educational Pixel Mode vs. Standardized Secure Mode
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          To provide complete academic transparency, PixelCrypt clearly delineates the functional purpose of both modes:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-cyan-400">Educational Pixel Mode</th>
                <th className="py-3 px-4 text-purple-400">Secure AES-256-GCM Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              <tr>
                <td className="py-3 px-4 text-slate-300 font-sans">Primary Purpose</td>
                <td className="py-3 px-4 text-slate-300 font-sans">Demonstrates pixel swapping & modular arithmetic for academic requirements</td>
                <td className="py-3 px-4 text-slate-300 font-sans">Confidentiality & integrity using standardized cryptography</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-300 font-sans">Cryptographic Primitive</td>
                <td className="py-3 px-4 text-cyan-300">Fisher-Yates + Modulo 256 + XOR + HMAC</td>
                <td className="py-3 px-4 text-purple-300">AES-GCM (NIST SP 800-38D)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-300 font-sans">Key Derivation (KDF)</td>
                <td className="py-3 px-4 text-slate-300">PBKDF2-HMAC-SHA256 (100,000 rounds)</td>
                <td className="py-3 px-4 text-slate-300">PBKDF2-HMAC-SHA256 (100,000 rounds)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-300 font-sans">Integrity Verification</td>
                <td className="py-3 px-4 text-slate-300">HMAC-SHA256 Authentication Tag</td>
                <td className="py-3 px-4 text-slate-300">128-bit Galois Field Authentication Tag</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-300 font-sans">Output Format</td>
                <td className="py-3 px-4 text-slate-300">.pixelcrypt container or visual scrambled PNG</td>
                <td className="py-3 px-4 text-slate-300">.pixelcrypt canonical container</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
