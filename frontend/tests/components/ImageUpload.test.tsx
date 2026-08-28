import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUpload from '../../components/ImageUpload';

// Mock URL.createObjectURL since it's not available in jsdom
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
});

afterAll(() => {
  (global.URL.createObjectURL as jest.Mock).mockReset();
});

describe('ImageUpload Component', () => {
  const mockOnResult = jest.fn();
  
  beforeEach(() => {
    global.fetch = jest.fn();
    mockOnResult.mockClear();
  });

  it('triggers upload handler correctly with a valid file', async () => {
    const mockResponse = {
      id: 1,
      cancer_type: 'lung',
      prediction: 'benign',
      confidence_score: 0.95,
      image_url: '/uploads/test.png',
      created_at: new Date().toISOString()
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<ImageUpload onResult={mockOnResult} />);
    
    // Create a mock file
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    
    // Find file input and upload file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /run analysis/i });
    fireEvent.click(submitBtn);

    // Verify fetch was called with the local Next.js proxy route, NOT the backend directly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchArgs[0]).toContain('/api/diagnostic/'); // Local route
    expect(fetchArgs[0]).not.toContain('localhost:8000'); // Never call backend directly
    expect(fetchArgs[1].headers).toBeUndefined(); // Headers should not contain API key
    expect(JSON.stringify(fetchArgs)).not.toContain('API_KEY'); // Ensure API key isn't leaked
    
    // Verify callback
    await waitFor(() => {
      expect(mockOnResult).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('rejects oversized files client-side before any network request is made', async () => {
    render(<ImageUpload onResult={mockOnResult} />);
    
    // Create a mock file > 10MB
    const bigFile = new File(['0'.repeat(11 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    // Overwrite the size property for testing purposes since File constructor size might differ based on jsdom
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    const submitBtn = screen.getByRole('button', { name: /run analysis/i });
    fireEvent.click(submitBtn);

    // Network request should NOT be made
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/File too large/i)).toBeInTheDocument();
    });
  });
});
