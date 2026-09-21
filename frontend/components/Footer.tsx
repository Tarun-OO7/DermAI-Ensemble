'use client';

import React from 'react';
import { Target, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  const scrollTo = (id: string) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <footer className="w-full bg-white/90 dark:bg-[#0B0F19]/90 border-t border-slate-200/80 dark:border-slate-800/80 pt-10 pb-8 mt-16 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-slate-200 dark:border-slate-800">
          {/* Brand & Purpose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {t('nav.brand')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              {t('footer.brandDesc')}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-normal">
              {t('footer.privacyLine')}
            </p>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('footer.navTitle')}
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('how-it-works')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {t('nav.howItWorks')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('scanner-tool')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {t('nav.scanSpot')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('faq')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {t('nav.faq')}
                </button>
              </li>
              <li>
                <a
                  href="https://find-a-derm.aad.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline transition-colors"
                >
                  {t('locator.aadTitle')} ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Medical Notice */}
          <div className="space-y-2 bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>{t('footer.safetyTitle')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {t('footer.safetyDesc')}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p className="text-[11px]">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://www.isic-archive.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ISIC Archive
            </a>
            <span>&bull;</span>
            <a
              href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              HAM10000 Dataset
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
