'use client';

import React, { useEffect, useState } from 'react';
import { History, X, Trash2, Calendar, ShieldCheck, AlertTriangle, ExternalLink, RefreshCw, Lock } from 'lucide-react';
import { DiagnosticResult, DISEASE_MAP } from '../types';
import { getAllScans, deleteScan, clearAllScans, StoredScan } from '../lib/db';

interface ScanHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScan: (scan: DiagnosticResult) => void;
  onHistoryUpdated?: () => void;
}

export default function ScanHistory({ isOpen, onClose, onSelectScan, onHistoryUpdated }: ScanHistoryProps) {
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getAllScans();
    setScans(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteScan(id);
    await loadHistory();
    if (onHistoryUpdated) onHistoryUpdated();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all saved scan history? This action cannot be undone.')) {
      await clearAllScans();
      await loadHistory();
      if (onHistoryUpdated) onHistoryUpdated();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Scan History</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {scans.length} {scans.length === 1 ? 'record' : 'records'} in browser storage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close history drawer"
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Local Privacy Note */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          <span>Saved privately in this browser (IndexedDB). Never shared externally.</span>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <span className="text-xs">Loading saved scans...</span>
            </div>
          ) : scans.length === 0 ? (
            <div className="py-24 text-center text-slate-400 dark:text-slate-500 px-6">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No scans saved yet</p>
              <p className="text-xs mt-1 text-slate-500">
                Whenever you check a skin photo, it will be automatically logged here for easy review.
              </p>
            </div>
          ) : (
            scans.map((scan) => {
              const disease = DISEASE_MAP[scan.prediction.toLowerCase()] || {
                friendlyName: scan.prediction,
                clinicalName: scan.prediction,
                urgency: 'routine',
                type: 'benign'
              };
              const isHigh = disease.urgency === 'high';
              const confidencePercent = Math.round(scan.confidence_score * 100);
              const formattedDate = new Date(scan.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const imageUrl = scan.image_url?.startsWith('http')
                ? scan.image_url
                : `http://localhost:8000${scan.image_url}`;

              return (
                <div
                  key={scan.id}
                  onClick={() => {
                    onSelectScan(scan);
                    onClose();
                  }}
                  className="group p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 active:scale-[0.99]"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt="Scan Thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-full ${
                          isHigh
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {disease.type}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                        {confidencePercent}% AI Certainty
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {disease.friendlyName}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formattedDate}
                      </span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold group-hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>

                  {/* Delete Item Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(scan.id, e)}
                    title="Delete this scan from history"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Clear All Control */}
        {scans.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Permanent deletion
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
