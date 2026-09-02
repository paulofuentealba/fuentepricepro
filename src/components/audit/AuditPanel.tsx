import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useTransactions } from "@/lib/transactions";
import { useWatchlist } from "@/lib/watchlist";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import { buildDecisionLog } from "@/lib/audit/buildDecisionLog";
import { AuditScreen } from "@/components/audit/AuditScreen";

/**
 * Feature-gate + data-fetch wrapper around AuditScreen — extracted from the /app/audit route so
 * it can be reused both as the standalone route and embedded in Explorar's "Mesa de Decisão" tab
 * (same pattern as ScreenerScreen/SnowballScenarioPanel), without duplicating the gate/query logic.
 */
export function AuditPanel() {
  const { t } = useI18n();
  const isUnlocked = useFeatureGate("auditUnlocked");

  const { transactions, isLoading: isTxLoading } = useTransactions();
  const { items, isPending: isWatchlistLoading } = useWatchlist();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const fxRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;

  const isLoading = isTxLoading || isWatchlistLoading;

  const summary = useMemo(
    () => buildDecisionLog(transactions, items, fxRate),
    [transactions, items, fxRate],
  );

  if (isUnlocked === false) {
    return (
      <div className="mx-auto max-w-xl p-6 mt-12">
        <Card className="border-border/60 text-center p-6">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>{t.auditScreen?.featureGateBlockedTitle || "Auditoria Bloqueada"}</CardTitle>
            <CardDescription>
              {t.auditScreen?.featureGateBlockedDesc || "A auditoria está temporariamente em manutenção."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <AuditScreen summary={summary} isLoading={isLoading} />;
}
