import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import {
  calculateMonthlyCapitalGainsTax,
  calculateFiiCapitalGainsTax,
  calculateEtfCapitalGainsTax,
  calculateFiInfraCapitalGainsTax,
} from "@/lib/tax";
import type {
  MonthlyCapitalGainsResult,
  MonthlyFiiCapitalGainsResult,
  MonthlyEtfCapitalGainsResult,
  MonthlyFiInfraCapitalGainsResult,
  RealizedGainEvent,
} from "@/lib/tax/types";
import { TaxSimulationDisclaimer } from "@/components/shared/TaxSimulationDisclaimer";
import { MetricBox } from "@/components/shared/MetricBox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Coins,
  TrendingUp,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaxRealityScreenProps {
  context: TaxRealityContext;
  isLoading: boolean;
  onExport?: () => void;
}

type MonthlyStockRow = MonthlyCapitalGainsResult & { isCurrentYear: boolean };
type MonthlyFiiRow = MonthlyFiiCapitalGainsResult & { isCurrentYear: boolean };
type MonthlyEtfRow = MonthlyEtfCapitalGainsResult & { isCurrentYear: boolean };
type MonthlyFiInfraRow = MonthlyFiInfraCapitalGainsResult & { isCurrentYear: boolean };

export function TaxRealityScreen({
  context,
  isLoading,
  onExport,
}: TaxRealityScreenProps) {
  const { t, locale } = useI18n();
  const tScreen = t.taxRealityScreen;

  // ---- Pure calculations from the tax modules (no new tax logic here) ----
  const {
    assetTypeByTicker,
    realizedGainEvents,
    currentYear,
    currentMonthKey,
  } = context;

  // 1. Stock Capital Gains (monthly) — current year only
  const stockMonthly = useMemo((): MonthlyStockRow[] => {
    if (!realizedGainEvents.length) return [];
    const results = calculateMonthlyCapitalGainsTax(
      realizedGainEvents,
      0, // priorLossCarryforward — ideally from persisted state; 0 for now
      assetTypeByTicker,
    );
    return results
      .filter((r) => r.month.startsWith(String(currentYear)))
      .map((r) => ({ ...r, isCurrentYear: true }));
  }, [realizedGainEvents, assetTypeByTicker, currentYear]);

  // 2. FII & FIAGRO Capital Gains (monthly) — current year only
  const fiiMonthly = useMemo((): MonthlyFiiRow[] => {
    if (!realizedGainEvents.length) return [];
    const results = calculateFiiCapitalGainsTax(
      realizedGainEvents,
      0, // priorLossCarryforward — ideally from persisted state; 0 for now
      assetTypeByTicker,
    );
    return results
      .filter((r) => r.month.startsWith(String(currentYear)))
      .map((r) => ({ ...r, isCurrentYear: true }));
  }, [realizedGainEvents, assetTypeByTicker, currentYear]);

  // 3. ETF Capital Gains (monthly) — current year only
  const etfMonthly = useMemo((): MonthlyEtfRow[] => {
    if (!realizedGainEvents.length) return [];
    const results = calculateEtfCapitalGainsTax(
      realizedGainEvents,
      0, // priorLossCarryforward — ideally from persisted state; 0 for now
      assetTypeByTicker,
    );
    return results
      .filter((r) => r.month.startsWith(String(currentYear)))
      .map((r) => ({ ...r, isCurrentYear: true }));
  }, [realizedGainEvents, assetTypeByTicker, currentYear]);

  // 4. FI-Infra Capital Gains (monthly) — current year only (100% isento, taxDue = 0)
  const fiInfraMonthly = useMemo((): MonthlyFiInfraRow[] => {
    if (!realizedGainEvents.length) return [];
    const results = calculateFiInfraCapitalGainsTax(
      realizedGainEvents,
      0,
      assetTypeByTicker,
    );
    return results
      .filter((r) => r.month.startsWith(String(currentYear)))
      .map((r) => ({ ...r, isCurrentYear: true }));
  }, [realizedGainEvents, assetTypeByTicker, currentYear]);

  // 5. Aggregated totals for current year
  const stockYearTotals = useMemo(() => {
    return stockMonthly.reduce(
      (acc, m) => {
        acc.totalSales += m.totalSales;
        acc.totalGain += m.totalGain;
        acc.totalTaxDue += m.taxDue;
        acc.finalCarryforward = m.lossCarryforwardRemaining;
        return acc;
      },
      { totalSales: 0, totalGain: 0, totalTaxDue: 0, finalCarryforward: 0 },
    );
  }, [stockMonthly]);

  const fiiYearTotals = useMemo(() => {
    return fiiMonthly.reduce(
      (acc, m) => {
        acc.totalSales += m.totalSales;
        acc.totalGain += m.totalGain;
        acc.totalTaxDue += m.taxDue;
        acc.finalCarryforward = m.lossCarryforwardRemaining;
        return acc;
      },
      { totalSales: 0, totalGain: 0, totalTaxDue: 0, finalCarryforward: 0 },
    );
  }, [fiiMonthly]);

  const etfYearTotals = useMemo(() => {
    return etfMonthly.reduce(
      (acc, m) => {
        acc.totalSales += m.totalSales;
        acc.totalGain += m.totalGain;
        acc.totalTaxDue += m.taxDue;
        acc.finalCarryforward = m.lossCarryforwardRemaining;
        return acc;
      },
      { totalSales: 0, totalGain: 0, totalTaxDue: 0, finalCarryforward: 0 },
    );
  }, [etfMonthly]);

  // Aggregate unclassified tickers from all tracks
  const allUnclassifiedTickers = useMemo(() => {
    const set = new Set<string>();
    for (const m of stockMonthly) {
      m.unclassifiedTickers?.forEach((t) => set.add(t));
    }
    for (const m of fiiMonthly) {
      m.unclassifiedTickers?.forEach((t) => set.add(t));
    }
    for (const m of etfMonthly) {
      m.unclassifiedTickers?.forEach((t) => set.add(t));
    }
    for (const m of fiInfraMonthly) {
      m.unclassifiedTickers?.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [stockMonthly, fiiMonthly, etfMonthly, fiInfraMonthly]);

  const totalEstimatedTax =
    stockYearTotals.totalTaxDue + fiiYearTotals.totalTaxDue + etfYearTotals.totalTaxDue;

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <ResultSkeleton />
        <TaxSimulationDisclaimer />
      </div>
    );
  }

  // ---- Empty State (no sales in current year) ----
  const hasAnySales =
    stockMonthly.length > 0 ||
    fiiMonthly.length > 0 ||
    etfMonthly.length > 0 ||
    fiInfraMonthly.length > 0;
  if (!hasAnySales) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2">
                  <StatusBadge variant="default" icon={Coins}>
                    {tScreen.title}
                  </StatusBadge>
                </div>
                <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {tScreen.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{tScreen.subtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <Coins className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-foreground">{tScreen.emptyStateTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {tScreen.emptyStateDesc}
            </p>
          </CardContent>
        </Card>
        <TaxSimulationDisclaimer />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Top Header Card */}
      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <StatusBadge variant="default" icon={Coins}>
                  {tScreen.title}
                </StatusBadge>
              </div>
              <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {tScreen.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{tScreen.subtitle}</p>
            </div>
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-background px-3 py-1.5 text-sm font-display font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
                <span>{tScreen.exportBtn || "Exportar"}</span>
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Cards Grid */}
          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2",
              etfMonthly.length > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4",
            )}
          >
            <MetricBox
              label={tScreen.summary.dividendsLabel}
              value={formatCurrency(context.totalDividendNet, "BRL", locale)}
              variant="success"
              trend="up"
              subValue={tScreen.summary.dividendsHelper}
            />
            <MetricBox
              label={tScreen.summary.stockCgLabel}
              value={formatCurrency(stockYearTotals.totalTaxDue, "BRL", locale)}
              variant="warning"
              trend="neutral"
              subValue={tScreen.summary.stockCgHelper}
            />
            <MetricBox
              label={tScreen.summary.fiiCgLabel}
              value={formatCurrency(fiiYearTotals.totalTaxDue, "BRL", locale)}
              variant="warning"
              trend="neutral"
              subValue={tScreen.summary.fiiCgHelper}
            />
            {etfMonthly.length > 0 && (
              <MetricBox
                label={tScreen.summary.etfCgLabel}
                value={formatCurrency(etfYearTotals.totalTaxDue, "BRL", locale)}
                variant="warning"
                trend="neutral"
                subValue={tScreen.summary.etfCgHelper}
              />
            )}
            <MetricBox
              label={tScreen.summary.totalTaxLabel}
              value={formatCurrency(totalEstimatedTax, "BRL", locale)}
              variant="danger"
              trend="neutral"
              subValue={tScreen.summary.totalTaxHelper}
            />
          </div>

          {/* Monthly Detail — Stocks */}
          {stockMonthly.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {tScreen.monthlyDetail.stocksTitle}
              </h3>
              <div className="rounded-xl border border-border/50 bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider">{tScreen.monthlyDetail.monthHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.salesHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.gainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-center">{tScreen.monthlyDetail.exemptHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxableGainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxDueHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.carryforwardHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMonthly.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.totalSales, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.totalGain, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-center">
                          {month.isExempt ? (
                            <StatusBadge variant="success" icon={CheckCircle}>
                              Sim
                            </StatusBadge>
                          ) : (
                            <StatusBadge variant="default" icon={AlertCircle}>
                              Não
                            </StatusBadge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.taxableGain, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatCurrency(month.taxDue, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(month.lossCarryforwardRemaining, "BRL", locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Monthly Detail — FIIs & FIAGROs */}
          {fiiMonthly.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {tScreen.monthlyDetail.fiisTitle}
              </h3>
              <div className="rounded-xl border border-border/50 bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider">{tScreen.monthlyDetail.monthHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.salesHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.gainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxableGainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxDueHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.carryforwardHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiiMonthly.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.totalSales, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.totalGain, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.taxableGain, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatCurrency(month.taxDue, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(month.lossCarryforwardRemaining, "BRL", locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Monthly Detail — ETFs */}
          {etfMonthly.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {tScreen.monthlyDetail.etfsTitle}
              </h3>
              <div className="rounded-xl border border-border/50 bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider">{tScreen.monthlyDetail.monthHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.salesHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.gainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxableGainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxDueHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.carryforwardHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etfMonthly.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.totalSales, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.totalGain, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(month.taxableGain, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatCurrency(month.taxDue, "BRL", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(month.lossCarryforwardRemaining, "BRL", locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Unclassified Assets Section */}
          {allUnclassifiedTickers.length > 0 && (
            <div className="space-y-3 rounded-xl border-2 border-warning/40 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-display font-semibold text-foreground">{tScreen.unclassified.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{tScreen.unclassified.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allUnclassifiedTickers.map((ticker) => (
                      <span
                        key={ticker}
                        className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 text-warning text-xs font-mono font-bold px-2.5 py-1"
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-display font-medium text-primary hover:text-primary/80"
                    onClick={() => window.location.href = "/app/settings"}
                  >
                    {tScreen.unclassified.ctaConfigure}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Limits Declared Section — MANDATORY, always visible, non-dismissible */}
          <div className="space-y-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
            <h4 className="flex items-center gap-2 font-serif text-lg font-semibold text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {tScreen.limitsDeclared.title}
            </h4>
            <ul className="ml-6 list-disc space-y-2 text-sm text-muted-foreground">
              {tScreen.limitsDeclared.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Persistent Tax Simulation Disclaimer (Prompt 137) */}
      <TaxSimulationDisclaimer />
    </div>
  );
}