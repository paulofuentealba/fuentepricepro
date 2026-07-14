import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "./auth-provider";
import type { AssetType, Currency } from "./domain";
import { useEffect } from "react";

const STORAGE_KEY = "ceilingPricePro.settings.v1";

export interface UserSettings {
  targetYield: number;
  smartAllocationCurrency: Currency;
  smartAllocationTargets: Record<AssetType, number>;
}

const DEFAULT_SETTINGS: UserSettings = {
  targetYield: 6,
  smartAllocationCurrency: "BRL",
  smartAllocationTargets: { STOCK_BR: 0, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0 },
};

// Ler do localStorage para convidados ou migração
function readLocalSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Tenta migrar do antigo formato espalhado
      const oldTargetYield = window.localStorage.getItem("global-target-yield");
      const oldCurrency = window.localStorage.getItem("smartAllocationCurrency");
      const oldTargets = window.localStorage.getItem("smart-allocation-targets");
      
      const settings = {
        targetYield: oldTargetYield ? Number(JSON.parse(oldTargetYield)) : DEFAULT_SETTINGS.targetYield,
        smartAllocationCurrency: oldCurrency ? JSON.parse(oldCurrency) as Currency : DEFAULT_SETTINGS.smartAllocationCurrency,
        smartAllocationTargets: oldTargets ? JSON.parse(oldTargets) : DEFAULT_SETTINGS.smartAllocationTargets,
      };
      // Limpa os antigos
      window.localStorage.removeItem("global-target-yield");
      window.localStorage.removeItem("smartAllocationCurrency");
      window.localStorage.removeItem("smart-allocation-targets");
      
      writeLocalSettings(settings);
      return settings;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeLocalSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? null;

  const queryKey = ["userSettings", userId];

  const { data: settings = DEFAULT_SETTINGS, isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      if (userId) {
        // Load from cloud
        const ref = doc(db, "users", userId);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          // Merge with defaults in case of missing fields
          return { ...DEFAULT_SETTINGS, ...data.settings } as UserSettings;
        } else {
          // First time cloud user: migrate local to cloud
          const local = readLocalSettings();
          await setDoc(ref, { settings: local }, { merge: true });
          return local;
        }
      } else {
        // Guest mode
        return readLocalSettings();
      }
    },
    staleTime: Infinity,
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const merged = { ...settings, ...patch };
      
      if (userId) {
        const ref = doc(db, "users", userId);
        await setDoc(ref, { settings: merged }, { merge: true });
      } else {
        writeLocalSettings(merged);
      }
      return merged;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<UserSettings>(queryKey) || DEFAULT_SETTINGS;
      const next = { ...prev, ...patch };
      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateSettings = (patch: Partial<UserSettings>) => updateMutation.mutate(patch);

  return { settings, updateSettings, isPending };
}
