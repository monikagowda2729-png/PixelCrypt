import React, { useState, useRef, useEffect } from 'react';
import { Columns, SplitSquareVertical, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageCompareProps {
  originalUrl: string;
  comparisonUrl: string;
  originalLabel?: string;
  comparisonLabel?: string;
}

export const ImageCompare: React.FC<ImageCompareProps> = ({
  originalUrl,
  comparisonUrl,
  originalLabel = 'Original Image',
  comparisonLabel = 'Encrypted Image',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'toggle'>('slider');
  const [isToggledToComparison, setIsToggledToComparison] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handlePointerMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handlePointerMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="space-y-3">
      {/* View & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 mr-1">Comparison:</span>
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
              viewMode === 'slider' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
              viewMode === 'side-by-side' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('toggle')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
              viewMode === 'toggle' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Toggle</span>
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 px-1.5">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 ml-1"
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'slider' && (
        <div
          ref={containerRef}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          className="relative w-full max-h-[500px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 select-none cursor-ew-resize flex items-center justify-center min-h-[320px]"
        >
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
            className="relative transition-transform duration-100 flex items-center justify-center max-w-full"
          >
            {/* Background Image: Original */}
            <img
              src={originalUrl}
              alt={originalLabel}
              className="max-h-[480px] w-auto object-contain block pointer-events-none"
            />

            {/* Foreground Image: Encrypted with Clip-Path */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
            >
              <img
                src={comparisonUrl}
                alt={comparisonLabel}
                className="max-h-[480px] w-auto object-contain block pointer-events-none"
              />
            </div>

            {/* Slider Dividing Bar */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-20 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-500 border-2 border-slate-950 flex items-center justify-center shadow-lg">
                <SplitSquareVertical className="w-3.5 h-3.5 text-slate-950" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-md text-[11px] font-mono text-slate-300 border border-slate-800 z-30">
            {originalLabel}
          </div>
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-md text-[11px] font-mono text-cyan-400 border border-cyan-900/50 z-30">
            {comparisonLabel}
          </div>
        </div>
      )}

      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-mono text-slate-400">{originalLabel}</span>
            <div className="w-full h-72 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-2">
              <img
                src={originalUrl}
                alt={originalLabel}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-mono text-cyan-400">{comparisonLabel}</span>
            <div className="w-full h-72 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-2">
              <img
                src={comparisonUrl}
                alt={comparisonLabel}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'toggle' && (
        <div className="space-y-2">
          <div className="flex justify-center">
            <button
              type="button"
              onMouseDown={() => setIsToggledToComparison(true)}
              onMouseUp={() => setIsToggledToComparison(false)}
              onTouchStart={() => setIsToggledToComparison(true)}
              onTouchEnd={() => setIsToggledToComparison(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 transition select-none shadow-md"
            >
              {isToggledToComparison ? `Showing: ${comparisonLabel}` : `Press & Hold to Preview ${comparisonLabel}`}
            </button>
          </div>

          <div className="w-full h-80 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            <img
              src={isToggledToComparison ? comparisonUrl : originalUrl}
              alt="Comparison View"
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-full max-w-full object-contain transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};
