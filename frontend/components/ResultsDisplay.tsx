'use client';

import React from 'react';
import { DiagnosticResult } from '../types';
import { ShieldCheck, AlertTriangle, Calendar, Activity } from 'lucide-react';

interface ResultsDisplayProps {
  result: DiagnosticResult | null;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  if (!result) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center text-slate-500 text-center min-h-[400px]">
        <Activity className="w-16 h-16 mb-4 text-slate-300" />
        <p className="text-lg font-medium text-slate-600">No active diagnosis</p>
        <p className="text-sm mt-2 max-w-xs">Upload a scan and run the analysis to view diagnostic results here.</p>
      </div>
    );
  }

  const isMalignant = result.prediction === 'malignant';
  const confidencePercent = Math.round(result.confidence_score * 100);
  const imageUrl = `http://localhost:8000${result.image_url}`;
  
  const formattedDate = new Date(result.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-6 text-slate-800">Diagnostic Results</h2>
      
      <div className="flex-1 space-y-6">
        {/* Main Prediction Badge */}
        <div className={`p-5 rounded-xl border ${isMalignant ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} flex items-center gap-4`}>
          {isMalignant ? (
            <AlertTriangle className="w-10 h-10 text-red-600" />
          ) : (
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1 capitalize">{result.cancer_type} Scan</p>
            <h3 className={`text-2xl font-bold capitalize ${isMalignant ? 'text-red-700' : 'text-emerald-700'}`}>
              {result.prediction}
            </h3>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-medium text-slate-700">Confidence Score</span>
            <span className="text-lg font-bold text-slate-800">{confidencePercent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${isMalignant ? 'bg-red-500' : 'bg-emerald-500'}`} 
              style={{ width: `${confidencePercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            AI certainty metric based on similar historical pathology data.
          </p>
        </div>

        {/* Meta Info & Image */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date Processed
            </p>
            <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {formattedDate}
            </p>
          </div>
          <div>
             <p className="text-sm font-medium text-slate-700 mb-2">Uploaded Scan</p>
             <div className="bg-slate-100 rounded-lg border border-slate-200 overflow-hidden h-24 relative flex items-center justify-center">
                <img src={imageUrl} alt="Processed scan" className="object-cover h-full w-full" />
             </div>
          </div>
        </div>
      </div>
      
      {/* Medical Disclaimer Banner */}
      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <p className="text-xs text-orange-800 leading-relaxed">
          <strong>Disclaimer:</strong> This tool is for research and demonstration purposes only and does not provide medical advice. Predictions should not be used as a substitute for professional diagnosis. Consult a qualified healthcare professional for medical guidance.
        </p>
      </div>
    </div>
  );
}
