'use client';

import React, { useState } from 'react';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import DiagnosticInput from '../components/DiagnosticInput';
import DiagnosticResults from '../components/DiagnosticResults';
import Faq from '../components/Faq';
import Footer from '../components/Footer';
import { DiagnosticResult } from '../types';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResult = (data: DiagnosticResult, localUrl?: string | null) => {
    setResult(data);
    if (localUrl) setLocalImagePreview(localUrl);
    setIsAnalyzing(false);
    setErrorMessage(null);
  };

  const handleStartAnalysis = (localUrl?: string | null) => {
    setIsAnalyzing(true);
    if (localUrl) setLocalImagePreview(localUrl);
    setErrorMessage(null);
  };

  const handleReset = () => {
    setResult(null);
    setLocalImagePreview(null);
    setIsAnalyzing(false);
    setErrorMessage(null);
  };

  const handleError = (msg: string) => {
    setIsAnalyzing(false);
    setErrorMessage(msg);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex-1 w-full">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. 3-Step "How It Works" Section */}
        <HowItWorks />

        {/* 3. Core Scanner Tool (2-Card Layout) */}
        <section id="scanner-tool" className="py-12 sm:py-16 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {t('scanner.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
              {t('scanner.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-start">
            <section aria-label="Photo Upload Section">
              <DiagnosticInput
                onResult={handleResult}
                onStartAnalysis={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
                onError={handleError}
              />
            </section>

            <section aria-label="AI Results Section" className="h-full">
              <DiagnosticResults
                result={result}
                localImagePreview={localImagePreview}
                isAnalyzing={isAnalyzing}
                onReset={handleReset}
                errorMessage={errorMessage}
              />
            </section>
          </div>
        </section>

        {/* 4. Frequently Asked Questions */}
        <Faq />
      </div>

      {/* 5. Complete Website Footer */}
      <Footer />
    </div>
  );
}
