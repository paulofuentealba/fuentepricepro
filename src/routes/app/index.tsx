import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuth } from "@/lib/auth-provider";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useFIProgress } from "@/lib/useFIProgress";
import { useUserSettings } from "@/lib/useUserSettings";
import { computeWeightedYieldOnCost } from "@/lib/selectors/weightedYieldOnCost";
import { convertCurrency } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import type { AskEngineSettings } from "@/lib/askEngine";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { FireEngineCard } from "@/components/dashboard/FireEngineCard";
import { ContributionEngineCard } from "@/components/dashboard/ContributionEngineCard";
import { AllocationOverviewCard } from "@/components/dashboard/AllocationOverviewCard";
import { OpportunityMatrixTable } from "@/components/dashboard/OpportunityMatrixTable";
import { AssetDetailSheet } from "@/components/ceiling/watchlist/AssetDetailSheet";

/**
 * Home real de `/app`. Reescrita para a nova Dashboard (ver
 * docs/superpowers/specs/2026-09-04-app-home-dashboard-redesign-design.md),
 * baseada na seção "Dashboard" do protótipo interativo aprovado com o
 * usuário: KPIs, Termômetro FIRE, Motor de Aportes, Alocação por Classe e
 * Matriz de Oportunidades — todos compondo hooks/lib já existentes
 * (useFIProgress, useValuedPortfolio, askEngine, portfolioAllocationState).
 */
export const Route = createFileRoute("/app/")({
  component: AppHome,
});

interface LastVisitSnapshot {
  coveragePercent: number;
  capturedAt: number;
}

function AppHome() {
  const { user } = useAuth();
  const { valuedItems, totals, isAppLoading, fx, macroRates } = useValuedPortfolio();
  const { settings, updateSettings } = useUserSettings();
  const fi = useFIProgress();

  const [previousSnapshot, setPreviousSnapshot] = useState<LastVisitSnapshot | null>(null);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ValuedWatchlistItem | null>(null);

  const handleSelectTicker = (ticker: string) => {
    const item = valuedItems.find(
      (v) => v.ticker.toUpperCase() === ticker.toUpperCase(),
    );
    if (item) {
      setSelectedItem(item);
    }
  };

  const usdRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;
  const currency = settings.displayCurrency;

  const weightedYoc = useMemo(
    () => computeWeightedYieldOnCost(valuedItems, macroRates),
    [valuedItems, macroRates],
  );

  const availableContributionBRL = useMemo(() => {
    const contribCurrency = settings.monthlyLivingCostGoalCurrency ?? currency;
    return convertCurrency(settings.estimatedMonthlyContribution || 0, contribCurrency, "BRL", usdRate);
  }, [settings.estimatedMonthlyContribution, settings.monthlyLivingCostGoalCurrency, currency, usdRate]);

  const askSettings: AskEngineSettings = useMemo(
    () => ({
      smartAllocationTargets: settings.smartAllocationTargets,
      excludeAboveCeiling: settings.excludeAboveCeiling,
      excludeYieldTraps: settings.excludeYieldTraps,
      maxConcentrationPerAsset: settings.maxConcentrationPerAsset,
      maxConcentrationPerClass: settings.maxConcentrationPerClass,
    }),
    [settings],
  );

  // Snapshot leve de "última visita" — users/{uid}.lastVisitSnapshot, sobrescrito a cada
  // carregamento, sem histórico. Comportamento preservado da home anterior; o delta calculado
  // agora é exibido dentro do FireEngineCard em vez de isolado acima do hero.
  useEffect(() => {
    if (!user?.uid || isAppLoading || snapshotSaved) return;
    const ref = doc(db, "users", user.uid);
    let cancelled = false;

    (async () => {
      const snap = await getDoc(ref);
      const previous = snap.exists()
        ? ((snap.data().lastVisitSnapshot as LastVisitSnapshot | undefined) ?? null)
        : null;
      if (!cancelled) setPreviousSnapshot(previous);

      await setDoc(
        ref,
        {
          lastVisitSnapshot: {
            coveragePercent: fi.coveragePercent,
            capturedAt: Date.now(),
          } satisfies LastVisitSnapshot,
        },
        { merge: true },
      );
      if (!cancelled) setSnapshotSaved(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isAppLoading, snapshotSaved]);

  const deltaSinceLastVisit = useMemo(() => {
    if (!previousSnapshot) return null;
    const delta = fi.coveragePercent - previousSnapshot.coveragePercent;
    return delta === 0 ? null : delta;
  }, [previousSnapshot, fi.coveragePercent]);

  return (
    <div className="flex flex-col gap-6">
      <DashboardKpiGrid
        netWorth={convertCurrency(totals.consolidatedNetWorth, "BRL", currency, usdRate)}
        weightedYoc={weightedYoc}
        monthlyIncome={convertCurrency(fi.monthlyIncomeBRL, "BRL", currency, usdRate)}
        availableContribution={convertCurrency(availableContributionBRL, "BRL", currency, usdRate)}
        currency={currency}
        isLoading={isAppLoading}
      />

      <FireEngineCard
        coveragePercent={fi.coveragePercent}
        monthlyIncome={fi.currentMonthlyIncome}
        monthlyCostGoal={fi.monthlyCostGoal}
        monthsToFI={fi.monthsToFI}
        isReached={fi.isReached}
        isSetup={fi.isSetup}
        currency={currency}
        deltaSinceLastVisit={deltaSinceLastVisit}
        onSetMonthlyCostGoal={(value) =>
          updateSettings({ monthlyLivingCostGoal: value, monthlyLivingCostGoalCurrency: currency })
        }
        isLoading={isAppLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContributionEngineCard
          valuedItems={valuedItems}
          settings={askSettings}
          isLoading={isAppLoading}
          currency={currency}
          usdRate={usdRate}
          onSelectTicker={handleSelectTicker}
        />
        <AllocationOverviewCard
          valuedItems={valuedItems}
          smartAllocationTargets={settings.smartAllocationTargets}
          usdRate={usdRate}
          isLoading={isAppLoading}
        />
      </div>

      <OpportunityMatrixTable
        valuedItems={valuedItems}
        isLoading={isAppLoading}
        onSelectTicker={handleSelectTicker}
      />

      <AssetDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
