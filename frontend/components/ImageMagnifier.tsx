'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ImageMagnifierProps {
  src: string;
  alt: string;
  zoomLevel?: number;
}

export default function ImageMagnifier({ src, alt, zoomLevel = 2.5 }: ImageMagnifierProps) {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [isLensActive, setIsLensActive] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const lensSize = 130;

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Coordinates relative to container
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // Constrain within bounds
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    setCursorPos({ x, y });

    // Lens position centered on cursor
    let lensX = x - lensSize / 2;
    let lensY = y - lensSize / 2;

    setLensPos({ x: lensX, y: lensY });

    // Background position for 2.5x zoom
    const bgX = (x / rect.width) * 100;
    const bgY = (y / rect.height) * 100;
    setBgPos({ x: bgX, y: bgY });
  }, [lensSize]);

  // Desktop Mouse Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLensActive) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handleMouseEnter = () => {
    if (isLensActive) setShowMagnifier(true);
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  // Mobile Touch Handlers
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isLensActive || e.touches.length === 0) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isLensActive || e.touches.length === 0) return;
    setShowMagnifier(true);
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setShowMagnifier(false);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Magnifier Toggle Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Lesion Detail Inspection
        </span>
        <button
          type="button"
          onClick={() => {
            const next = !isLensActive;
            setIsLensActive(next);
            setShowMagnifier(false);
          }}
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
            isLensActive
              ? 'bg-cyan-500 text-white border-cyan-600 shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          {isLensActive ? (
            <>
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Disable Loupe</span>
            </>
          ) : (
            <>
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Enable 2.5x Loupe</span>
            </>
          )}
        </button>
      </div>

      {/* Image Container with Loupe */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative inline-block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/5 dark:bg-black/40 shadow-inner ${
          isLensActive ? 'cursor-crosshair touch-none' : ''
        }`}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-56 sm:max-h-64 max-w-full object-contain rounded-2xl select-none pointer-events-none"
        />

        {/* Floating Circular Loupe Lens */}
        {isLensActive && showMagnifier && (
          <div
            style={{
              position: 'absolute',
              left: `${lensPos.x}px`,
              top: `${lensPos.y}px`,
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              backgroundImage: `url(${src})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${zoomLevel * 100}%`,
              backgroundPosition: `${bgPos.x}% ${bgPos.y}%`,
            }}
            className="rounded-full border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] pointer-events-none z-30"
          >
            {/* Center Crosshair Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-2 h-2 rounded-full border border-white"></div>
            </div>
          </div>
        )}

        {isLensActive && !showMagnifier && (
          <div className="absolute bottom-2 left-2 right-2 py-1 px-2 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] text-center font-medium pointer-events-none">
            Hover or drag your finger across the photo to inspect closely
          </div>
        )}
      </div>
    </div>
  );
}
