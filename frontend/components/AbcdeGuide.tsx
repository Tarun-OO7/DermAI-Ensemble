'use client';

import React, { useState } from 'react';
import { BookOpen, ShieldAlert, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

interface AbcdeItem {
  letter: string;
  title: string;
  shortDesc: string;
  details: string;
  whatToLookFor: string[];
  safeComparison: string;
}

const ABCDE_DATA: AbcdeItem[] = [
  {
    letter: 'A',
    title: 'Asymmetry',
    shortDesc: 'One half does not match the other half',
    details: 'If you draw a line through the middle of the mole or spot, the two halves should look mirror-like. In melanoma lesions, the halves are often asymmetrical.',
    whatToLookFor: [
      'One side is round while the other is uneven',
      'Unequal distribution of color or thickness across halves',
      'Irregular lopsided shape'
    ],
    safeComparison: 'Benign moles are usually symmetrical (round or oval).'
  },
  {
    letter: 'B',
    title: 'Border',
    shortDesc: 'Irregular, scalloped, or notched edges',
    details: 'The borders of early melanomas tend to be uneven, jagged, or blurred. The pigment may spread into the surrounding skin.',
    whatToLookFor: [
      'Frayed, blurred, or faded outer boundaries',
      'Notched, jagged, or scalloped edges',
      'Loss of sharp edge definition'
    ],
    safeComparison: 'Benign moles typically have smooth, clean, even borders.'
  },
  {
    letter: 'C',
    title: 'Color',
    shortDesc: 'Varying shades of brown, tan, black, red, or white',
    details: 'A variety of colors is another warning signal. While benign moles are usually a single shade of brown or tan, melanoma may have multiple shades.',
    whatToLookFor: [
      'Different shades of brown, tan, or deep black in one spot',
      'Patches of pink, red, white, or blue appearing',
      'Uneven pigment blotchiness'
    ],
    safeComparison: 'Benign moles are usually uniform in one single shade.'
  },
  {
    letter: 'D',
    title: 'Diameter',
    shortDesc: 'Larger than 6mm (pencil eraser size)',
    details: 'Melanomas are usually larger than 6 millimeters across when diagnosed, but they can sometimes be smaller when first detected.',
    whatToLookFor: [
      'Spot measures greater than 6 mm (approx. 1/4 inch)',
      'Lesion is noticeably larger than your other moles',
      'Rapidly expanding width or height'
    ],
    safeComparison: 'Most normal moles remain under 6mm throughout life.'
  },
  {
    letter: 'E',
    title: 'Evolving',
    shortDesc: 'Changing in size, shape, color, or causing new symptoms',
    details: 'Any change in size, shape, color, or elevation of a spot on your skin is the most critical warning sign. Also note new symptoms like bleeding or itching.',
    whatToLookFor: [
      'Mole is getting darker, larger, or changing shape over weeks/months',
      'New itching, crusting, flaking, or spontaneous bleeding',
      'Sudden appearance of a new firm bump (nodular melanoma)'
    ],
    safeComparison: 'Benign moles typically look unchanged year after year.'
  }
];

export default function AbcdeGuide() {
  const [activeTab, setActiveTab] = useState<string>('A');
  const selected = ABCDE_DATA.find((item) => item.letter === activeTab) || ABCDE_DATA[0];

  return (
    <section id="abcde-guide" className="my-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            ABCDE Mole Self-Check Guide
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Clinical self-examination criteria recommended by the American Academy of Dermatology
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-2 my-6">
        {ABCDE_DATA.map((item) => {
          const isActive = item.letter === activeTab;
          return (
            <button
              key={item.letter}
              type="button"
              onClick={() => setActiveTab(item.letter)}
              className={`py-3 px-2 rounded-2xl border text-center transition-all duration-150 active:scale-95 flex flex-col items-center justify-center ${
                isActive
                  ? 'bg-cyan-500 text-white border-cyan-600 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-lg font-black">{item.letter}</span>
              <span className="text-[10px] font-bold truncate max-w-full hidden sm:inline opacity-90">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Card */}
      <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 transition-all animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
          <div>
            <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Letter {selected.letter}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {selected.letter} for {selected.title}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selected.shortDesc}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
          {selected.details}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          {/* What to look for */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <strong className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-2">
              <ChevronRight className="w-3.5 h-3.5" /> Warning Signs to Watch:
            </strong>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {selected.whatToLookFor.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Normal Comparison */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <strong className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Normal / Benign Baseline:
            </strong>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selected.safeComparison}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Clinical Caveat */}
      <div className="mt-5 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Important Clinical Caveat:</strong> Meeting <em>none</em> of the ABCDE criteria does not guarantee a skin spot is harmless. Some atypical skin cancers develop without classic ABCDE features. If any spot bleeds, itches, hurts, or feels suspicious, consult a licensed dermatologist.
        </div>
      </div>
    </section>
  );
}
