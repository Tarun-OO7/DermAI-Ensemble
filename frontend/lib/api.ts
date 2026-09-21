import { DiagnosticResult } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: 'TIMEOUT' | 'NETWORK_ERROR' | 'FILE_ERROR' | 'SERVER_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function analyzeSkinPhoto(
  file: File,
  timeoutMs: number = 20000
): Promise<DiagnosticResult> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/diagnostic/skin', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail || `Server returned status ${response.status}`;
      throw new ApiError(detail, response.status, 'SERVER_ERROR');
    }

    const data: DiagnosticResult = await response.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The server took too long to process the scan. Please try again.',
        408,
        'TIMEOUT'
      );
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      'Unable to connect to the backend server. Please make sure the API is running.',
      0,
      'NETWORK_ERROR'
    );
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
