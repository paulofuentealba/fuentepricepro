import React, { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SettingsContextType {
  targetYield: number;
  setTargetYield: (value: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Default Target Yield is 6% (Bazin's rule)
  const [targetYield, setTargetYield] = useLocalStorage<number>("global-target-yield", 6);

  return (
    <SettingsContext.Provider value={{ targetYield, setTargetYield }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
