/**
 * Context for Read Aloud mode.
 * 
 * When enabled, clicking any word in vocabulary details will pronounce it.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ReadAloudContextValue {
  /** Whether read-aloud mode is active */
  isReadAloudMode: boolean;
  /** Toggle read-aloud mode on/off */
  toggleReadAloudMode: () => void;
  /** Turn off read-aloud mode */
  exitReadAloudMode: () => void;
}

const ReadAloudContext = createContext<ReadAloudContextValue | null>(null);

/**
 * Provider component for Read Aloud mode.
 */
export const ReadAloudProvider = ({ children }: { children: ReactNode }) => {
  const [isReadAloudMode, setIsReadAloudMode] = useState(false);

  const toggleReadAloudMode = useCallback(() => {
    setIsReadAloudMode((prev) => !prev);
  }, []);

  const exitReadAloudMode = useCallback(() => {
    setIsReadAloudMode(false);
  }, []);

  return (
    <ReadAloudContext.Provider value={{ isReadAloudMode, toggleReadAloudMode, exitReadAloudMode }}>
      {children}
    </ReadAloudContext.Provider>
  );
};

/**
 * Hook to access Read Aloud mode state.
 */
export const useReadAloud = (): ReadAloudContextValue => {
  const context = useContext(ReadAloudContext);
  if (!context) {
    throw new Error('useReadAloud must be used within a ReadAloudProvider');
  }
  return context;
};
