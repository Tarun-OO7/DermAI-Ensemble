'use client';

import React, { useState } from 'react';
import {
  Target,
  CheckCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  FileText,
  ArrowRight,
  Stethoscope,
  ClipboardList,
  BookOpen,
  Microscope,
  CheckCircle2,
  Sun,
  Camera,
  Layers,
  FileDown,
} from 'lucide-react';
import { DiagnosticResult, DISEASE_MAP, GENERAL_DOCTOR_QUESTIONS } from '../types';
import { downloadAnalysisReportPdf } from '../lib/pdfGenerator';
import GradCamOverlay from './GradCamOverlay';
import DermatologistLocator from './DermatologistLocator';
import { useLanguage } from '../context/LanguageContext';

interface DiagnosticResultsProps {
  result: DiagnosticResult | null;
  localImagePreview?: string | null;
  isAnalyzing: boolean;
  onReset: () => void;
  errorMessage?: string | null;
}

export default function DiagnosticResults({
  result,
  localImagePreview,
  isAnalyzing,
  onReset,
  errorMessage,
}: DiagnosticResultsProps) {
  const { t, tArray } = useLanguage();
  const [showDoctorQuestions, setShowDoctorQuestions] = useState(false);
  const [showDetailedGuide, setShowDetailedGuide] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 1. Error State
  if (errorMessage) {
    return (
      <div className="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-3xl border border-rose-200 dark:border-rose-900/50 p-6 sm:p-7 shadow-xl shadow-rose-500/5 min-h-[440px] flex flex-col justify-between">
        <div className="flex items-center gap-2.5 pb-4 border-b border-rose-100 dark:border-rose-950">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {t('results.errorTitle')}
          </h2>
        </div>

        <div className="py-8 text-center px-4 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-700 dark:text-rose-300 mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('results.errorSubtitle')}
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm mx-auto leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all active:scale-95"
        >
          {t('results.tryAgain')}
        </button>
      </div>
    );
  }

  // 2. Loading State (Matching Laser Sweep / Shimmer Language)
  if (isAnalyzing) {
    return (
      <div className="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xl shadow-blue-500/5 min-h-[440px] flex flex-col justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto shadow-inner">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-600 dark:text-blue-400 motion-reduce:animate-none" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('results.analyzingTitle')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
            {t('results.analyzingDesc')}
          </p>
        </div>
        <div className="w-44 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mx-auto">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full w-2/3 rounded-full animate-pulse motion-reduce:animate-none"></div>
        </div>
      </div>
    );
  }

  // 3. Empty State (Ready for Photo)
  if (!result) {
    return (
      <div className="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xl shadow-blue-500/5 min-h-[440px] flex flex-col transition-colors duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t('results.cardTitle')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{t('results.badge')}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
          <div className="w-14 h-14 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4 shadow-2xs">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">
            {t('results.readyTitle')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
            {t('results.readyDesc')}
          </p>

          <div className="space-y-2.5 text-left w-full max-w-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              {t('results.tipsTitle')}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{t('results.tip1')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{t('results.tip2')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{t('results.tip3')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Finished Result State - Multilingual Lookups
  const diseaseKey = result.prediction.toLowerCase();
  const fallbackInfo = DISEASE_MAP[diseaseKey] || {
    code: diseaseKey,
    friendlyName: result.prediction,
    clinicalName: result.prediction,
    urgency: 'routine',
    type: 'benign',
    categoryBadge: 'Detected Spot',
    whatIsIt: 'Automated AI pattern match for this skin group.',
    recommendedNextStep: 'Mention it at your next regular checkup if you have any questions.',
    detailedOverview: '',
    visualCharacteristics: [],
    riskFactors: [],
    clinicalImportance: '',
  };

  const friendlyName = t(`diseases.${diseaseKey}.friendlyName`) !== `diseases.${diseaseKey}.friendlyName`
    ? t(`diseases.${diseaseKey}.friendlyName`)
    : fallbackInfo.friendlyName;

  const clinicalName = t(`diseases.${diseaseKey}.clinicalName`) !== `diseases.${diseaseKey}.clinicalName`
    ? t(`diseases.${diseaseKey}.clinicalName`)
    : fallbackInfo.clinicalName;

  const categoryBadge = t(`diseases.${diseaseKey}.categoryBadge`) !== `diseases.${diseaseKey}.categoryBadge`
    ? t(`diseases.${diseaseKey}.categoryBadge`)
    : fallbackInfo.categoryBadge;

  const type = t(`diseases.${diseaseKey}.type`) !== `diseases.${diseaseKey}.type`
    ? t(`diseases.${diseaseKey}.type`)
    : fallbackInfo.type;

  const whatIsIt = t(`diseases.${diseaseKey}.whatIsIt`) !== `diseases.${diseaseKey}.whatIsIt`
    ? t(`diseases.${diseaseKey}.whatIsIt`)
    : fallbackInfo.whatIsIt;

  const recommendedNextStep = t(`diseases.${diseaseKey}.recommendedNextStep`) !== `diseases.${diseaseKey}.recommendedNextStep`
    ? t(`diseases.${diseaseKey}.recommendedNextStep`)
    : fallbackInfo.recommendedNextStep;

  const detailedOverview = t(`diseases.${diseaseKey}.detailedOverview`) !== `diseases.${diseaseKey}.detailedOverview`
    ? t(`diseases.${diseaseKey}.detailedOverview`)
    : fallbackInfo.detailedOverview;

  const visualCharacteristics = tArray(`diseases.${diseaseKey}.visualCharacteristics`).length > 0
    ? tArray(`diseases.${diseaseKey}.visualCharacteristics`)
    : fallbackInfo.visualCharacteristics;

  const riskFactors = tArray(`diseases.${diseaseKey}.riskFactors`).length > 0
    ? tArray(`diseases.${diseaseKey}.riskFactors`)
    : fallbackInfo.riskFactors;

  const clinicalImportance = t(`diseases.${diseaseKey}.clinicalImportance`) !== `diseases.${diseaseKey}.clinicalImportance`
    ? t(`diseases.${diseaseKey}.clinicalImportance`)
    : fallbackInfo.clinicalImportance;

  const doctorQuestions = tArray('doctorQuestionsList').length > 0
    ? tArray('doctorQuestionsList')
    : GENERAL_DOCTOR_QUESTIONS;

  const confidencePercent = Math.round(result.confidence_score * 100);
  const isLowConfidence = confidencePercent < 70;
  const isHighUrgency = fallbackInfo.urgency === 'high';
  const isModerateUrgency = fallbackInfo.urgency === 'moderate';

  // Patient context notes
  const ctx = result.symptom_context;
  const hasNotes = ctx && (ctx.duration || ctx.changes || (ctx.symptoms && ctx.symptoms.length > 0));
  const hasConcerningSymptoms = ctx?.symptoms?.some((s) => s.includes('Bleeding') || s.includes('Pain')) || ctx?.changes?.includes('Growing');

  // Top predictions for low-confidence breakdown
  let topMatchName = friendlyName;
  let secondMatchName = '';
  let top1Pct = confidencePercent;
  let top2Pct = 0;
  let otherRemainderPct = 0;

  if (result.probabilities) {
    const sorted = Object.entries(result.probabilities).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      const k1 = sorted[0][0].toLowerCase();
      topMatchName = t(`diseases.${k1}.friendlyName`) !== `diseases.${k1}.friendlyName`
        ? t(`diseases.${k1}.friendlyName`)
        : (DISEASE_MAP[k1]?.friendlyName || sorted[0][0]);
      top1Pct = Math.round(sorted[0][1] * 100);
    }
    if (sorted[1]) {
      const k2 = sorted[1][0].toLowerCase();
      secondMatchName = t(`diseases.${k2}.friendlyName`) !== `diseases.${k2}.friendlyName`
        ? t(`diseases.${k2}.friendlyName`)
        : (DISEASE_MAP[k2]?.friendlyName || sorted[1][0]);
      top2Pct = Math.round(sorted[1][1] * 100);
    }
    otherRemainderPct = Math.max(0, 100 - top1Pct - top2Pct);
  }

  const formattedDate = new Date(result.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullImageUrl = result.image_url.startsWith('http')
    ? result.image_url
    : `http://localhost:8000${result.image_url}`;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadAnalysisReportPdf(result, localImagePreview || fullImageUrl);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xl shadow-blue-500/5 dark:shadow-indigo-500/10 flex flex-col space-y-4 transition-colors duration-200 animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Microscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t('results.title')}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('results.modelSubtitle')}
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200/80 dark:border-blue-800/60">
          {t('results.badge')}
        </span>
      </div>

      {/* Main Condition Result Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isHighUrgency
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-100'
            : isModerateUrgency
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isHighUrgency
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                : isModerateUrgency
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isHighUrgency ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Stethoscope className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 truncate">
                {categoryBadge}
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isHighUrgency
                    ? 'bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-300'
                    : isModerateUrgency
                    ? 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {type}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              {friendlyName}
            </h3>

            <p className="text-xs opacity-75 mt-0.5">
              {t('results.clinicalClassLabel')} <span className="font-semibold">{clinicalName}</span> ({fallbackInfo.code})
            </p>
          </div>
        </div>
      </div>

      {/* Real Grad-CAM AI Explainability Attention Overlay */}
      {result.heatmap_image && (
        <GradCamOverlay
          rawImageUrl={localImagePreview || fullImageUrl}
          heatmapImageUrl={result.heatmap_image}
          predictedClass={friendlyName}
        />
      )}

      {/* Non-Skin Photo Heuristic Advisory (Soft Safeguard) */}
      {result.is_potential_non_skin && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 animate-in fade-in">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-blue-950 dark:text-blue-100">{t('results.nonSkinAdvisory.title')}</span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {t('results.nonSkinAdvisory.desc')}
            </p>
          </div>
        </div>
      )}

      {/* Low-Confidence AI Breakdown & Photo Quality Retake Guidance */}
      {isLowConfidence && (
        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-500/25 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>{t('results.confidenceBreakdown.title')}</span>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('results.confidenceBreakdown.desc')}
          </p>

          {/* Visual Top-3 Probability Bars */}
          <div className="space-y-2.5 pt-1">
            {/* Top Match */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1 font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>{t('results.topMatch')}: {topMatchName}</span>
                </span>
                <span className="font-mono font-bold">{top1Pct}%</span>
              </div>
              <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${top1Pct}%` }}
                ></div>
              </div>
            </div>

            {/* Also Possible */}
            {secondMatchName && top2Pct > 0 && (
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1 font-semibold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{t('results.alsoPossible')}: {secondMatchName}</span>
                  </span>
                  <span className="font-mono font-bold">{top2Pct}%</span>
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${top2Pct}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Other Possibilities (combined remainder) */}
            {otherRemainderPct > 0 && (
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1 font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>{t('results.otherCategories')}</span>
                  </span>
                  <span className="font-mono font-bold">{otherRemainderPct}%</span>
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${otherRemainderPct}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Actionable Photo Quality Retake Tip */}
          <div className="flex items-start gap-2 pt-2 border-t border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
            <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t('results.confidenceBreakdown.tip')}
            </p>
          </div>
        </div>
      )}

      {/* Urgent Care Card & Nearby Dermatologist Clinic Locator for High-Risk (mel/bcc) or Concerning Symptoms */}
      {(isHighUrgency || hasConcerningSymptoms) && (
        <DermatologistLocator />
      )}

      {/* Patient Questionnaire Notes Summary (if provided) */}
      {hasNotes && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/70 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t('results.reportedDetails')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] pt-0.5">
            {ctx.duration && (
              <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700">
                {t('results.durationPrefix')} <strong>{ctx.duration}</strong>
              </span>
            )}
            {ctx.changes && (
              <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700">
                {t('results.changesPrefix')} <strong>{ctx.changes}</strong>
              </span>
            )}
            {ctx.symptoms && ctx.symptoms.length > 0 && ctx.symptoms[0] !== 'None' && (
              <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700">
                {t('results.symptomsPrefix')} <strong>{ctx.symptoms.join(', ')}</strong>
              </span>
            )}
          </div>

          {hasConcerningSymptoms && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium pt-1">
              {t('results.concerningNote')}
            </p>
          )}
        </div>
      )}

      {/* AI Confidence Gauge */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {t('results.aiCertainty')}
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
            {confidencePercent}%
          </span>
        </div>
        <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isHighUrgency
                ? 'bg-rose-500'
                : isModerateUrgency
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
            }`}
            style={{ width: `${confidencePercent}%` }}
          ></div>
        </div>
      </div>

      {/* Structured "What is it?" & "Recommended Next Step" */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2.5 text-xs">
        <div>
          <strong className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5 mb-0.5">
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {t('results.whatIsItTitle')}
          </strong>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {whatIsIt}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <strong className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5 mb-0.5">
            <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {t('results.recommendedStepTitle')}
          </strong>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {recommendedNextStep}
          </p>
        </div>
      </div>

      {/* Comprehensive Medical Guide & Key Characteristics Toggle */}
      {detailedOverview && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowDetailedGuide(!showDetailedGuide)}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('results.guideTitle')}</span>
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              {showDetailedGuide ? t('results.hideGuide') : t('results.showGuide')}
            </span>
          </button>

          {showDetailedGuide && (
            <div className="p-4 bg-white dark:bg-slate-900 space-y-3.5 border-t border-slate-200/80 dark:border-slate-800 text-xs animate-in fade-in duration-150">
              {/* Biological Overview */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <Microscope className="w-3.5 h-3.5" />
                  {t('results.bioOverviewTitle')}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {detailedOverview}
                </p>
              </div>

              {/* Visual Characteristics */}
              {visualCharacteristics && visualCharacteristics.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('results.visualSignsTitle')}
                  </h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    {visualCharacteristics.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Factors */}
              {riskFactors && riskFactors.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <Sun className="w-3.5 h-3.5" />
                    {t('results.riskFactorsTitle')}
                  </h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    {riskFactors.map((rf, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Importance */}
              {clinicalImportance && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('results.whyMattersTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {clinicalImportance}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helpful Safe Questions to Ask Your Doctor Toggle */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDoctorQuestions(!showDoctorQuestions)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {t('results.doctorQuestions')}
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
            {showDoctorQuestions ? t('results.hidePrompts') : t('results.showPrompts')}
          </span>
        </button>

        {showDoctorQuestions && (
          <div className="p-3.5 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-150">
            {doctorQuestions.map((q, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                <span className="leading-relaxed">&quot;{q}&quot;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1-Click PDF Report Action Button */}
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-blue-500/20 disabled:opacity-60 cursor-pointer border-t border-white/20"
      >
        {isGeneratingPdf ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
            <span>{t('results.generatingPdf')}</span>
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4 text-blue-100" />
            <span>{t('results.downloadPdf')}</span>
          </>
        )}
      </button>

      {/* Persistent One-Line Medical Disclaimer */}
      <div className="p-3 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span>
          <strong>{t('results.notice')}</strong> {t('results.disclaimer')}
        </span>
      </div>

      {/* Metadata & Reset Button */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0">
            <img
              src={fullImageUrl}
              alt="Scan Thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block truncate">{formattedDate}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">Scan #{result.id}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('results.resetBtn')}</span>
        </button>
      </div>
    </div>
  );
}
