import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiagnosticInput from '../../components/DiagnosticInput';

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
});

afterAll(() => {
  (global.URL.createObjectURL as jest.Mock).mockReset();
});

describe('DiagnosticInput Component', () => {
  const mockOnResult = jest.fn();
  const mockOnStartAnalysis = jest.fn();
  
  beforeEach(() => {
    global.fetch = jest.fn();
    mockOnResult.mockClear();
    mockOnStartAnalysis.mockClear();
  });

  it('renders skin photo title and dropzone', () => {
    render(
      <DiagnosticInput
        onResult={mockOnResult}
        onStartAnalysis={mockOnStartAnalysis}
        isAnalyzing={false}
      />
    );
    expect(screen.getByText(/Upload Skin Photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Skin Spot & Lesion Check/i)).toBeInTheDocument();
    expect(screen.getByText(/Try with sample/i)).toBeInTheDocument();
  });

  it('submits skin photo scan and receives result with Run Skin Analysis button', async () => {
    const mockResponse = {
      id: 1,
      cancer_type: 'skin',
      prediction: 'nv',
      confidence_score: 0.96,
      image_url: '/uploads/test.png',
      created_at: new Date().toISOString()
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <DiagnosticInput
        onResult={mockOnResult}
        onStartAnalysis={mockOnStartAnalysis}
        isAnalyzing={false}
      />
    );
    
    const file = new File(['dummy content'], 'mole.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run skin analysis/i })).toBeInTheDocument();
    });
    const submitBtn = screen.getByRole('button', { name: /run skin analysis/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchArgs[0]).toBe('/api/diagnostic/skin');
    
    await waitFor(() => {
      expect(mockOnResult).toHaveBeenCalledWith(mockResponse, expect.anything());
    });
  });
});
