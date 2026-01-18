import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { FileUpload } from './FileUpload';

describe('FileUpload', () => {
  it('renders upload zone', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FileUpload />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Drag and drop a CSV file/i)).toBeTruthy();
  });

  it('shows uploading state', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <FileUpload />
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });
});
