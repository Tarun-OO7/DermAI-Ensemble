'use client';

import React, { useState, useRef } from 'react';
import { Microscope, Image as ImageIcon, Camera, Scan, Sparkles, AlertCircle, X, CheckCircle2, Lock, ArrowRight, ClipboardList, ChevronDown, RefreshCw, Plus, Layers } from 'lucide-react';
import { DiagnosticResult, UploadState, PatientSymptomContext } from '../types';
import { analyzeSkinPhoto } from '../lib/api';
import constants from '../constants.json';
import CameraCapture from './CameraCapture';
import { useLanguage } from '../context/LanguageContext';

interface DiagnosticInputProps {
  onResult: (result: DiagnosticResult, localUrl?: string | null) => void;
  onStartAnalysis: (localUrl?: string | null) => void;
  isAnalyzing: boolean;
  onError?: (msg: string) => void;
}

export default function DiagnosticInput({ onResult, onStartAnalysis, isAnalyzing, onError }: DiagnosticInputProps) {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Patient Context Questionnaire State
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [duration, setDuration] = useState<string>('');
  const [changes, setChanges] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addAngleInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const getAngleLabel = (index: number): string => {
    switch (index) {
      case 0:
        return t('scanner.multiAngle.angleLabel1') || 'Angle 1: Top-Down (Primary)';
      case 1:
        return t('scanner.multiAngle.angleLabel2') || 'Angle 2: 45° Side View';
      case 2:
        return t('scanner.multiAngle.angleLabel3') || 'Angle 3: Close-Up / Macro';
      case 3:
      default:
        return t('scanner.multiAngle.angleLabel4') || 'Angle 4: Additional Perspective';
    }
  };

  const toggleSymptom = (symptom: string) => {
    if (symptom === 'None') {
      setSelectedSymptoms(['None']);
      return;
    }
    const filtered = selectedSymptoms.filter((s) => s !== 'None');
    if (filtered.includes(symptom)) {
      setSelectedSymptoms(filtered.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...filtered, symptom]);
    }
  };

  const normalizeToPng = async (imgFile: File): Promise<File> => {
    if (imgFile.type === 'image/jpeg' || imgFile.type === 'image/png') {
      return imgFile;
    }

    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return imgFile;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(imgFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 1600;
        let width = img.naturalWidth || img.width || 500;
        let height = img.naturalHeight || img.height || 500;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const cleanName = (imgFile.name || 'skin_photo').replace(/\.[^/.]+$/, '') + '.png';
              resolve(new File([blob], cleanName, { type: 'image/png' }));
            } else {
              resolve(imgFile);
            }
          }, 'image/png');
        } else {
          resolve(imgFile);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(imgFile);
      };
      img.src = url;
    });
  };

  const processIncomingFiles = async (rawFiles: File[], appendMode = false) => {
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const f of rawFiles) {
      const size_mb = f.size / (1024 * 1024);
      if (size_mb > constants.MAX_IMAGE_SIZE_MB) {
        setErrorMsg(`Photo "${f.name}" exceeds ${constants.MAX_IMAGE_SIZE_MB}MB limit.`);
        continue;
      }

      const isImage = f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|jfif|heic|heif)$/i.test(f.name);
      if (!isImage) {
        setErrorMsg('Please upload valid images (JPG, PNG, WebP, BMP).');
        continue;
      }

      try {
        const normalized = await normalizeToPng(f);
        validFiles.push(normalized);
        validPreviews.push(URL.createObjectURL(normalized));
      } catch {
        validFiles.push(f);
        validPreviews.push(URL.createObjectURL(f));
      }
    }

    if (validFiles.length === 0) return;

    if (appendMode) {
      const combinedFiles = [...files, ...validFiles].slice(0, 4);
      const combinedPreviews = [...previewUrls, ...validPreviews].slice(0, 4);
      setFiles(combinedFiles);
      setPreviewUrls(combinedPreviews);
    } else {
      const cappedFiles = validFiles.slice(0, 4);
      const cappedPreviews = validPreviews.slice(0, 4);
      setFiles(cappedFiles);
      setPreviewUrls(cappedPreviews);
    }

    setErrorMsg(null);
    setUploadState('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, append = false) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      processIncomingFiles(selected, append);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      processIncomingFiles(dropped, files.length > 0);
    }
  };

  const handleLoadSample = async () => {
    try {
      const response = await fetch('/sample-mole.png');
      if (!response.ok) throw new Error('Could not load sample photo');
      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample-mole.png', { type: 'image/png' });
      processIncomingFiles([sampleFile], false);
    } catch {
      const canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#E5D0BA';
        ctx.fillRect(0, 0, 224, 224);
        ctx.fillStyle = '#4A2E18';
        ctx.beginPath();
        ctx.arc(112, 112, 45, 0, Math.PI * 2);
        ctx.fill();
        canvas.toBlob((blob) => {
          if (blob) {
            const fallbackFile = new File([blob], 'sample_mole.png', { type: 'image/png' });
            processIncomingFiles([fallbackFile], false);
          }
        }, 'image/png');
      }
    }
  };

  const handleRemoveAngle = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedFiles = files.filter((_, idx) => idx !== indexToRemove);
    const updatedPreviews = previewUrls.filter((_, idx) => idx !== indexToRemove);
    setFiles(updatedFiles);
    setPreviewUrls(updatedPreviews);
    if (updatedFiles.length === 0) {
      setUploadState('idle');
      setErrorMsg(null);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles([]);
    setPreviewUrls([]);
    setErrorMsg(null);
    setUploadState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (addAngleInputRef.current) addAngleInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      fileInputRef.current?.click();
      return;
    }

    if (isAnalyzing || isSubmittingRef.current || uploadState === 'uploading') return;
    isSubmittingRef.current = true;

    setUploadState('uploading');
    setErrorMsg(null);
    onStartAnalysis(previewUrls[0]);

    try {
      const data = await analyzeSkinPhoto(files);

      // Attach patient questionnaire context
      const symptomContext: PatientSymptomContext = {};
      if (duration) symptomContext.duration = duration;
      if (changes) symptomContext.changes = changes;
      if (selectedSymptoms.length > 0) symptomContext.symptoms = selectedSymptoms;

      const dataWithContext: DiagnosticResult = {
        ...data,
        symptom_context: Object.keys(symptomContext).length > 0 ? symptomContext : undefined,
      };

      setUploadState('success');
      onResult(dataWithContext, previewUrls[0]);
    } catch (err: any) {
      setUploadState('error');
      const msg = err.message || 'An unexpected error occurred during analysis.';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Clipboard Paste Support (Ctrl + V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing || !e.clipboardData) return;

      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        const pasted = Array.from(e.clipboardData.files).filter(
          (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|jfif)$/i.test(f.name)
        );
        if (pasted.length > 0) {
          processIncomingFiles(pasted, files.length > 0);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAnalyzing, files]);

  return (
    <div className="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xl shadow-blue-500/5 dark:shadow-indigo-500/10 transition-colors duration-200">
      {/* Card Header with Sample Trigger */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t('scanner.uploadTitle')}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-slate-700 transition-all duration-150 active:scale-95 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
          title="Click to load a sample photo for testing"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('scanner.trySample')}</span>
        </button>
      </div>

      {/* Lesion Screening Tag & Multi-Angle Badge */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-2xs">
          <Microscope className="w-3.5 h-3.5" />
          <span>{t('scanner.badge')}</span>
        </span>

        {files.length > 1 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>{files.length} Angles Selected</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dropzone / Multi-Angle Gallery */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload skin photo dropzone. Press Enter to browse files."
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (files.length === 0) fileInputRef.current?.click();
          }}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
            files.length > 0 ? 'cursor-default' : 'cursor-pointer'
          } ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 scale-[1.01]'
              : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/40 dark:bg-slate-900/40'
          }`}
        >
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.bmp,.jfif,image/jpeg,image/png,image/webp,image/bmp"
            onChange={(e) => handleFileChange(e, false)}
            className="hidden"
          />
          <input
            ref={addAngleInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.bmp,.jfif,image/jpeg,image/png,image/webp,image/bmp"
            onChange={(e) => handleFileChange(e, true)}
            className="hidden"
          />

          {files.length > 0 ? (
            <div className="w-full space-y-3.5">
              {/* Multi-Angle Thumbnail Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-2xl overflow-hidden border-2 border-blue-500/40 bg-slate-900/10 dark:bg-black/30 aspect-square flex flex-col justify-between shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`Angle ${idx + 1}`}
                      className="w-full h-full object-cover absolute inset-0"
                    />

                    {/* Laser Sweep Scan Animation During Analysis */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-blue-900/20 pointer-events-none">
                        <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-laser motion-reduce:animate-none"></div>
                      </div>
                    )}

                    {/* Angle Number Badge */}
                    <div className="relative z-10 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/70 to-transparent">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-black shadow-xs">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAngle(idx, e)}
                        className="w-5 h-5 rounded-md bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={t('scanner.multiAngle.removeAngle') || 'Remove'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Angle Tag Bottom Overlay */}
                    <div className="relative z-10 p-1.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-left">
                      <p className="text-[10px] font-bold text-white truncate drop-shadow-xs">
                        {getAngleLabel(idx)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Add Angle Button (If less than 4) */}
                {files.length < 4 && (
                  <button
                    type="button"
                    onClick={() => addAngleInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="aspect-square rounded-2xl border-2 border-dashed border-blue-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/60 dark:hover:bg-slate-800/60 flex flex-col items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-[11px] font-bold text-center px-2">
                      {t('scanner.multiAngle.addAngle') || 'Add Angle (+)'}
                    </span>
                  </button>
                )}
              </div>

              {/* Action Toolbar below thumbnails */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    disabled={files.length >= 4 || isAnalyzing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>

                  {files.length < 4 && (
                    <button
                      type="button"
                      onClick={() => addAngleInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Angle</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {t('scanner.dropzone.clearPhoto')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pointer-events-none py-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
                <ImageIcon className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('scanner.dropzone.title')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {t('scanner.dropzone.limits')} • Up to 4 angles
                </p>
              </div>

              {/* Camera Trigger Buttons */}
              <div className="pt-2 flex items-center justify-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCameraOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{t('scanner.dropzone.openCamera')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Guided Camera Modal */}
        {isCameraOpen && (
          <CameraCapture
            onCapture={(capturedFile) => {
              processIncomingFiles([capturedFile], files.length > 0);
              setIsCameraOpen(false);
            }}
            onClose={() => setIsCameraOpen(false)}
          />
        )}

        {/* Optional 10-Second Patient Questionnaire (Accordion) */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/60 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowQuestionnaire(!showQuestionnaire)}
            className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('scanner.questionnaire.title')}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showQuestionnaire ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
              }`}
            />
          </button>

          {showQuestionnaire && (
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3.5 text-xs animate-in fade-in duration-150">
              {/* Question 1: Duration */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t('scanner.questionnaire.durationLabel')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '< 3 months', label: t('scanner.durationOptions.under3m') },
                    { id: '3–12 months', label: t('scanner.durationOptions.threeTo12m') },
                    { id: 'Over a year', label: t('scanner.durationOptions.overYear') },
                    { id: 'Long-standing', label: t('scanner.durationOptions.longStanding') },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setDuration(duration === item.id ? '' : item.id)}
                      className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all cursor-pointer ${
                        duration === item.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Changes */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t('scanner.questionnaire.changesLabel')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'No changes', label: t('scanner.changesOptions.noChanges') },
                    { id: 'Grew larger', label: t('scanner.changesOptions.grewLarger') },
                    { id: 'Changed color', label: t('scanner.changesOptions.changedColor') },
                    { id: 'Changed shape', label: t('scanner.changesOptions.changedShape') },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setChanges(changes === item.id ? '' : item.id)}
                      className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all cursor-pointer ${
                        changes === item.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Symptoms */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t('scanner.questionnaire.symptomsLabel')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'Itching', label: t('scanner.questionnaire.symptoms.itching') },
                    { id: 'Bleeding', label: t('scanner.questionnaire.symptoms.bleeding') },
                    { id: 'Pain / Tenderness', label: t('scanner.questionnaire.symptoms.pain') },
                    { id: 'Crusting / Oozing', label: t('scanner.questionnaire.symptoms.crusting') },
                    { id: 'Rapid Growth', label: t('scanner.questionnaire.symptoms.rapidGrowth') },
                    { id: 'None', label: 'None' },
                  ].map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <button
                        type="button"
                        key={sym.id}
                        onClick={() => toggleSymptom(sym.id)}
                        className={`p-2 rounded-xl text-center border text-[11px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {sym.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl text-xs font-medium border border-rose-200 dark:border-rose-800/60 transition-all duration-200 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Action Button: "Run Skin Analysis" / "Run Multi-Angle Analysis" */}
        <button
          type="submit"
          disabled={isAnalyzing || uploadState === 'uploading'}
          className="group relative w-full overflow-hidden rounded-2xl py-4 px-6 font-black transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98] border focus:outline-none focus:ring-4 focus:ring-blue-400/40 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 text-white border-t-white/40 border-b-blue-700/60 border-x-blue-400/40 shadow-xl shadow-blue-500/35 hover:shadow-2xl hover:shadow-cyan-400/50 hover:-translate-y-0.5 cursor-pointer ring-1 ring-white/20 disabled:opacity-75 disabled:cursor-wait"
        >
          {/* Animated shimmer highlight on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"></div>

          {isAnalyzing || uploadState === 'uploading' ? (
            <div className="flex items-center gap-2.5 text-white">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-200" />
              <span className="text-sm sm:text-base font-bold tracking-wide">{t('scanner.analyzingBtn')}</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-yellow-300 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
              <span className="text-sm sm:text-base font-black tracking-wide">
                {files.length > 1
                  ? (t('scanner.actionBtnMulti') || 'Run Multi-Angle Analysis ({count} Angles)').replace('{count}', String(files.length))
                  : t('scanner.actionBtn')}
              </span>
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-200 flex-shrink-0" />
            </>
          )}
        </button>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 justify-center pt-1">
          <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>{t('scanner.privacyNote')}</span>
        </div>
      </form>
    </div>
  );
}
