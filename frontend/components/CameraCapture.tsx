'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, AlertTriangle, CheckCircle2, Sun, Sparkles, SwitchCamera } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

interface QualityCheckResult {
  isBlurry: boolean;
  blurScore: number;
  isPoorLighting: boolean;
  lightingType: 'too_dark' | 'too_bright' | 'good';
  meanLuminance: number;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [qualityCheck, setQualityCheck] = useState<QualityCheckResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(true);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setIsStartingCamera(true);
    setCameraError(null);

    // Stop any active stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStartingCamera(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsStartingCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or use standard file upload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected on your system. Please use file upload instead.');
      } else {
        setCameraError('Could not start camera feed. Please check device permissions or select a saved photo from your files.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, startCamera]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Perform Client-Side Quality Analysis on Captured Frame
  const analyzeFrameQuality = (canvas: HTMLCanvasElement): QualityCheckResult => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { isBlurry: false, blurScore: 100, isPoorLighting: false, lightingType: 'good', meanLuminance: 128 };
    }

    // Downscale for fast pixel processing
    const sampleW = 200;
    const sampleH = 200;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) {
      return { isBlurry: false, blurScore: 100, isPoorLighting: false, lightingType: 'good', meanLuminance: 128 };
    }

    offCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
    const pixels = imgData.data;

    // 1. Compute Grayscale and Average Luminance
    const gray = new Float32Array(sampleW * sampleH);
    let totalLuminance = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i / 4] = lum;
      totalLuminance += lum;
    }
    const meanLuminance = totalLuminance / (sampleW * sampleH);

    let lightingType: 'too_dark' | 'too_bright' | 'good' = 'good';
    if (meanLuminance < 45) {
      lightingType = 'too_dark';
    } else if (meanLuminance > 220) {
      lightingType = 'too_bright';
    }

    // 2. Laplacian Kernel Blur Detection (Approximation of variance of Laplacian)
    let laplacianSum = 0;
    let laplacianSumSq = 0;
    let count = 0;

    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const idx = y * sampleW + x;
        // Kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
        const val =
          gray[idx - sampleW] +
          gray[idx - 1] -
          4 * gray[idx] +
          gray[idx + 1] +
          gray[idx + sampleW];

        laplacianSum += val;
        laplacianSumSq += val * val;
        count++;
      }
    }

    const meanLap = laplacianSum / count;
    const varianceLap = laplacianSumSq / count - meanLap * meanLap;
    const isBlurry = varianceLap < 75; // Low variance indicates blurry edge transitions

    return {
      isBlurry,
      blurScore: Math.round(varianceLap),
      isPoorLighting: lightingType !== 'good',
      lightingType,
      meanLuminance: Math.round(meanLuminance),
    };
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Run quality heuristic
    const quality = analyzeFrameQuality(canvas);
    setQualityCheck(quality);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const previewUrl = URL.createObjectURL(blob);
          setCapturedPreview(previewUrl);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    setQualityCheck(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleConfirm = () => {
    if (!capturedBlob) return;
    const filename = `camera_scan_${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800 z-10">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold">Guided Skin Scan Capture</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View / Preview Area */}
        <div className="relative flex-1 bg-black min-h-[360px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 space-y-3 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all"
              >
                Use File Upload Instead
              </button>
            </div>
          ) : isStartingCamera && !capturedPreview ? (
            <div className="text-center text-slate-400 space-y-2">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mx-auto" />
              <p className="text-xs">Initializing camera feed...</p>
            </div>
          ) : capturedPreview ? (
            /* Review Captured Photo */
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedPreview}
                alt="Captured Lesion Preview"
                className="w-full h-full max-h-[460px] object-contain"
              />
            </div>
          ) : (
            /* Live Camera Feed with Reticle */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover max-h-[460px]"
              />

              {/* Circular Dermatoscopic Framing Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-dashed border-blue-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border border-blue-300/60 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  </div>
                  {/* Subtle crosshairs */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400/30"></div>
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-400/30"></div>
                </div>
              </div>

              {/* Target Instruction Pill */}
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-semibold backdrop-blur-xs border border-white/20">
                  {t('camera.reticleGuide')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quality Advisory Prompt (If Blurred or Poorly Lit) */}
        {capturedPreview && qualityCheck && (
          <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2">
            {qualityCheck.isBlurry || qualityCheck.isPoorLighting ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    {qualityCheck.isBlurry
                      ? t('camera.quality.blurry')
                      : qualityCheck.lightingType === 'too_dark'
                      ? t('camera.quality.tooDark')
                      : t('camera.quality.tooBright')}
                  </span>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    {t('results.confidenceBreakdown.tip')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">{t('camera.quality.sharp')}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          {!capturedPreview ? (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title={t('camera.switchCamera')}
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="hidden sm:inline">Flip</span>
              </button>

              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={Boolean(cameraError) || isStartingCamera}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{t('camera.captureBtn')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('camera.retakeBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('camera.useBtn')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
