'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useStudioAuth } from '@/hooks/useStudioAuth';

interface StudioAuthContextType {
  isReady: boolean;
}

const StudioAuthContext = createContext<StudioAuthContextType>({ isReady: false });

export function useStudioAuthContext() {
  return useContext(StudioAuthContext);
}

export function StudioAuthProvider({ children }: { children: ReactNode }) {
  const { initialize, isLoading } = useStudioAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <StudioAuthContext.Provider value={{ isReady: !isLoading }}>
      {children}
    </StudioAuthContext.Provider>
  );
}
