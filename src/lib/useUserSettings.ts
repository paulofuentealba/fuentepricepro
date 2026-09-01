import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "./auth-provider";
import type { AssetType, Currency } from "./domain";
import { useEffect } from "react";

const STORAGE_KEY = "ceilingPricePro.settings.v1";

export interface UserSettings {
  targetYield: number;
  displayCurrency: Currency;
  smartAllocationTargets: Partial<Record<AssetType, number>>;
  classTargetYields?: Partial<Record<AssetType, number>>;
  excludeAboveCeiling?: boolean;
  excludeYieldTraps?: boolean;
  maxConcentrationPerAsset?: number | null;
  maxConcentrationPerClass?: Partial<Record<AssetType, number>> | null;
  monthlyLivingCostGoal?: number;
  monthlyLivingCostGoalCurrency?: Currency;
  estimatedMonthlyContribution?: number;
  disclaimerAcceptedVersion?: string;
  disclaimerAcceptedAt?: number;
  taxDisclaimerAcceptedVersion?: string;
  taxDisclaimerAcceptedAt?: number;
  valuationAssumptionsMode?: "simple" | "advanced";
  /** LGPD/GDPR consent toggles shown in Configurações > Privacidade > Consentimentos. Essential
   * cookies aren't a stored field — they're mandatory for auth and always shown as locked-on. */
  usageAnalyticsConsent?: boolean;
  weeklyDigestEmailConsent?: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  targetYield: 6,
  displayCurrency: "BRL",
  maxConcentrationPerAsset: null,
  smartAllocationTargets: {
    STOCK_BR: 0,
    STOCK_US: 0,
    FII: 0,
    REIT: 0,
    ETF: 0,
    FIXED_INCOME: 0,
  },
  valuationAssumptionsMode: "simple",
  usageAnalyticsConsent: true,
  weeklyDigestEmailConsent: false,
};

/**
 * One-time migration: FII_INFRA and FIAGRO used to be configurable as separate classes in
 * `smartAllocationTargets`/`classTargetYields`. They are now grouped under FII everywhere via
 * `getDisplayAssetType` (the same SSOT already used by usePortfolioRisk/useAssetFilterSort) —
 * AssetType itself still distinguishes them for Watchlist/Realidade Fiscal, only the goals/
 * allocation-targets layer groups them. Merges any pre-existing values into FII and drops the
 * old keys. Returns the same object reference if nothing needed migrating (no-op fast path).
 */
export function migrateLegacyAllocationKeys(settings: UserSettings): UserSettings {
  const targets = settings.smartAllocationTargets;
  const yields = settings.classTargetYields;

  const targetsHasLegacy = targets && ("FII_INFRA" in targets || "FIAGRO" in targets);
  const yieldsHasLegacy = yields && ("FII_INFRA" in yields || "FIAGRO" in yields);

  if (!targetsHasLegacy && !yieldsHasLegacy) {
    return settings;
  }

  let nextTargets = targets;
  if (targetsHasLegacy) {
    const merged = { ...targets };
    const legacySum =
      (merged.FII_INFRA && merged.FII_INFRA > 0 ? merged.FII_INFRA : 0) +
      (merged.FIAGRO && merged.FIAGRO > 0 ? merged.FIAGRO : 0);
    merged.FII = (merged.FII || 0) + legacySum;
    delete merged.FII_INFRA;
    delete merged.FIAGRO;
    nextTargets = merged;
  }

  let nextYields = yields;
  if (yieldsHasLegacy) {
    const merged = { ...yields };
    // classTargetYields is a target rate (%), not additive — keep FII's own value if already
    // set, otherwise adopt whichever legacy class had one (FII_INFRA takes precedence).
    if (merged.FII === undefined || merged.FII === null) {
      const legacyYield = merged.FII_INFRA ?? merged.FIAGRO;
      if (legacyYield !== undefined) merged.FII = legacyYield;
    }
    delete merged.FII_INFRA;
    delete merged.FIAGRO;
    nextYields = merged;
  }

  return { ...settings, smartAllocationTargets: nextTargets, classTargetYields: nextYields };
}

// Ler do localStorage para convidados ou migração
function readLocalSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Tenta migrar do antigo formato espalhado
      const oldTargetYield = window.localStorage.getItem("global-target-yield");
      const oldCurrency =
        window.localStorage.getItem("smartAllocationCurrency") ||
        window.localStorage.getItem("displayCurrency");
      const oldTargets = window.localStorage.getItem("smart-allocation-targets");

      const settings = {
        targetYield: oldTargetYield
          ? Number(JSON.parse(oldTargetYield))
          : DEFAULT_SETTINGS.targetYield,
        displayCurrency: oldCurrency
          ? (JSON.parse(oldCurrency) as Currency)
          : DEFAULT_SETTINGS.displayCurrency,
        smartAllocationTargets: oldTargets
          ? JSON.parse(oldTargets)
          : DEFAULT_SETTINGS.smartAllocationTargets,
        monthlyLivingCostGoal: undefined,
        estimatedMonthlyContribution: undefined,
      };
      // Limpa os antigos
      window.localStorage.removeItem("global-target-yield");
      window.localStorage.removeItem("smartAllocationCurrency");
      window.localStorage.removeItem("displayCurrency");
      window.localStorage.removeItem("smart-allocation-targets");

      writeLocalSettings(settings);
      return settings;
    }
    const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    const migrated = migrateLegacyAllocationKeys(merged);
    if (migrated !== merged) writeLocalSettings(migrated);
    return migrated;
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
          let settings = data.settings || {};

          // Migrate smartAllocationCurrency -> displayCurrency in cloud if needed
          if (settings.smartAllocationCurrency && !settings.displayCurrency) {
            settings.displayCurrency = settings.smartAllocationCurrency;
            delete settings.smartAllocationCurrency;
            await setDoc(ref, { settings }, { merge: true });
          }

          // Merge with defaults in case of missing fields
          const mergedSettings = { ...DEFAULT_SETTINGS, ...settings } as UserSettings;
          const migratedSettings = migrateLegacyAllocationKeys(mergedSettings);
          if (migratedSettings !== mergedSettings) {
            await setDoc(ref, { settings: migratedSettings }, { merge: true });
          }
          return migratedSettings;
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
