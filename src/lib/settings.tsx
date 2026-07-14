import React, { createContext, useContext, ReactNode } from "react";
import { useUserSettings } from "@/lib/useUserSettings";

interface SettingsContextType {
  targetYield: number;
  setTargetYield: (value: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useUserSettings();
  const targetYield = settings.targetYield;
  const setTargetYield = (value: number) => updateSettings({ targetYield: value });

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
