import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { runAsk, correctDriftStrategy, resolveReasonText, type AskEngineSettings } from "@/lib/askEngine";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";

const AMOUNT_PRESETS = [1000, 2500, 5000, 10000];

interface ContributionEngineCardProps {
  valuedItems: ValuedWatchlistItem[];
  settings: AskEngineSettings;
  isLoading: boolean;
}

export function ContributionEngineCard({ valuedItems, settings, isLoading }: ContributionEngineCardProps) {
  const { locale, t } = useI18n();
  const [amount, setAmount] = useState("5000");

  const parsedAmount = useMemo(() => {
    const num = Number(amount.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [amount]);

  const result = useMemo(() => {
    if (isLoading) return null;
    return runAsk(
      {
        positions: valuedItems,
        availableAmount: parsedAmount,
        settings,
        asOf: new Date().toISOString(),
      },
      correctDriftStrategy,
    );
  }, [valuedItems, parsedAmount, settings, isLoading]);

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-4">
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.dashboard.contribution.eyebrow}
        </div>
        <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
          {t.dashboard.contribution.title}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5">
          <span className="text-sm text-muted-foreground">R$</span>
          <Input
            type="number"
            step={500}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-7 w-28 border-0 p-0 text-lg font-semibold focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-1.5">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {preset >= 1000 ? `${preset / 1000}k` : preset}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !result || parsedAmount <= 0 ? (
        <p className="text-sm text-muted-foreground">{t.dashboard.contribution.insufficientFunds}</p>
      ) : result.state === "targets_not_configured" ? (
        <p className="text-sm text-muted-foreground">{t.dashboard.contribution.targetsNotConfigured}</p>
      ) : result.state === "no_eligible_assets" ? (
        <p className="text-sm text-muted-foreground">{t.dashboard.contribution.noEligibleAssets}</p>
      ) : result.allocations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.dashboard.contribution.noEligibleAssets}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {result.allocations.map((alloc) => (
            <div
              key={alloc.ticker}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div>
                <div className="text-sm font-semibold text-foreground">{alloc.ticker}</div>
                <div className="text-xs text-muted-foreground">
                  {resolveReasonText(t, alloc.reasonKey, alloc.reasonParams)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(alloc.amountBRL, "BRL", locale)}
                </div>
                <div className="text-xs text-muted-foreground">{alloc.percentOfTotal}%</div>
              </div>
            </div>
          ))}
          {result.leftover > 0 && (
            <p className="text-xs text-muted-foreground">
              {t.dashboard.contribution.leftover.replace(
                "{{amount}}",
                formatCurrency(result.leftover, "BRL", locale),
              )}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {t.dashboard.contribution.suggestionNote}
      </p>
    </div>
  );
}
