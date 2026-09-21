'use client';

import React from 'react';
import { Camera, Microscope, FileText, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      number: '01',
      icon: Camera,
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.desc'),
    },
    {
      number: '02',
      icon: Microscope,
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.desc'),
    },
    {
      number: '03',
      icon: FileText,
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.desc'),
    },
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-16 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('howItWorks.badge')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('howItWorks.title')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
          {t('howItWorks.subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="relative p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-blue-500/5 dark:shadow-indigo-500/10 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black text-slate-300 dark:text-slate-700 font-mono">
                  {step.number}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
