'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Faq() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: t('faq.q1.q'),
      answer: t('faq.q1.a'),
    },
    {
      question: t('faq.q2.q'),
      answer: t('faq.q2.a'),
    },
    {
      question: t('faq.q3.q'),
      answer: t('faq.q3.a'),
    },
    {
      question: t('faq.q4.q'),
      answer: t('faq.q4.a'),
    },
  ];

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-12 sm:py-16 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3 shadow-2xs">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('faq.badge')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {t('faq.title')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
          {t('faq.subtitle')}
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3.5">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                aria-expanded={isOpen}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none cursor-pointer"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3 animate-in fade-in duration-200 font-normal">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
