'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, Info, BarChart3, HelpCircle } from 'lucide-react';
import { DISEASE_MAP } from '../types';

interface ProbabilityChartProps {
  probabilities?: Record<string, number>;
  topPrediction: string;
  topConfidence: number;
}

export default function ProbabilityChart({ probabilities, topPrediction, topConfidence }: ProbabilityChartProps) {
  // Ordered classes: mel, bcc, akiec, nv, bkl, df, vasc
  const classOrder = ['mel', 'bcc', 'akiec', 'nv', 'bkl', 'df', 'vasc'];

  // Construct items with probabilities
  const items = classOrder.map((code) => {
    const disease = DISEASE_MAP[code];
    let prob = 0;

    if (probabilities && typeof probabilities[code] === 'number') {
      prob = probabilities[code];
    } else if (topPrediction.toLowerCase() === code) {
      prob = topConfidence;
    } else {
      // Small baseline for display if missing
      const remaining = Math.max(0, 1 - topConfidence);
      prob = remaining / 6;
    }

    const percent = Math.round(prob * 100);
    return {
      code,
      name: disease?.friendlyName || code,
      clinical: disease?.clinicalName || code,
      type: disease?.type || 'benign',
      urgency: disease?.urgency || 'routine',
      percent,
      prob,
      isTop: topPrediction.toLowerCase() === code,
    };
  });

  // Sort descending so highest probability is at the top
  items.sort((a, b) => b.prob - a.prob);

  const isLowConfidence = Math.round(topConfidence * 100) < 70;

  return (
    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            All 7 Skin Conditions Probability Breakdown
          </h4>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Softmax Multi-Class</span>
      </div>

      {isLowConfidence && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Uncertain Distribution:</strong> Top class is below 70%. Multiple skin conditions share similar patterns here.
          </span>
        </div>
      )}

      {/* 7-Class Bars */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const isHigh = item.urgency === 'high';
          const isMod = item.urgency === 'moderate';

          return (
            <div
              key={item.code}
              className={`p-2.5 rounded-xl border transition-all ${
                item.isTop
                  ? 'bg-white dark:bg-slate-900 border-cyan-300 dark:border-cyan-700 shadow-2xs ring-1 ring-cyan-500/20'
                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Colorblind-friendly Icon + Text Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      isHigh
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : isMod
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {isHigh ? (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    ) : isMod ? (
                      <Info className="w-2.5 h-2.5" />
                    ) : (
                      <ShieldCheck className="w-2.5 h-2.5" />
                    )}
                    <span>{item.type}</span>
                  </span>

                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    ({item.code})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
                  {item.isTop && (
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-200 dark:border-cyan-800">
                      Top Match
                    </span>
                  )}
                  <span className={`font-bold ${item.isTop ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-600 dark:text-slate-400'}`}>
                    {item.percent}%
                  </span>
                </div>
              </div>

              {/* Progress Fill Bar */}
              <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out motion-reduce:duration-0 ${
                    isHigh
                      ? 'bg-rose-500'
                      : isMod
                      ? 'bg-amber-500'
                      : item.isTop
                      ? 'bg-cyan-500'
                      : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                  style={{ width: `${Math.max(item.percent, 2)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
