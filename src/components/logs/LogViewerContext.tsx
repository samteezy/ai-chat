'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type PanelPosition = 'bottom' | 'right';

interface LogViewerContextType {
  isOpen: boolean;
  position: PanelPosition;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setPosition: (position: PanelPosition) => void;
}

const LogViewerContext = createContext<LogViewerContextType | null>(null);

export function LogViewerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPositionState] = useState<PanelPosition>('bottom');

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  const setPosition = useCallback((newPosition: PanelPosition) => {
    setPositionState(newPosition);
    // Persist position preference
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'logViewerPosition', value: newPosition }),
    }).catch(console.error);
  }, []);

  return (
    <LogViewerContext.Provider
      value={{
        isOpen,
        position,
        openPanel,
        closePanel,
        togglePanel,
        setPosition,
      }}
    >
      {children}
    </LogViewerContext.Provider>
  );
}

export function useLogViewer() {
  const context = useContext(LogViewerContext);
  if (!context) {
    throw new Error('useLogViewer must be used within a LogViewerProvider');
  }
  return context;
}
