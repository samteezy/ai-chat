'use client';

import type { ReactNode } from 'react';
import { LogViewerProvider, LogViewerPanel } from '@/components/logs';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LogViewerProvider>
      {children}
      <LogViewerPanel />
    </LogViewerProvider>
  );
}
