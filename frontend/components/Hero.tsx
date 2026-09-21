'use client';

import React from 'react';
import { ArrowDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Hero() {
  const { t } = useLanguage();

  const scrollTo = (id: string) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <section className="relative pt-12 pb-12 sm:pt-16 sm:pb-16 text-center overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[260px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-cyan-500/10 blur-3xl -z-10 pointer-events-none rounded-full"></div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Professional Headline */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
          {t('hero.title')}
        </h1>

        {/* Professional Subhead */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-8 font-normal">
          {t('hero.description')}
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollTo('scanner-tool')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 text-white text-xs font-bold transition-all duration-150 active:scale-95 shadow-lg shadow-blue-500/25 cursor-pointer"
          >
            <span>{t('hero.ctaScan')}</span>
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => scrollTo('how-it-works')}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
          >
            <span>{t('hero.ctaLearn')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
