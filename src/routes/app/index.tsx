import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { HorizonteHero } from "@/components/horizonte/HorizonteHero";
import { PortfolioTableV2 } from "@/components/horizonte/PortfolioTableV2";
import { NewContributionDialog } from "@/components/horizonte/NewContributionDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/integrations/firebase/client";
import { useAuth } from "@/lib/auth-provider";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useFIProgress } from "@/lib/useFIProgress";
import { useTransactions } from "@/lib/transactions";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { getLargestPosition } from "@/lib/selectors/largestPosition";
import { getMonthlyNetContribution } from "@/lib/selectors/monthlyContribution";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { PlusCircle } from "lucide-react";

/**
 * Home real de `/app` (rota sem redirect). Substitui a antiga rota
 * paralela `/app-v2` (ver Prompt "Correção Mover Horizonte FI para
 * Produção"): hero "Horizonte FI" + grid de 4 cards de resumo (patrimônio
 * total, proventos do ano, maior posição, aporte do mês) + prévia da
 * tabela de carteira (4 primeiras linhas, link "Ver tudo").
 *
 * `useRealizedIncomeSummary()` é o SSOT de proventos realizados,
 * compartilhado com `CashFlowCalendar.tsx` — não há mais lógica de
 * dividendEventsMap/realizedEvents duplicada aqui.
 */
export const Route = createFileRoute("/app/")({
  component: AppHome,
});

interface LastVisitSnapshot {
  coveragePercent: number;
  capturedAt: number;
}

function SummaryCard({
  label,
  value,
  delta,
  isLoading,
}: {
  label: string;
  value: string;
  delta?: { label: string; positive: boolean } | null;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card border border-border shadow-sm p-5">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <span className="text-2xl font-semibold font-serif text-foreground">{value}</span>
      )}
      {!isLoading && delta && (
        <span className={`text-xs font-medium ${delta.positive ? "text-success" : "text-danger"}`}>
          {delta.label}
        </span>
      )}
    </div>
  );
}

function AppHome() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const { valuedItems, totals, isAppLoading, quotes } = useValuedPortfolio();
  const { transactions = [] } = useTransactions();
  const { summary: realizedSummary, isLoading: isRealizedLoading } = useRealizedIncomeSummary("BRL");
  const { coveragePercent } = useFIProgress();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [previousSnapshot, setPreviousSnapshot] = useState<LastVisitSnapshot | null>(null);
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  const largestPosition = useMemo(() => getLargestPosition(valuedItems), [valuedItems]);

  const netWorthLabel = formatCurrency(totals.consolidatedNetWorth, "BRL", locale);
  const incomeLabel = formatCurrency(realizedSummary.currentYear, "BRL", locale);
  const largestPositionLabel = largestPosition
    ? `${largestPosition.item.ticker} · ${formatCurrency(
        largestPosition.marketValue,
        largestPosition.item.currency,
        locale,
      )}`
    : "—";

  const largestPositionChangePct = largestPosition
    ? quotes[largestPosition.item.ticker]?.changePct ?? null
    : null;
  const largestPositionDelta =
    typeof largestPositionChangePct === "number"
      ? {
          label: `${largestPositionChangePct >= 0 ? "+" : ""}${formatPercent(
            largestPositionChangePct,
            locale,
            1,
          )} hoje`,
          positive: largestPositionChangePct >= 0,
        }
      : null;

  // Aporte deste mês — mesmo padrão de conversão de moeda de useFIProgress.ts
  // (USD -> BRL via exchangeRateQueryOptions; demais moedas passam direto).
  const usdRate = fx?.USDBRL ?? 5.5;
  const currencyByTicker = useMemo(() => {
    const map: Record<string, "BRL" | "USD"> = {};
    for (const item of valuedItems) map[item.ticker] = item.currency;
    return map;
  }, [valuedItems]);
  const convertToBRL = (value: number, curr: string) => (curr === "USD" ? value * usdRate : value);
  const monthlyContribution = useMemo(
    () => getMonthlyNetContribution(transactions, Date.now(), convertToBRL, currencyByTicker),
    [transactions, usdRate, currencyByTicker],
  );
  const monthlyContributionLabel = formatCurrency(monthlyContribution, "BRL", locale);

  // Snapshot leve de "última visita" — users/{uid}.lastVisitSnapshot,
  // sobrescrito a cada carregamento, sem histórico (Parte 5 da spec). Lê o
  // snapshot anterior (para calcular o delta exibido nesta visita), depois
  // sobrescreve com o valor atual. Roda uma única vez por sessão de
  // usuário/carregamento (guard `snapshotSaved`), não a cada re-render.
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
            coveragePercent,
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

  // Omite a linha de progresso na primeira visita (sem snapshot anterior) e
  // quando o delta é exatamente zero. Delta negativo é sempre exibido — não
  // deve ser escondido.
  const coverageDeltaLabel = useMemo(() => {
    if (!previousSnapshot) return null;
    const delta = coveragePercent - previousSnapshot.coveragePercent;
    if (delta === 0) return null;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)} p.p. desde a última visita`;
  }, [previousSnapshot, coveragePercent]);

  return (
    <div className="flex flex-col gap-8">
      <HorizonteHero />
      {coverageDeltaLabel && (
        <p className="-mt-6 text-xs text-muted-foreground">{coverageDeltaLabel}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Patrimônio total" value={netWorthLabel} isLoading={isAppLoading} />
        <SummaryCard
          label="Proventos recebidos (ano)"
          value={incomeLabel}
          isLoading={isAppLoading || isRealizedLoading}
        />
        <SummaryCard
          label="Maior posição"
          value={largestPositionLabel}
          delta={largestPositionDelta}
          isLoading={isAppLoading}
        />
        <SummaryCard
          label="Aporte deste mês"
          value={monthlyContributionLabel}
          isLoading={isAppLoading}
        />
        <p className="col-span-full -mt-2 text-xs text-muted-foreground">
          "Aporte deste mês" é uma aproximação baseada nas transações registradas este mês
          (compra menos venda) — não é um extrato de aportes reais.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-serif text-foreground">Sua carteira</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/app/myportfolio">Ver tudo</Link>
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowContributionDialog(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Registrar aporte
            </Button>
          </div>
        </div>
        <PortfolioTableV2 limit={4} />
      </div>

      <NewContributionDialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
      />
    </div>
  );
}
