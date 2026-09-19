import React from 'react';
import { Shield, Lock, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: Brand & Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-cyan-500 flex items-center justify-center text-slate-950">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-200 tracking-wider">PIXEL<span className="text-cyan-400">CRYPT</span></span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              "Transforming Pixels. Securing Images."
            </p>
            <p className="text-slate-500 text-[11px]">
              Developed for SkillCraft Technology Cybersecurity Internship Task 02.
            </p>
          </div>

          {/* Column 2: Privacy Guarantee */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Privacy-Preserving Architecture
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your images are processed locally in your browser and are <strong className="text-emerald-400 font-medium">never uploaded</strong> to any external server or telemetry endpoint. All pixel arrays and key materials are cleared from memory upon session refresh.
            </p>
          </div>

          {/* Column 3: Cryptographic Disclaimer */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Security Advisory
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              PixelCrypt's Educational Pixel Mode is designed to demonstrate image encryption concepts through pixel manipulation. It should not be considered a substitute for standardized cryptographic systems. Secure Mode implements standardized Web Crypto primitives (AES-256-GCM + PBKDF2).
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div>
            © 2026 PixelCrypt Cybersecurity Suite. Built with React, TypeScript, HTML5 Canvas, and Web Crypto API.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Zero Server Footprint</span>
            <span>•</span>
            <span className="text-slate-400">RFC 8439 DRBG</span>
            <span>•</span>
            <span className="text-slate-400">FIPS-Compatible AES-GCM</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
