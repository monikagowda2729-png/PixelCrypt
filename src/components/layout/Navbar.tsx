import React from 'react';
import { Shield, Lock, Unlock, Grid, BookOpen, Cpu } from 'lucide-react';

export type ActiveTab = 'encrypt' | 'decrypt' | 'visualizer' | 'how-it-works';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'encrypt', label: 'Encrypt', icon: <Lock className="w-3.5 h-3.5" /> },
    { id: 'decrypt', label: 'Decrypt', icon: <Unlock className="w-3.5 h-3.5" /> },
    { id: 'visualizer', label: 'Pixel Matrix', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'how-it-works', label: 'How It Works', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Tagline */}
          <div
            onClick={() => onTabChange('encrypt')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-100 tracking-tight">
                  PIXEL<span className="text-cyan-400">CRYPT</span>
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-cyan-950 border border-cyan-800/60 text-cyan-400 rounded font-semibold">
                  Task 02
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden xl:block">
                Image Encryption & Decryption via Pixel Manipulation
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm shadow-cyan-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action: Privacy Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] font-mono text-emerald-300">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">100% Client-Side</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="sm:hidden flex items-center justify-around py-2 border-t border-slate-900 gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
