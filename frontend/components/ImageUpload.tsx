'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { CancerType, DiagnosticResult, UploadState } from '../types';
import constants from '../constants.json';

interface ImageUploadProps {
  onResult: (result: DiagnosticResult) => void;
}

export default function ImageUpload({ onResult }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cancerType, setCancerType] = useState<CancerType>('skin');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadState('idle');
      setErrorMsg(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadState('idle');
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploadState('uploading');
    setErrorMsg(null);

    const size_mb = file.size / (1024 * 1024);
    if (size_mb > constants.MAX_IMAGE_SIZE_MB) {
      setUploadState('idle');
      setErrorMsg(`File too large. Max size is ${constants.MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/diagnostic/${cancerType}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data: DiagnosticResult = await response.json();
      setUploadState('success');
      onResult(data);
    } catch (err: any) {
      setUploadState('error');
      setErrorMsg(err.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">New Diagnosis</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Select Cancer Type
          </label>
          <select
            value={cancerType}
            onChange={(e) => setCancerType(e.target.value as CancerType)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="skin">Skin Cancer</option>
            <option value="breast">Breast Cancer</option>
            <option value="lung">Lung Cancer</option>
          </select>
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png"
            className="hidden"
          />
          
          {previewUrl ? (
            <div className="flex flex-col items-center">
              <img src={previewUrl} alt="Preview" className="h-48 object-contain rounded-md mb-4 shadow-sm" />
              <span className="text-sm text-slate-600">Click or drag to replace image</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-500">
              <UploadCloud className="w-12 h-12 mb-3 text-slate-400" />
              <p className="font-medium text-slate-700 mb-1">Click to upload or drag and drop</p>
              <p className="text-xs">JPG, JPEG, PNG (max 10MB)</p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploadState === 'uploading'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadState === 'uploading' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Run Analysis'
          )}
        </button>
      </form>
    </div>
  );
}
