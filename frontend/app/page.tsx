'use client';

import React, { useState } from "react";
import ImageUpload from "../components/ImageUpload";
import ResultsDisplay from "../components/ResultsDisplay";
import { DiagnosticResult } from "../types";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">AI-Powered Diagnostic Analysis</h2>
        <p className="text-slate-600 max-w-2xl">
          Upload pathology slides or dermatological scans for rapid, AI-assisted screening. Our machine learning models provide preliminary analysis for skin, breast, and lung tissues.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <strong>Medical Disclaimer:</strong> This application is for demonstration and research purposes only. The AI predictions should not be used for clinical decision making or replace professional medical judgment. Always consult a qualified healthcare provider for proper diagnosis and treatment.
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <section>
          <ImageUpload onResult={(data) => setResult(data)} />
        </section>
        
        <section className="h-full">
          <ResultsDisplay result={result} />
        </section>
      </div>
    </div>
  );
}
