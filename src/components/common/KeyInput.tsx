import React, { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Check, RefreshCw, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { generateRandomKey, evaluateKeyStrength } from '../../lib/crypto/keyDerivation';

interface KeyInputProps {
  value: string;
  onChange: (key: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const KeyInput: React.FC<KeyInputProps> = ({
  value,
  onChange,
  label = 'Encryption Key / Passphrase',
  placeholder = 'Enter secret key or generate a 256-bit cryptographic key...',
  disabled = false,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const strength = evaluateKeyStrength(value);

  const handleGenerate = () => {
    const newKey = generateRandomKey(32);
    onChange(newKey);
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStrengthBadgeColor = () => {
    switch (strength.label) {
      case 'Cryptographic':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-700/50';
      case 'Strong':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50';
      case 'Fair':
        return 'text-yellow-400 bg-yellow-950/60 border-yellow-700/50';
      default:
        return 'text-rose-400 bg-rose-950/60 border-rose-700/50';
    }
  };

  const getStrengthBarColor = () => {
    if (strength.score >= 85) return 'bg-cyan-500';
    if (strength.score >= 70) return 'bg-emerald-500';
    if (strength.score >= 50) return 'bg-yellow-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Key className="w-4 h-4 text-cyan-400" />
          {label}
        </label>
        {value && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${getStrengthBadgeColor()}`}>
            {strength.label} ({strength.entropyBits} bits)
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent pr-32 transition-all"
        />

        <div className="absolute right-1.5 flex items-center gap-1 bg-slate-900/95 py-1 px-1 rounded-md">
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? 'Hide key' : 'Show key'}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {value && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy key to clipboard"
                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                title="Clear key"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            title="Generate cryptographically random 256-bit key"
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 rounded transition ml-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate</span>
          </button>
        </div>
      </div>

      {/* Strength meter bar */}
      {value && (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
              style={{ width: `${Math.max(5, strength.score)}%` }}
            />
          </div>
          {strength.feedback.length > 0 && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
              {strength.feedback[0]}
            </p>
          )}
        </div>
      )}

      {/* Security alert callout */}
      <div className="flex items-start gap-2 p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-300">Zero Transmission:</strong> Keys are kept entirely in volatile browser memory. Keys are never logged, stored in cookies, or sent across any network.
        </p>
      </div>
    </div>
  );
};
