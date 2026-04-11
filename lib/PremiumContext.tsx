import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configureRevenueCat, checkPremiumStatus, FREE_LIMITS } from './revenue';

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  limits: typeof FREE_LIMITS;
}

const PremiumContext = createContext<PremiumState>({
  isPremium: false,
  isLoading: true,
  refresh: async () => {},
  limits: FREE_LIMITS,
});

export function usePremium() {
  return useContext(PremiumContext);
}

export function useIsPremium(): boolean {
  return useContext(PremiumContext).isPremium;
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      await configureRevenueCat();
      const status = await checkPremiumStatus();
      setIsPremium(status);
    } catch {
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoading,
        refresh,
        limits: FREE_LIMITS,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}
