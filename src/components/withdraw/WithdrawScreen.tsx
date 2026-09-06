import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import {
  runWithdraw,
  minimizeTaxStrategy,
  minimizeIncomeLossStrategy,
  sellOverpricedStrategy,
  resolveReasonText,
  type WithdrawResult,
  type WithdrawStrategy,
  type WithdrawTaxState,
} from "@/lib/withdrawEngine";
import { resolveDisclaimerText } from "@/lib/disclaimer";
import { InsightBanner } from "@/components/shared/InsightBanner";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Coins, ShieldAlert, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const STRATEGIES: WithdrawStrategy[] = [minimizeTaxStrategy, minimizeIncomeLossStrategy, sellOverpricedStrategy];

const STRATEGY_HINT_KEYS: Record<string, string> = {
  minimizeTax: "withdrawHintMinimizeTax",
  minimizeIncomeLoss: "withdrawHintMinimizeIncomeLoss",
  sellOverpriced: "withdrawHintSellOverpriced",
};

export interface WithdrawScreenProps {
  positions: ValuedWatchlistItem[];
  taxState: WithdrawTaxState;
  initialAmount?: number;
  currency?: "BRL" | "USD";
  isLoading?: boolean;
  onExport?: (result: WithdrawResult, strategy: WithdrawStrategy) => void;
}

