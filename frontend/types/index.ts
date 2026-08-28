export type CancerType = 'skin' | 'breast' | 'lung';

export interface DiagnosticResult {
  id: number;
  cancer_type: CancerType;
  prediction: 'benign' | 'malignant';
  confidence_score: number;
  image_url: string;
  created_at: string;
}

export type UploadState = 'idle' | 'uploading' | 'success' | 'error';
