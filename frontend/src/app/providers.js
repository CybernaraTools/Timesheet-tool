'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-card)',
            color: 'var(--primary-text)',
            border: '1px solid var(--hairline)',
            borderRadius: '20px',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
          },
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  );
}