export function WithdrawScreen({
  positions,
  taxState,
  initialAmount = 0,
  isLoading = false,
  onExport,
}: WithdrawScreenProps) {
  const { t, locale } = useI18n();

  const [activeStrategyId, setActiveStrategyId] = useState<string>(STRATEGIES[0].id);
  const activeStrategy = useMemo(
    () => STRATEGIES.find((s) => s.id === activeStrategyId) || STRATEGIES[0],
    [activeStrategyId],
  );

  const [rawAmount, setRawAmount] = useState<string>(initialAmount > 0 ? String(initialAmount) : "5000");
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  useEffect(() => {
    if (initialAmount > 0 && (rawAmount === "" || rawAmount === "0" || rawAmount === "5000")) {
      setRawAmount(String(initialAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAmount]);

  const parsedAmount = useMemo(() => {
    const num = parseFloat(rawAmount.replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [rawAmount]);

  const displayAmount = isAmountFocused
    ? rawAmount
    : parsedAmount > 0
      ? formatNumber(parsedAmount, locale, 0)
      : rawAmount;

  const eligiblePositions = useMemo(
    () => positions.filter((p) => !p.isClosedPosition && (p.quantity || 0) > 0),
    [positions],
  );

  const asOf = useMemo(() => new Date().toISOString(), []);

  const result: WithdrawResult = useMemo(
    () =>
      runWithdraw(
        { eligiblePositions, neededAmountBRL: parsedAmount, taxState, asOf },
        activeStrategy,
      ),
    [eligiblePositions, parsedAmount, taxState, activeStrategy, asOf],
  );

  // "A ordem de venda importa mais que o valor" — compares the active order's tax against a
  // tax-unaware ordering (alphabetical) using the exact same engine, never a fabricated number.
  const orderInsight = useMemo(() => {
    if (activeStrategy.id !== "minimizeTax" || result.allocations.length === 0) return null;
    const naiveStrategy: WithdrawStrategy = {
      id: "naive",
      labelKey: "",
      run: (ctx) =>
        [...ctx.eligiblePositions]
          .sort((a, b) => a.ticker.localeCompare(b.ticker))
          .map((p) => ({ ticker: p.ticker, reasonKey: "" })),
    };
    const naiveResult = runWithdraw(
      { eligiblePositions, neededAmountBRL: parsedAmount, taxState, asOf },
      naiveStrategy,
    );
    const diff = naiveResult.totalTaxBRL - result.totalTaxBRL;
    if (diff <= 1) return null;
    return {
      title: t.askScreen?.withdrawInsightTitle || "A ordem de venda importa mais que o valor",
      description: resolveReasonText(t, "askScreen.withdrawInsightDesc", {
        exemption: formatCurrency(20000, "BRL", locale),
        carryforward: formatCurrency(result.lossCarryforwardUsedBRL, "BRL", locale),
        altTax: formatCurrency(naiveResult.totalTaxBRL, "BRL", locale),
      }),
      value: formatCurrency(diff, "BRL", locale),
    };
  }, [activeStrategy.id, result, eligiblePositions, parsedAmount, taxState, asOf, t, locale]);

  const disclaimerText = resolveDisclaimerText(t, "tax");

  const tickerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of positions) map[p.ticker] = p.name;
    return map;
  }, [positions]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.askScreen?.withdrawSubtitle}
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.askScreen?.withdrawTitle}
        </h1>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border/60 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
          <div className="max-w-lg font-serif text-lg font-medium leading-snug text-foreground sm:text-xl">
            {t.askScreen?.withdrawQuestionLead}
            <br />
            <span className="font-semibold text-accent-text">{t.askScreen?.withdrawQuestionEmphasis}</span>
          </div>

          <div>
            <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-2.5">
              <div>
                <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.askScreen?.withdrawAmountLabel}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-serif text-xl font-medium text-foreground sm:text-2xl">R$</span>
                  <Input
                    id="withdraw-amount-input"
                    type="text"
                    inputMode="decimal"
                    value={displayAmount}
                    onFocus={() => setIsAmountFocused(true)}
                    onBlur={() => setIsAmountFocused(false)}
                    onChange={(e) => {
                      const digitsAndComma = e.target.value.replace(/[^0-9,]/g, "");
                      const firstCommaIdx = digitsAndComma.indexOf(",");
                      const next =
                        firstCommaIdx === -1
                          ? digitsAndComma
                          : digitsAndComma.slice(0, firstCommaIdx + 1) +
                            digitsAndComma.slice(firstCommaIdx + 1).replace(/,/g, "");
                      setRawAmount(next);
                    }}
                    className="h-auto w-28 border-0 bg-transparent p-0 font-serif text-xl font-medium text-foreground shadow-none focus-visible:ring-0 sm:text-2xl"
                    aria-label={t.askScreen?.withdrawAmountLabel}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-y border-border/50" role="tablist">
          {STRATEGIES.map((strat, idx) => {
            const isActive = strat.id === activeStrategyId;
            const hintKey = STRATEGY_HINT_KEYS[strat.id];
            const hint = hintKey ? (t.askScreen as any)?.[hintKey] : undefined;
            return (
              <button
                key={strat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveStrategyId(strat.id)}
                className={cn(
                  "flex-1 px-3 py-3 text-center text-[12px] font-display font-medium transition-colors",
                  idx < STRATEGIES.length - 1 && "border-r border-border/50",
                  isActive
                    ? "bg-accent/15 text-accent-text font-semibold"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                )}
              >
                {resolveReasonText(t, strat.labelKey)}
                {hint && (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 block text-[9px] font-normal uppercase tracking-wider opacity-70"
                  >
                    {hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">
          {isLoading ? (
            <ResultSkeleton />
          ) : result.state === "no_eligible_assets" ? (
            <Card className="border-border/60 bg-muted/20 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {t.askScreen?.withdrawNoEligibleAssetsTitle || "Nenhuma posição elegível para venda"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t.askScreen?.withdrawNoEligibleAssetsDesc ||
                  "Adicione ativos à carteira ou informe um valor a retirar para calcular a ordem de venda."}
              </p>
            </Card>
          ) : (
            <div className="-mx-5 sm:-mx-6">
              {result.allocations.map((alloc, idx) => {
                const reasonDisplay = resolveReasonText(t, alloc.reasonKey, alloc.reasonParams);
                const assetName = tickerNameMap[alloc.ticker];

                return (
                  <div
                    key={alloc.ticker}
                    className="flex items-center gap-4 border-b border-dashed border-border/40 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-muted/20 sm:px-6"
                  >
                    <span className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-lg bg-accent/15 font-mono text-[11.5px] font-semibold text-accent-text">
                      {idx + 1}
                    </span>

                    <div className="w-[92px] shrink-0 sm:w-[115px]">
                      <div className="truncate font-mono text-[13.5px] font-semibold text-foreground">
                        {alloc.ticker}
                      </div>
                      {assetName && (
                        <div className="truncate text-[10px] text-muted-foreground">{assetName}</div>
                      )}
                    </div>

                    <div className="min-w-[100px] flex-1">
                      <div className="h-[23px] overflow-hidden rounded-lg bg-muted/50">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-primary to-accent transition-all duration-500 motion-reduce:transition-none"
                          style={{ width: `${Math.max(4, alloc.percentOfTotal)}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-tight text-muted-foreground">
                        {reasonDisplay}
                        {alloc.taxBRL > 0 && (
                          <span className="ml-1 font-semibold text-danger">
                            · {formatCurrency(alloc.taxBRL, "BRL", locale)}{" "}
                            {t.askScreen?.withdrawTaxSuffix || "de imposto"}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="w-[92px] shrink-0 text-right sm:w-[115px]">
                      <div className="font-serif text-[17px] font-medium text-foreground sm:text-[18px]">
                        {formatCurrency(alloc.amountNative, alloc.currency, locale)}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {alloc.quantity} {t.askScreen?.sharesUnit || "cotas"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && result.state !== "no_eligible_assets" && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{t.askScreen?.withdrawEstimatedTaxLabel || "Imposto estimado"}</span>
                  <InfoTooltip
                    content={
                      t.askScreen?.withdrawEstimatedTaxTooltip ||
                      "Simulação de DARF a pagar no mês seguinte à liquidação das vendas com ganho de capital tributável."
                    }
                  />
                </div>
                <div
                  className={cn(
                    "font-serif text-base font-medium",
                    result.totalTaxBRL > 0 ? "text-danger" : "text-success",
                  )}
                >
                  {formatCurrency(result.totalTaxBRL, "BRL", locale)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{t.askScreen?.withdrawIncomeLostLabel || "Renda perdida"}</span>
                  <InfoTooltip
                    content={
                      t.askScreen?.withdrawIncomeLostTooltip ||
                      "Impacto anual estimado na sua renda passiva futura pela venda destas cotas/ações."
                    }
                  />
                </div>
                <div className="font-serif text-base font-medium text-foreground">
                  − {formatCurrency(result.totalIncomeLostAnnualBRL, "BRL", locale)}
                </div>
              </div>
              {result.lossCarryforwardUsedBRL > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>{t.askScreen?.withdrawLossOffsetLabel || "Prejuízo compensado"}</span>
                    <InfoTooltip
                      content={
                        t.askScreen?.withdrawLossOffsetTooltip ||
                        "Aproveitamento de perdas acumuladas anteriores para abater ou zerar o imposto devido."
                      }
                    />
                  </div>
                  <div className="font-serif text-base font-medium text-foreground">
                    {formatCurrency(result.lossCarryforwardUsedBRL, "BRL", locale)}
                  </div>
                </div>
              )}
            </div>
            {onExport && (
              <Button
                size="sm"
                className="shrink-0 gap-1.5 font-display"
                onClick={() => onExport(result, activeStrategy)}
              >
                {t.askScreen?.exportBtn || "Exportar CSV"}
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {!isLoading && result.state !== "no_eligible_assets" && (
          <div
            role="note"
            aria-label={disclaimerText}
            className="flex items-start gap-2.5 border-t border-border/50 bg-accent/10 px-5 py-3 sm:px-6"
          >
            <span aria-hidden="true" className="shrink-0 font-bold text-accent-text">
              ◆
            </span>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{disclaimerText}</p>
          </div>
        )}
      </div>

      {result.state === "insufficient_position" && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <p className="flex items-center gap-2 text-sm text-warning">
            <Coins className="h-4 w-4 shrink-0" />
            {resolveReasonText(t, "askScreen.withdrawInsufficientPosition", {
              amount: formatCurrency(result.leftoverBRL, "BRL", locale),
            })}
          </p>
        </Card>
      )}

      {orderInsight && (
        <InsightBanner
          title={orderInsight.title}
          description={orderInsight.description}
          value={orderInsight.value}
        />
      )}
    </div>
  );
}
