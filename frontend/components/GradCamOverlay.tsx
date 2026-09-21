'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Layers, Sparkles, HelpCircle, Sliders, SplitSquareVertical } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface GradCamOverlayProps {
  rawImageUrl: string;
  heatmapImageUrl?: string;
  predictedClass?: string;
}

export default function GradCamOverlay({
  rawImageUrl,
  heatmapImageUrl,
  predictedClass,
}: GradCamOverlayProps) {
  const { t } = useLanguage();
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'blend' | 'split'>('slider');
  const [blendOpacity, setBlendOpacity] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percent);
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleMouseMoveWindow = (e: MouseEvent) => {
      if (isDragging) handlePointerMove(e.clientX);
    };
    const handleTouchMoveWindow = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX);
      }
    };
    const handleMouseUpWindow = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMoveWindow);
      window.addEventListener('mouseup', handleMouseUpWindow);
      window.addEventListener('touchmove', handleTouchMoveWindow);
      window.addEventListener('touchend', handleMouseUpWindow);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWindow);
      window.removeEventListener('mouseup', handleMouseUpWindow);
      window.removeEventListener('touchmove', handleTouchMoveWindow);
      window.removeEventListener('touchend', handleMouseUpWindow);
    };
  }, [isDragging, handlePointerMove]);

  if (!heatmapImageUrl) {
    return null;
  }

  return (
    <div className="bg-white/95 dark:bg-[#111827]/95 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{t('gradcam.title')}</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t('gradcam.badge')} &bull; {predictedClass ? `"${predictedClass.toUpperCase()}"` : ''}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'slider'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('gradcam.modeSlider')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('blend')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'blend'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('gradcam.modeBlend')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('gradcam.modeSideBySide')}
          </button>
        </div>
      </div>

      {/* Main Interactive Viewer */}
      {viewMode === 'slider' && (
        <div className="space-y-2">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            className="relative w-full aspect-square max-h-[360px] mx-auto rounded-xl overflow-hidden cursor-ew-resize select-none bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner group"
          >
            {/* Base Image (Raw Photo) */}
            <img
              src={rawImageUrl}
              alt="Raw Skin Scan"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay Image (Heatmap), clipped by slider position */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src={heatmapImageUrl}
                alt="AI Grad-CAM Heatmap"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            {/* Slider Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] z-10 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 shadow-md flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs">
                <Sliders className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs border border-white/20">
                Heatmap
              </span>
            </div>
            <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs border border-white/20">
                Original
              </span>
            </div>
          </div>

          {/* Quick Slider Position Buttons */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
            <button
              type="button"
              onClick={() => setSliderPos(0)}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Show Original Only
            </button>
            <span className="font-mono text-[10px] font-semibold">Drag divider or click anywhere</span>
            <button
              type="button"
              onClick={() => setSliderPos(100)}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Show Heatmap Only
            </button>
          </div>
        </div>
      )}

      {viewMode === 'blend' && (
        <div className="space-y-3">
          <div className="relative w-full aspect-square max-h-[360px] mx-auto rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner">
            <img
              src={rawImageUrl}
              alt="Raw Scan"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <img
              src={heatmapImageUrl}
              alt="Grad-CAM Overlay"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150"
              style={{ opacity: blendOpacity / 100 }}
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
              Heatmap Intensity:
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={blendOpacity}
              onChange={(e) => setBlendOpacity(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 w-9 text-right">
              {blendOpacity}%
            </span>
          </div>
        </div>
      )}

      {viewMode === 'split' && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
              <img
                src={rawImageUrl}
                alt="Original Scan"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                Original Scan
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
              <img
                src={heatmapImageUrl}
                alt="Grad-CAM Activation"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                AI Attention Focus
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Spectrum Legend */}
      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
        <span>Low Attention</span>
        <div className="flex-1 mx-3 h-2 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-yellow-400 to-red-600 shadow-inner"></div>
        <span>High Attention</span>
      </div>

      {/* Honest Non-Diagnostic Framing Caption */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          {t('gradcam.caption')}
        </p>
      </div>
    </div>
  );
}
