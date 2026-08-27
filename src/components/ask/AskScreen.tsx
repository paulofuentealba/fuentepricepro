import React, { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import {
  runAsk,
  resolveReasonText,
  type AskEngineSettings,
  type Strategy,
  type AskResult,
} from "@/lib/askEngine";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";
import { MetricBox } from "@/components/shared/MetricBox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Coins,
  TrendingUp,
  Sparkles,
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
  initialAmount?: number;
  amountHelperText?: string;
  strategies: Strategy[];
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
  initialAmount = 0,
  amountHelperText,
  strategies,
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

  useEffect(() => {
    if (initialAmount > 0 && (rawAmount === "" || rawAmount === "0" || rawAmount === "1000")) {
      setRawAmount(String(initialAmount));
    }
  }, [initialAmount]);

  const parsedAmount = useMemo(() => {
    const num = parseFloat(rawAmount.replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [rawAmount]);

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

  // Resolved titles and question
  const title = resolveReasonText(t, titleKey);
  const subtitle = subtitleKey ? resolveReasonText(t, subtitleKey) : "";
  const question = resolveReasonText(t, questionKey);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Top Header Card */}
      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <StatusBadge variant="default" icon={Sparkles}>
                  {title}
                </StatusBadge>
              </div>
              <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {question}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {onExport && (
              <Button
                variant="outline"
                size="sm"
                className="self-start sm:self-center font-display"
                onClick={() => onExport(result, activeStrategy)}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {t.askScreen?.exportBtn || "Exportar Plano"}
              </Button>
            )}
          </div>

          {/* Available Amount Input Bar */}
          <div className="mt-4 rounded-xl border border-border/50 bg-background/50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label
                htmlFor="available-amount-input"
                className="text-sm font-display font-semibold text-foreground"
              >
                {t.askScreen?.availableAmountLabel || "Valor disponível para reinvestir"}
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="available-amount-input"
                  type="number"
                  min="0"
                  step="any"
                  value={rawAmount}
                  onChange={(e) => setRawAmount(e.target.value)}
                  className="pl-9 font-serif text-lg font-semibold text-foreground"
                  aria-label={t.askScreen?.availableAmountLabel || "Valor disponível"}
                />
              </div>
            </div>
            {amountHelperText && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                {amountHelperText}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Strategy Tabs */}
          {strategies.length > 1 && (
            <Tabs
              value={activeStrategyId}
              onValueChange={setActiveStrategyId}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto p-1 bg-muted/60">
                {strategies.map((strat) => (
                  <TabsTrigger
                    key={strat.id}
                    value={strat.id}
                    onClick={() => setActiveStrategyId(strat.id)}
                    className="py-2 text-xs sm:text-sm font-display font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {resolveReasonText(t, strat.labelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Dynamic Content Body based on loading & strategy state */}
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
                <Link to="/app/smartallocation">
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
            /* Success State: Render Allocations */
            <div className="space-y-6">
              <div className="space-y-3">
                {result.allocations.map((alloc, idx) => {
                  const reasonDisplay = resolveReasonText(
                    t,
                    alloc.reasonKey,
                    alloc.reasonParams,
                  );

                  return (
                    <div
                      key={alloc.ticker}
                      className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-background sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Left: Rank & Ticker & Reason */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-mono font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-base text-foreground">
                            {alloc.ticker}
                          </span>
                          <span className="text-xs font-mono font-semibold text-primary/80">
                            {alloc.percentOfTotal}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 w-full max-w-md rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500 motion-reduce:transition-none"
                            style={{ width: `${Math.max(4, alloc.percentOfTotal)}%` }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {reasonDisplay}
                        </p>
                      </div>

                      {/* Right: Quantity and Amount */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-border/30 pt-2 sm:border-0 sm:pt-0 shrink-0">
                        <span className="text-base font-serif font-semibold text-foreground">
                          {formatCurrency(alloc.amountBRL, currency, locale)}
                        </span>
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {alloc.quantity} {t.askScreen?.sharesUnit || "cotas"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leftover Box */}
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-display">{t.askScreen?.leftoverLabel || "Sobra em caixa (cotas inteiras não fracionadas):"}</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(result.leftover, currency, locale)}
                </span>
              </div>

              {/* Consequences Impact Section */}
              {result.consequences.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.askScreen?.consequencesTitle || "Impacto Projetado"}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {result.consequences.map((c, i) => (
                      <MetricBox
                        key={i}
                        label={resolveConsequenceLabel(t, c.valueKey)}
                        value={formatCurrency(Number(c.value), currency, locale)}
                        variant="success"
                        trend="up"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Excluded Assets Accordion / Collapsible */}
          {result.excluded.length > 0 && (
            <div className="border-t border-border/40 pt-4">
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
        </CardContent>
      </Card>

      {/* Persistent Regulatory Disclaimer */}
      <RegulatoryDisclaimerBanner variant="calculation" forceShow />
    </div>
  );
}
