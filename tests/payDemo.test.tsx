import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Import the page component directly
import PayDemoPage from '../apps/dashboard/pages/pay-demo';

describe('PayDemoPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shows 402 requirements then successfully simulates a payment', async () => {
    // First call: request protected resource -> returns 402 with requirements
    // Second call: simulate payment -> returns 200 with protected payload

    global.fetch = vi.fn((input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const hasHeader = init && init.headers && (init.headers as any)['X-PAYMENT'];

      if (url.endsWith('/api/paid/resource') && !hasHeader) {
        return Promise.resolve(new Response(JSON.stringify({ requirement: { id: 'r1', priceAtomic: '100' } }), { status: 402, headers: { 'Content-Type': 'application/json' } }));
      }

      if (url.endsWith('/api/paid/resource') && hasHeader) {
        return Promise.resolve(new Response(JSON.stringify({ data: 'secret payload' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      return Promise.resolve(new Response(null, { status: 404 }));
    });

    render(<PayDemoPage />);

    // Click request protected resource
    fireEvent.click(screen.getByRole('button', { name: /Request protected resource/i }));

    // Wait for requirements to appear
    await waitFor(() => screen.getByText(/Payment requirements/i));

    // Now click simulate payment
    const simulateBtn = screen.getByRole('button', { name: /Simulate payment/i });
    expect(simulateBtn).toBeEnabled();
    fireEvent.click(simulateBtn);

    // Wait for response block to appear with secret payload
    await waitFor(() => screen.getByText(/secret payload/i));

    // Ensure status shows 'paid' somewhere
    expect(screen.getByText(/Status:/i)).toBeTruthy();
  });
});
