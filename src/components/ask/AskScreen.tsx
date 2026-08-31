import React, { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import {
  runAsk,
  resolveReasonText,
  type AskEngineSettings,
  type Strategy,
  type AskResult,
} from "@/lib/askEngine";
import { resolveDisclaimerText } from "@/lib/disclaimer";
import { MetricBox } from "@/components/shared/MetricBox";
import { InsightBanner } from "@/components/shared/InsightBanner";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Coins,
  ShieldAlert,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Download,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AskScreenProps {
  titleKey?: string;
  subtitleKey?: string;
  questionKey: string;
  /** Optional 2-line question split, matching the prototype's `.ask-q` lead + bold emphasis
   * sentence. When omitted, `questionKey` renders as a single line. */
  questionLeadKey?: string;
  questionEmphasisKey?: string;
  /** Dynamic eyebrow text (e.g. "TAEE11 pagou hoje · 3 pagamentos esta semana") that replaces
   * the static `subtitleKey` line above the title when present. */
  eyebrowOverride?: string;
  /** Optional highlight card (matches the prototype's `.insight` gold banner) rendered below
   * the main .ask card — e.g. "Dinheiro parado custa caro". */
  insight?: { title: string; description: string; value: string };
  amountLabelKey?: string;
  initialAmount?: number;
  amountHelperText?: string;
  strategies: Strategy[];
  /** Short subtitle rendered under each strategy tab (e.g. "Maior DY abaixo do teto"), keyed by
   * strategy id. Screen-specific because the same strategy has a different hint depending on
   * whether it's used for Reinvestir or Plano de Aporte. */
  strategyHints?: Record<string, string>;
  defaultStrategyId?: string;
  positions: ValuedWatchlistItem[];
  settings: AskEngineSettings;
  sourceTicker?: string;
  currency?: Currency;
  isLoading?: boolean;
  onExport?: (result: AskResult, strategy: Strategy) => void;
}

function resolveConsequenceLabel(t: any, valueKey: string): string {
  if (!t || typeof t !== "object" || !valueKey) return valueKey || "";

  const labelKey = `${valueKey}Label`;
  const parts = labelKey.split(".");
  let curr = t;
  let found = true;
  for (const part of parts) {
    if (curr && typeof curr === "object" && part in curr) {
      curr = curr[part];
    } else {
      found = false;
      break;
    }
  }

  if (found && typeof curr === "string") {
    return curr;
  }

  return resolveReasonText(t, valueKey);
}

export function AskScreen({
  titleKey = "askScreen.reinvestTitle",
  subtitleKey = "askScreen.reinvestSubtitle",
  questionKey,
  questionLeadKey,
  questionEmphasisKey,
  eyebrowOverride,
  insight,
  amountLabelKey = "askScreen.availableAmountLabel",
  initialAmount = 0,
  amountHelperText,
  strategies,
  strategyHints,
  defaultStrategyId,
  positions,
  settings,
  sourceTicker,
  currency = "BRL",
  isLoading = false,
  onExport,
}: AskScreenProps) {
  const { t, locale } = useI18n();

  // Active strategy state
  const initialStrat =
    strategies.find((s) => s.id === defaultStrategyId) || strategies[0];
  const [activeStrategyId, setActiveStrategyId] = useState<string>(
    initialStrat?.id || "",
  );

  const activeStrategy = useMemo(
    () => strategies.find((s) => s.id === activeStrategyId) || strategies[0],
    [strategies, activeStrategyId],
  );

  // Available amount input state (syncs with initialAmount when loaded)
  const [rawAmount, setRawAmount] = useState<string>(
    initialAmount > 0 ? String(initialAmount) : "1000",
  );
  // While editing, the field shows the raw digits for easy typing; once blurred it displays
  // grouped thousands (e.g. "1.130") matching the prototype's `.ask-amt .big` / masked input.
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  useEffect(() => {
    if (initialAmount > 0 && (rawAmount === "" || rawAmount === "0" || rawAmount === "1000")) {
      setRawAmount(String(initialAmount));
    }
  }, [initialAmount]);

  const parsedAmount = useMemo(() => {
    // rawAmount is constrained on input to digits + at most one decimal comma (see onChange
    // below), so there is never a "." to misread as a thousands separator here.
    const num = parseFloat(rawAmount.replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [rawAmount]);

  const displayAmount = isAmountFocused
    ? rawAmount
    : parsedAmount > 0
      ? formatNumber(parsedAmount, locale, 0)
      : rawAmount;

  // Execute pure AskEngine decision
  const result: AskResult = useMemo(() => {
    if (!activeStrategy) {
      return {
        state: "no_eligible_assets",
        allocations: [],
        leftover: parsedAmount,
        excluded: [],
        consequences: [],
      };
    }

    return runAsk(
      {
        positions,
        availableAmount: parsedAmount,
        settings,
        asOf: new Date().toISOString(),
        sourceTicker,
      },
      activeStrategy,
    );
  }, [positions, parsedAmount, settings, activeStrategy, sourceTicker]);

  const [showExcluded, setShowExcluded] = useState(false);

  // Ticker -> company/fund name lookup, reused from the positions already loaded (no new data).
  const tickerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of positions) map[p.ticker] = p.name;
    return map;
  }, [positions]);

  // Ticker -> native currency lookup. Per-asset amounts are always shown in the asset's own
  // currency (no conversion, no relabeling) — only aggregate values use `currency` (the
  // display-currency toggle).
  const tickerCurrencyMap = useMemo(() => {
    const map: Record<string, Currency> = {};
    for (const p of positions) map[p.ticker] = p.currency;
    return map;
  }, [positions]);

  // Resolved titles and question
  const title = resolveReasonText(t, titleKey);
  const subtitle = subtitleKey ? resolveReasonText(t, subtitleKey) : "";
  const question = resolveReasonText(t, questionKey);
  const questionLead = questionLeadKey ? resolveReasonText(t, questionLeadKey) : "";
  const questionEmphasis = questionEmphasisKey ? resolveReasonText(t, questionEmphasisKey) : "";
  const amountLabel = resolveReasonText(t, amountLabelKey);

  const firstConsequence = result.consequences[0];

  // "Abaixo do teto: N de N" — allocations already passed the ceiling exclusion, so N is the
  // count of successful allocations over allocations + assets excluded specifically for being
  // above the user's ceiling price (matches the prototype's `.ask-foot` 3rd stat).
  const belowCeilingCount = result.allocations.length;
  const aboveCeilingExcludedCount = result.excluded.filter(
    (item) => item.reasonKey === "askEngine.reasons.excludedAboveCeiling",
  ).length;
  const belowCeilingTotal = belowCeilingCount + aboveCeilingExcludedCount;

  const disclaimerText = resolveDisclaimerText(t, "calculation");

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      {/* Page header — .top equivalent, outside the .ask card */}
      <div>
        {(eyebrowOverride || subtitle) && (
          <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrowOverride || subtitle}
          </div>
        )}
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
      </div>

      {/* .ask card */}
      <div className="overflow-hidden rounded-[22px] border border-border/60 bg-card">
        {/* .ask-top: question + amount */}
        <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
          <div className="max-w-lg font-serif text-lg font-medium leading-snug text-foreground sm:text-xl">
            {questionLead ? (
              <>
                {questionLead}
                <br />
                <span className="font-semibold text-accent-text">{questionEmphasis}</span>
              </>
            ) : (
              question
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-2.5">
              <div>
                <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                  {amountLabel}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-serif text-xl font-medium text-foreground sm:text-2xl">R$</span>
                  <Input
                    id="available-amount-input"
                    type="text"
                    inputMode="decimal"
                    value={displayAmount}
                    onFocus={() => setIsAmountFocused(true)}
                    onBlur={() => setIsAmountFocused(false)}
                    onChange={(e) => {
                      // Digits + at most one decimal comma. No "." allowed while typing — it
                      // would be ambiguous between a thousands separator and a decimal point
                      // (e.g. "1.500" silently parsing to 1.5 instead of 1500).
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
                    aria-label={amountLabel}
                  />
                </div>
              </div>
            </div>
            {amountHelperText && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                {amountHelperText}
              </p>
            )}
          </div>
        </div>

        {/* .strat: strategy tabs with 2-line label + hint */}
        {strategies.length > 1 && (
          <div className="flex border-y border-border/50" role="tablist">
            {strategies.map((strat, idx) => {
              const isActive = strat.id === activeStrategyId;
              const hint = strategyHints?.[strat.id];
              return (
                <button
                  key={strat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveStrategyId(strat.id)}
                  className={cn(
                    "flex-1 px-3 py-3 text-center text-[12px] font-display font-medium transition-colors",
                    idx < strategies.length - 1 && "border-r border-border/50",
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
        )}

        {/* Dynamic Content Body based on loading & strategy state */}
        <div className="p-5 sm:p-6">
          {isLoading ? (
            <ResultSkeleton />
          ) : result.state === "targets_not_configured" ? (
            <Card className="border-warning/40 bg-warning/5 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {t.askScreen?.noTargetsConfiguredTitle || "Metas de alocação não configuradas"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t.askScreen?.noTargetsConfiguredDesc ||
                  "A estratégia Corrigir Desvio exige metas de alocação definidas por classe. Você pode configurá-las em Metas ou utilizar as outras abas acima."}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Link to="/app/goals">
                  <Button variant="default" size="sm" className="font-display">
                    {t.askScreen?.configureTargetsBtn || "Configurar Metas"}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ) : activeStrategy.id === "reinforcePayer" && result.allocations.length === 0 ? (
            <Card className="border-border/60 bg-muted/20 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {t.askScreen?.reinforceNoPayerTitle || "Nenhum pagador específico selecionado"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t.askScreen?.reinforceNoPayerDesc ||
                  "Esta aba é destinada ao reinvestimento no próprio ativo gerador de proventos. Utilize as abas ao lado para reinvestir na carteira geral."}
              </p>
            </Card>
          ) : result.state === "no_eligible_assets" ? (
            <Card className="border-border/60 bg-muted/20 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {t.askScreen?.noEligibleAssetsTitle || "Nenhum ativo elegível para esta estratégia"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t.askScreen?.noEligibleAssetsDesc ||
                  "Todas as posições foram excluídas pelos seus critérios de preço teto ou sinal de risco."}
              </p>
            </Card>
          ) : result.state === "insufficient_funds" ? (
            <Card className="border-border/60 bg-muted/20 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {t.askScreen?.insufficientFundsTitle || "Valor disponível insuficiente"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t.askScreen?.insufficientFundsDesc ||
                  "O valor disponível é menor do que 1 cota inteira dos ativos elegíveis."}
              </p>
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {t.askScreen?.leftoverLabel || "Sobra em caixa:"}{" "}
                <span className="font-mono">{formatCurrency(result.leftover, currency, locale)}</span>
              </p>
            </Card>
          ) : (
            /* Success State: Render Allocations as .alloc rows */
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
                      </p>
                    </div>

                    <div className="w-[92px] shrink-0 text-right sm:w-[115px]">
                      <div className="font-serif text-[17px] font-medium text-foreground sm:text-[18px]">
                        {formatCurrency(alloc.amountBRL, tickerCurrencyMap[alloc.ticker] ?? currency, locale)}
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

          {/* Excluded Assets Accordion / Collapsible */}
          {result.excluded.length > 0 && (
            <div className="mt-5 border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={() => setShowExcluded(!showExcluded)}
                className="flex items-center justify-between w-full text-xs font-display font-medium text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={showExcluded}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground/70" />
                  {resolveReasonText(t, "askScreen.excludedAssetsTitle", {
                    count: result.excluded.length,
                  }) || `Ativos fora do cálculo pelos seus critérios (${result.excluded.length})`}
                </span>
                {showExcluded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showExcluded && (
                <div className="mt-3 space-y-2 rounded-lg border border-border/30 bg-muted/20 p-3 text-xs">
                  {result.excluded.map((item) => (
                    <div
                      key={item.ticker}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1 border-b border-border/20 last:border-0"
                    >
                      <span className="font-mono font-bold text-foreground">
                        {item.ticker}
                      </span>
                      <span className="text-muted-foreground">
                        {resolveReasonText(t, item.reasonKey, item.reasonParams)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* .ask-foot: inline stats + export */}
        {!isLoading &&
          result.state !== "targets_not_configured" &&
          result.state !== "no_eligible_assets" &&
          !(activeStrategy.id === "reinforcePayer" && result.allocations.length === 0) && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-6">
                {firstConsequence && (
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.askScreen?.addedIncomeLabel || "Renda adicionada"}
                    </div>
                    <div className="font-serif text-base font-medium text-success">
                      + {formatCurrency(Number(firstConsequence.value), currency, locale)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.askScreen?.leftoverLabel || "Sobra"}
                  </div>
                  <div className="font-serif text-base font-medium text-foreground">
                    {formatCurrency(result.leftover, currency, locale)}
                  </div>
                </div>
                {belowCeilingTotal > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.askScreen?.belowCeilingLabel || "Abaixo do teto"}
                    </div>
                    <div className="font-serif text-base font-medium text-foreground">
                      {belowCeilingCount} {t.askScreen?.belowCeilingOfLabel || "de"} {belowCeilingTotal}
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
                  {t.askScreen?.exportBtn || "Exportar Plano"}
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

        {/* .disc: in-card gold-tinted calculation disclaimer */}
        {!isLoading &&
          result.state !== "targets_not_configured" &&
          result.state !== "no_eligible_assets" &&
          !(activeStrategy.id === "reinforcePayer" && result.allocations.length === 0) && (
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

      {/* Impact metrics beyond the first (kept as a grid — .ask-foot only fits 3 inline stats) */}
      {result.consequences.length > 1 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {result.consequences.slice(1).map((c, i) => (
            <MetricBox
              key={i}
              label={resolveConsequenceLabel(t, c.valueKey)}
              value={formatCurrency(Number(c.value), currency, locale)}
              variant="success"
              trend="up"
            />
          ))}
        </div>
      )}

      {/* Insight banner — .insight equivalent */}
      {insight && (
        <InsightBanner title={insight.title} description={insight.description} value={insight.value} />
      )}
    </div>
  );
}
