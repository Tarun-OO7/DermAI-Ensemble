'use client';

import React, { useEffect, useState } from 'react';
import { Target, Activity, ShieldAlert } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import EmergencyModal from './EmergencyModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { checkBackendHealth } from '../lib/api';

export default function Header() {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let pollInterval = 30000; // 30s base interval

    const verify = async () => {
      const online = await checkBackendHealth();
      if (!isMounted) return;
      setIsOnline(online);

      // Exponential backoff if offline (up to 2 minutes max), reset to 30s when online
      if (!online) {
        pollInterval = Math.min(pollInterval * 1.5, 120000);
      } else {
        pollInterval = 30000;
      }

      timeoutId = setTimeout(verify, pollInterval);
    };

    verify();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const scrollTo = (id: string) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <>
      <header className="w-full bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-3.5 sticky top-0 z-40 transition-colors duration-200 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {t('nav.brand')}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('nav.subtitle')}
              </p>
            </div>
          </div>

          {/* Center Nav Links (Hidden on small mobile) */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('nav.howItWorks')}
            </button>
            <button
              type="button"
              onClick={() => scrollTo('scanner-tool')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('nav.scanSpot')}
            </button>
            <button
              type="button"
              onClick={() => scrollTo('faq')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('nav.faq')}
            </button>
          </nav>

          {/* Right Actions: Language Switcher + System Health Status + Emergency Help + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Language Switcher Dropdown */}
            <LanguageSwitcher />

            {/* Real Health Status Pill */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                isOnline === true
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : isOnline === false
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title={
                isOnline === true
                  ? 'ML backend is active and ready'
                  : isOnline === false
                  ? 'Cannot reach backend service'
                  : 'Checking server health...'
              }
            >
              <Activity
                className={`w-3.5 h-3.5 ${
                  isOnline === true
                    ? 'text-emerald-600 dark:text-emerald-400 animate-pulse motion-reduce:animate-none'
                    : isOnline === false
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400'
                }`}
              />
              <span>
                {isOnline === true
                  ? t('nav.systemReady')
                  : isOnline === false
                  ? t('nav.offlineMode')
                  : t('nav.connecting')}
              </span>
            </div>

            {/* Emergency Help Button (Sole trigger for EmergencyModal) */}
            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              aria-label="Open emergency contacts and medical helplines"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">{t('nav.emergencyBtn')}</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Global Emergency Modal */}
      <EmergencyModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </>
  );
}
