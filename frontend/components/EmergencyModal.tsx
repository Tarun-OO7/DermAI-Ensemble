'use client';

import React from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert, Stethoscope, Globe, ExternalLink, HeartPulse } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyModal({ isOpen, onClose }: EmergencyModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-rose-500/10 dark:bg-rose-950/40 p-5 sm:p-6 border-b border-rose-100 dark:border-rose-900/40 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="emergency-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {t('emergency.title')}
              </h2>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                {t('emergency.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close emergency modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Acute Emergency Alert */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{t('emergency.acuteTitle')}</span>
            </div>
            <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
              {t('emergency.acuteDesc')}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <a
                href="tel:911"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-center shadow-xs active:scale-95 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>911 (US/CA)</span>
              </a>
              <a
                href="tel:112"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-center shadow-xs active:scale-95 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>112 (EU/IN)</span>
              </a>
              <a
                href="tel:999"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-center shadow-xs active:scale-95 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>999 (UK)</span>
              </a>
            </div>
          </div>

          {/* Cancer & Medical Helplines */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
              <HeartPulse className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('emergency.helplinesTitle')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('emergency.helplinesSubtitle')}
            </p>
            <div className="space-y-2">
              <a
                href="tel:18002272345"
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {t('emergency.acsTitle')}
                  </span>
                  <span className="text-[11px] text-slate-500">{t('emergency.acsHours')}</span>
                </div>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  1-800-227-2345
                </span>
              </a>

              <a
                href="tel:18004226237"
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {t('emergency.nciTitle')}
                  </span>
                  <span className="text-[11px] text-slate-500">{t('emergency.nciHours')}</span>
                </div>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  1-800-4-CANCER
                </span>
              </a>
            </div>
          </div>

          {/* Find a Board-Certified Dermatologist */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('emergency.certifiedTitle')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('emergency.certifiedDesc')}
            </p>
            <a
              href="https://find-a-derm.aad.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-blue-600 dark:text-blue-400 font-bold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{t('locator.aadTitle')}</span>
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {t('emergency.closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
