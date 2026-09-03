import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/formatters";
import type { Currency } from "@/lib/domain";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import { computeTaxRealityRows } from "@/lib/tax/taxRealityRows";
import type {
  MonthlyCapitalGainsResult,
  MonthlyFiiCapitalGainsResult,
  MonthlyEtfCapitalGainsResult,
  MonthlyFiInfraCapitalGainsResult,
  MonthlyEtfFixedIncomeCapitalGainsResult,
  AnnualForeignCapitalGainsResult,
  RealizedGainEvent,
} from "@/lib/tax/types";
import { BR_MONTHLY_SALES_EXEMPTION_THRESHOLD } from "@/lib/tax/br/monthlyExemption";
import { FiscalHeroBreakdown } from "@/components/tax/FiscalHeroBreakdown";
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
type MonthlyEtfFixedIncomeRow = MonthlyEtfFixedIncomeCapitalGainsResult & { isCurrentYear: boolean };
type AnnualForeignRow = AnnualForeignCapitalGainsResult;

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
    currencyByTicker,
    isFixedIncomeEtfByTicker,
    transactions,
    realizedGainEvents,
    currentYear,
    currentMonthKey,
    foreignCapitalGainsResults,
    fxRate,
  } = context;

  // Current-year monthly/annual capital-gains rows — SSOT shared with the
  // CSV export in tax.tsx, so the file downloaded always matches the screen.
  const rows = useMemo(() => computeTaxRealityRows(context), [context]);
  const stockMonthly = useMemo(
    (): MonthlyStockRow[] => rows.stockMonthly.map((r) => ({ ...r, isCurrentYear: true })),
    [rows.stockMonthly],
  );
  const fiiMonthly = useMemo(
    (): MonthlyFiiRow[] => rows.fiiMonthly.map((r) => ({ ...r, isCurrentYear: true })),
    [rows.fiiMonthly],
  );
  const etfMonthly = useMemo(
    (): MonthlyEtfRow[] => rows.etfMonthly.map((r) => ({ ...r, isCurrentYear: true })),
    [rows.etfMonthly],
  );
  const fiInfraMonthly = useMemo(
    (): MonthlyFiInfraRow[] => rows.fiInfraMonthly.map((r) => ({ ...r, isCurrentYear: true })),
    [rows.fiInfraMonthly],
  );
  const foreignAnnual = useMemo((): AnnualForeignRow[] => rows.foreignAnnual, [rows.foreignAnnual]);
  const etfFixedIncomeMonthly = useMemo(
    (): MonthlyEtfFixedIncomeRow[] => rows.etfFixedIncomeMonthly.map((r) => ({ ...r, isCurrentYear: true })),
    [rows.etfFixedIncomeMonthly],
  );

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

  const fiInfraYearTotals = useMemo(() => {
    return fiInfraMonthly.reduce(
      (acc, m) => {
        acc.totalSales += m.totalSales;
        acc.totalGain += m.totalGain;
        return acc;
      },
      { totalSales: 0, totalGain: 0 },
    );
  }, [fiInfraMonthly]);

  const foreignYearTotals = useMemo(() => {
    const totals = foreignAnnual.reduce(
      (acc, r) => {
        acc.totalSales += r.totalSales;
        acc.totalGain += r.totalGain;
        acc.totalTaxDue += r.taxDue;
        return acc;
      },
      { totalSales: 0, totalGain: 0, totalTaxDue: 0 },
    );
    return { ...totals, totalTaxDueBrl: totals.totalTaxDue * fxRate };
  }, [foreignAnnual, fxRate]);

  const etfFixedIncomeYearTotals = useMemo(() => {
    return etfFixedIncomeMonthly.reduce(
      (acc, m) => {
        acc.totalSales += m.totalSales;
        acc.totalGain += m.totalGain;
        acc.totalTaxDue += m.taxDue;
        acc.finalCarryforward = m.lossCarryforwardRemaining;
        return acc;
      },
      { totalSales: 0, totalGain: 0, totalTaxDue: 0, finalCarryforward: 0 },
    );
  }, [etfFixedIncomeMonthly]);

  // Fiscal hero: current-month stock sales vs. the BRL 20k monthly exemption threshold
  const currentMonthStockRow = useMemo(
    () => stockMonthly.find((m) => m.month === currentMonthKey),
    [stockMonthly, currentMonthKey],
  );

  const grossNetRows = useMemo(() => {
    const map: Record<string, { gross: number; net: number }> = {};
    for (const pos of context.brDividendsTaxResult.positions) {
      const row = (map[pos.ticker] ??= { gross: 0, net: 0 });
      row.gross += pos.grossAmount;
      row.net += pos.netAmount;
    }
    for (const pos of context.jcpTaxResult.positions) {
      const row = (map[pos.ticker] ??= { gross: 0, net: 0 });
      row.gross += pos.grossAmount;
      row.net += pos.netAmount;
    }
    return Object.entries(map)
      .map(([ticker, v]) => ({ ticker, gross: v.gross, net: v.net }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5);
  }, [context.brDividendsTaxResult.positions, context.jcpTaxResult.positions]);

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
    for (const r of foreignAnnual) {
      r.unclassifiedTickers?.forEach((t) => set.add(t));
    }
    for (const m of etfFixedIncomeMonthly) {
      m.unclassifiedTickers?.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [stockMonthly, fiiMonthly, etfMonthly, fiInfraMonthly, foreignAnnual, etfFixedIncomeMonthly]);

  const totalEstimatedTax =
    stockYearTotals.totalTaxDue +
    fiiYearTotals.totalTaxDue +
    etfYearTotals.totalTaxDue +
    foreignYearTotals.totalTaxDueBrl +
    etfFixedIncomeYearTotals.totalTaxDue;

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
    fiInfraMonthly.length > 0 ||
    foreignAnnual.length > 0 ||
    etfFixedIncomeMonthly.length > 0;
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
          <FiscalHeroBreakdown
            darfDue={currentMonthStockRow?.taxDue ?? 0}
            currentMonthSales={currentMonthStockRow?.totalSales ?? 0}
            exemptionLimit={BR_MONTHLY_SALES_EXEMPTION_THRESHOLD}
            lossCarryforward={stockYearTotals.finalCarryforward}
            usWithheldTax={context.totalWithheldTax - context.jcpTaxResult.totalTax}
            jcpWithheldTax={context.jcpTaxResult.totalTax}
            brDividendsNet={context.totalNetDividends}
            grossNetRows={grossNetRows}
            currency="BRL"
          />

          {/* Summary Cards Grid */}
          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2",
              (() => {
                const extraCards = [
                  etfMonthly.length > 0,
                  fiInfraMonthly.length > 0,
                  foreignAnnual.length > 0,
                  etfFixedIncomeMonthly.length > 0,
                ].filter(Boolean).length;
                switch (extraCards) {
                  case 4:
                    return "lg:grid-cols-8";
                  case 3:
                    return "lg:grid-cols-7";
                  case 2:
                    return "lg:grid-cols-6";
                  case 1:
                    return "lg:grid-cols-5";
                  default:
                    return "lg:grid-cols-4";
                }
              })(),
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
            {fiInfraMonthly.length > 0 && (
              <MetricBox
                label={tScreen.summary.fiInfraCgLabel}
                value={formatCurrency(fiInfraYearTotals.totalGain, "BRL", locale)}
                variant="success"
                trend="up"
                subValue={tScreen.summary.fiInfraCgHelper}
              />
            )}
            {foreignAnnual.length > 0 && (
              <MetricBox
                label={tScreen.summary.foreignCgLabel}
                value={formatCurrency(foreignYearTotals.totalTaxDueBrl, "BRL", locale)}
                variant="warning"
                trend="neutral"
                subValue={tScreen.summary.foreignCgHelper}
              />
            )}
            {etfFixedIncomeMonthly.length > 0 && (
              <MetricBox
                label={tScreen.summary.etfFixedIncomeCgLabel}
                value={formatCurrency(etfFixedIncomeYearTotals.totalTaxDue, "BRL", locale)}
                variant="warning"
                trend="neutral"
                subValue={tScreen.summary.etfFixedIncomeCgHelper}
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

          {/* Monthly Detail — Fixed Income ETFs */}
          {etfFixedIncomeMonthly.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {tScreen.monthlyDetail.etfFixedIncomeTitle}
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
                    {etfFixedIncomeMonthly.map((month) => (
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
              <p className="text-xs text-muted-foreground">{tScreen.monthlyDetail.etfFixedIncomeNote}</p>
            </div>
          )}

          {/* Annual Detail — Foreign Stocks & REITs */}
          {foreignAnnual.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {tScreen.monthlyDetail.foreignTitle}
              </h3>
              <div className="rounded-xl border border-border/50 bg-background/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider">{tScreen.monthlyDetail.yearHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.salesHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.gainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxableGainHeader}</TableHead>
                      <TableHead className="font-display text-xs font-semibold uppercase tracking-wider text-right">{tScreen.monthlyDetail.taxDueHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foreignAnnual.map((row) => (
                      <TableRow key={row.year}>
                        <TableCell className="font-medium">{row.year}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.totalSales, "USD", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.totalGain, "USD", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.taxableGain, "USD", locale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatCurrency(row.taxDue, "USD", locale)}
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