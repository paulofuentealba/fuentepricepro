import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { runAsk, correctDriftStrategy, resolveReasonText, type AskEngineSettings } from "@/lib/askEngine";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { convertCurrency } from "@/lib/currency";
import type { Currency } from "@/lib/domain";

const AMOUNT_PRESETS = [1000, 2500, 5000, 10000];

interface ContributionEngineCardProps {
  valuedItems: ValuedWatchlistItem[];
  settings: AskEngineSettings;
  isLoading: boolean;
  currency?: Currency;
  usdRate?: number;
  onSelectTicker?: (ticker: string) => void;
}

export function ContributionEngineCard({
  valuedItems,
  settings,
  isLoading,
  currency = "BRL",
  usdRate,
  onSelectTicker,
}: ContributionEngineCardProps) {
  const { locale, t } = useI18n();
  const [amount, setAmount] = useState("5000");

  const parsedAmount = useMemo(() => {
    const num = Number(amount.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [amount]);

  // Convert input amount to BRL if user typed in USD, because engine operates in BRL
  const amountBRL = useMemo(() => {
    return convertCurrency(parsedAmount, currency, "BRL", usdRate);
  }, [parsedAmount, currency, usdRate]);

  const result = useMemo(() => {
    if (isLoading) return null;
    return runAsk(
      {
        positions: valuedItems,
        availableAmount: amountBRL,
        settings,
        asOf: new Date().toISOString(),
      },
      correctDriftStrategy,
    );
  }, [valuedItems, amountBRL, settings, isLoading]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 flex flex-col justify-between shadow-sm dark:border-[#234839] dark:bg-[radial-gradient(circle_at_top_right,#132C22,#0D1A15_70%)]">
      <div>
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light">
            {t.dashboard.contribution.eyebrow}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-foreground dark:text-white">
            {t.dashboard.contribution.title}
          </h2>
        </div>

        {/* Input & Presets */}
        <div className="rounded-xl border border-border/60 bg-surface-2/80 p-3.5 flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-base font-semibold text-accent-gold">
              {currency === "USD" ? "US$" : "R$"}
            </span>
            <Input
              type="number"
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-7 w-28 border-0 p-0 font-serif text-xl font-semibold focus-visible:ring-0 text-foreground dark:text-white bg-transparent"
            />
          </div>
          <div className="flex gap-1.5">
            {AMOUNT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className="rounded-full border border-border bg-surface-3/60 px-2.5 py-1 text-xs font-semibold text-secondary-foreground transition hover:border-accent-emerald-light hover:bg-accent-emerald hover:text-white"
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Results List */}
        {isLoading ? (
          <Skeleton className="h-44 w-full rounded-xl" />
        ) : !result || parsedAmount <= 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t.dashboard.contribution.insufficientFunds}
          </p>
        ) : result.state === "targets_not_configured" ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t.dashboard.contribution.targetsNotConfigured}
          </p>
        ) : result.state === "no_eligible_assets" || result.allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t.dashboard.contribution.noEligibleAssets}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/40 dark:divide-white/5">
            {result.allocations.map((alloc, idx) => {
              const matchedItem = valuedItems.find((v) => v.ticker === alloc.ticker);
              const displayAllocAmount = convertCurrency(alloc.amountBRL, "BRL", currency, usdRate);
              const margin = matchedItem?.valuation?.margin ?? matchedItem?.safetyMargin ?? null;

              return (
                <div
                  key={alloc.ticker}
                  onClick={() => onSelectTicker?.(alloc.ticker)}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/40 transition-colors rounded-lg px-2"
                >
                  <div className="w-7 h-7 rounded-full bg-surface-3 border border-border/80 flex items-center justify-center text-xs font-bold text-accent-gold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="w-28 sm:w-36 shrink-0">
                    <div className="font-bold text-foreground text-sm sm:text-base">
                      {alloc.ticker}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {matchedItem ? t.types[matchedItem.type] : resolveReasonText(t, alloc.reasonKey, alloc.reasonParams)}
                    </div>
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden mx-1 sm:mx-2 min-w-[50px]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-accent-gold transition-all duration-300"
                      style={{ width: `${Math.min(100, alloc.percentOfTotal * 1.5)}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-serif text-sm sm:text-base font-semibold text-foreground">
                      {formatCurrency(displayAllocAmount, currency, locale)}
                    </div>
                    <div className="text-[11px] text-accent-emerald-light font-medium">
                      {margin != null
                        ? `Margem ${margin > 0 ? "+" : ""}${margin.toFixed(1)}%`
                        : `${alloc.percentOfTotal}%`}
                    </div>
                  </div>
                </div>
              );
            })}
            {result.leftover > 0 && (
              <p className="pt-2 text-xs text-muted-foreground">
                {t.dashboard.contribution.leftover.replace(
                  "{{amount}}",
                  formatCurrency(
                    convertCurrency(result.leftover, "BRL", currency, usdRate),
                    currency,
                    locale,
                  ),
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Fuente Disclaimer Note */}
      <div className="mt-5 rounded-r-lg border-l-4 border-accent-gold bg-surface-2/80 p-3 text-xs text-accent-gold dark:bg-[rgba(18,33,28,0.7)]">
        <strong>{t.dashboard.contribution.calculatedSuggestion} </strong>
        {t.dashboard.contribution.suggestionNote}
      </div>
    </div>
  );
}
