import React, { useState, useMemo } from "react";
import {
  Copy,
  Download,
  FileText,
  Receipt,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  PiggyBank,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import type { Transaction, AccountType } from "@/lib/transactionsLogic";
import type { AssetType } from "@/lib/domain";
import {
  buildUsTaxYearSummary,
  generate1099Csv,
} from "@/lib/tax/us/form1099";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

interface UsTax1099ReportProps {
  valuedItems: ValuedWatchlistItem[];
  context: TaxRealityContext;
  transactions: Transaction[];
  currentYear?: number;
}

export function UsTax1099Report({
  valuedItems,
  context,
  transactions,
  currentYear = new Date().getFullYear(),
}: UsTax1099ReportProps) {
  const { t, locale } = useI18n();
  const u = t.usTax1099;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [activeTab, setActiveTab] = useState<"div" | "b" | "roth">("div");

  // Build metadata map for tickers
  const assetMetaMap = useMemo(() => {
    const map: Record<string, { type?: AssetType; name?: string; accountType?: AccountType }> = {};
    for (const it of valuedItems) {
      map[it.ticker.toUpperCase()] = {
        type: it.type,
        name: it.name,
        accountType: it.accountType || undefined,
      };
    }
    return map;
  }, [valuedItems]);

  // Compute 1099 summary using pure SSOT engine
  const summary = useMemo(() => {
    return buildUsTaxYearSummary(
      context.realizedIncomeEvents || [],
      transactions,
      assetMetaMap,
      selectedYear,
    );
  }, [context.realizedIncomeEvents, transactions, assetMetaMap, selectedYear]);

  // Filter 1099-DIV items by account
  const filteredDivItems = useMemo(() => {
    if (accountFilter === "all") return summary.divSummary.items;
    return summary.divSummary.items.filter((it) => it.accountType === accountFilter);
  }, [summary.divSummary.items, accountFilter]);

  // Filter 1099-B sales by account
  const filteredSales = useMemo(() => {
    if (accountFilter === "all") return summary.bSummary.sales;
    return summary.bSummary.sales.filter((s) => s.accountType === accountFilter);
  }, [summary.bSummary.sales, accountFilter]);

  const handleCopySummary = () => {
    const text = [
      `=== IRS FORM 1099 SUMMARY (TAX YEAR ${selectedYear}) ===`,
      `Box 1a Total Ordinary Dividends: $${summary.divSummary.totalOrdinaryDividends.toFixed(2)}`,
      `Box 1b Qualified Dividends: $${summary.divSummary.totalQualifiedDividends.toFixed(2)}`,
      `Box 5 Section 199A REIT Dividends: $${summary.divSummary.totalSection199aDividends.toFixed(2)}`,
      `Net Short-Term Capital Gain/Loss: $${summary.bSummary.netShortTerm.toFixed(2)}`,
      `Net Long-Term Capital Gain/Loss: $${summary.bSummary.netLongTerm.toFixed(2)}`,
      `Total Wash Sale Loss Disallowed: $${summary.bSummary.totalWashSaleDisallowed.toFixed(2)}`,
      `Net Taxable Capital Gain/Loss: $${summary.bSummary.netTaxableGainOrLoss.toFixed(2)}`,
      `Roth IRA Shielded (Tax-Free) Income: $${summary.totalRothTaxFreeIncome.toFixed(2)}`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(
      () => toast.success(u.tableDiv.copySuccess),
      () => toast.error(u.tableDiv.copyError),
    );
  };

  const handleExportCsv = () => {
    const csvContent = generate1099Csv(summary);
    downloadCsv(`form1099_${selectedYear}.csv`, csvContent);
    toast.success(u.exportSuccess);
  };

  const formatUsd = (val: number) =>
    formatCurrency(val, "USD", locale === "en" ? "en" : locale === "es" ? "es" : "ptBR");

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{u.badge}</span>
            </span>

            {/* Controls: Year selector & Account filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs font-medium">
                <span className="text-muted-foreground">{u.yearLabel}</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y} className="bg-popover text-popover-foreground">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs font-medium">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{u.filterAccountLabel}</span>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value as any)}
                  className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-popover text-popover-foreground">
                    {u.allAccounts}
                  </option>
                  <option value="taxable" className="bg-popover text-popover-foreground">
                    {u.taxableAccount}
                  </option>
                  <option value="roth_ira" className="bg-popover text-popover-foreground">
                    {u.rothIraAccount}
                  </option>
                  <option value="traditional_ira_401k" className="bg-popover text-popover-foreground">
                    {u.traditionalIraAccount}
                  </option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1.5 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{u.exportBtn}</span>
              </Button>
            </div>
          </div>

          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {u.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1 max-w-3xl">
              {u.subtitle}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Ordinary vs Qualified Dividends */}
        <Card className="border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{u.metrics.box1a}</span>
            <span className="font-mono text-[11px] font-semibold text-primary">Box 1a</span>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatUsd(summary.divSummary.totalOrdinaryDividends)}
          </div>
          <div className="border-t border-border/40 pt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{u.metrics.box1b}:</span>
            <span className="font-mono font-semibold text-emerald-500">
              {formatUsd(summary.divSummary.totalQualifiedDividends)}
            </span>
          </div>
        </Card>

        {/* Card 2: Section 199A REIT Dividends */}
        <Card className="border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{u.metrics.box5}</span>
            <span className="font-mono text-[11px] font-semibold text-primary">Box 5</span>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatUsd(summary.divSummary.totalSection199aDividends)}
          </div>
          <div className="border-t border-border/40 pt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{u.metrics.qbiDeduction}</span>
            <span className="font-mono font-semibold text-primary">
              {formatUsd(summary.divSummary.totalSection199aDividends * 0.2)}
            </span>
          </div>
        </Card>

        {/* Card 3: Realized Capital Gains & Wash Sales */}
        <Card className="border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{u.metrics.shortTermNet}</span>
            <span className="font-mono text-[11px] font-semibold text-primary">1099-B</span>
          </div>
          <div
            className={cn(
              "text-2xl font-bold font-mono",
              summary.bSummary.netTaxableGainOrLoss >= 0 ? "text-emerald-500" : "text-destructive",
            )}
          >
            {formatUsd(summary.bSummary.netTaxableGainOrLoss)}
          </div>
          <div className="border-t border-border/40 pt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{u.metrics.washSaleDisallowed}:</span>
            <span
              className={cn(
                "font-mono font-semibold",
                summary.bSummary.totalWashSaleDisallowed > 0 ? "text-amber-500" : "text-foreground",
              )}
            >
              {formatUsd(summary.bSummary.totalWashSaleDisallowed)}
            </span>
          </div>
        </Card>

        {/* Card 4: Roth IRA Shielded */}
        <Card className="border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{u.metrics.rothShielded}</span>
            <StatusBadge variant="default">{u.metrics.rothShieldedLabel}</StatusBadge>
          </div>
          <div className="text-2xl font-bold text-emerald-500 font-mono">
            {formatUsd(summary.totalRothTaxFreeIncome)}
          </div>
          <div className="border-t border-border/40 pt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{u.rothCard.estimatedSavings}</span>
            <span className="font-mono font-semibold text-emerald-400">
              +{formatUsd(summary.estimatedTaxSavingsRoth)}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Tabs: 1099-DIV vs 1099-B vs Roth IRA */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="div" className="gap-2 text-xs font-semibold">
              <FileText className="h-3.5 w-3.5" />
              <span>{u.tabs.div}</span>
            </TabsTrigger>
            <TabsTrigger value="b" className="gap-2 text-xs font-semibold">
              <Receipt className="h-3.5 w-3.5" />
              <span>{u.tabs.b}</span>
            </TabsTrigger>
            <TabsTrigger value="roth" className="gap-2 text-xs font-semibold">
              <PiggyBank className="h-3.5 w-3.5" />
              <span>{u.tabs.roth}</span>
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySummary}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{u.tableDiv.copySummary}</span>
          </Button>
        </div>

        {/* Tab 1: Form 1099-DIV */}
        <TabsContent value="div" className="mt-4 space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border/60">
                  <tr>
                    <th className="p-3.5">{u.tableDiv.ticker}</th>
                    <th className="p-3.5">{u.tableDiv.payer}</th>
                    <th className="p-3.5">{u.tableDiv.account}</th>
                    <th className="p-3.5 text-right">{u.tableDiv.ordinary}</th>
                    <th className="p-3.5 text-right">{u.tableDiv.qualified}</th>
                    <th className="p-3.5 text-right">{u.tableDiv.section199a}</th>
                    <th className="p-3.5 text-center">{u.tableDiv.events}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredDivItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        {u.tableDiv.empty}
                      </td>
                    </tr>
                  ) : (
                    filteredDivItems.map((item) => (
                      <tr key={`${item.ticker}_${item.accountType}`} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-foreground">
                          {item.ticker}
                        </td>
                        <td className="p-3.5 font-medium text-foreground">
                          {item.payerName || item.ticker}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                              item.accountType === "roth_ira"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : item.accountType === "traditional_ira_401k"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.accountType === "roth_ira"
                              ? u.tableDiv.badgeRoth
                              : item.accountType === "traditional_ira_401k"
                              ? u.tableDiv.badgeTraditional
                              : u.tableDiv.badgeTaxable}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-right font-semibold text-foreground">
                          {formatUsd(item.ordinaryDividends)}
                        </td>
                        <td className="p-3.5 font-mono text-right text-emerald-500 font-semibold">
                          {item.qualifiedDividends > 0 ? formatUsd(item.qualifiedDividends) : "—"}
                        </td>
                        <td className="p-3.5 font-mono text-right text-primary font-semibold">
                          {item.section199aDividends > 0 ? formatUsd(item.section199aDividends) : "—"}
                        </td>
                        <td className="p-3.5 font-mono text-center text-muted-foreground">
                          {item.totalEvents}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Form 1099-B */}
        <TabsContent value="b" className="mt-4 space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border/60">
                  <tr>
                    <th className="p-3.5">{u.tableB.ticker}</th>
                    <th className="p-3.5">{u.tableB.account}</th>
                    <th className="p-3.5">{u.tableB.dateAcquired}</th>
                    <th className="p-3.5">{u.tableB.dateSold}</th>
                    <th className="p-3.5 text-right">{u.tableB.proceeds}</th>
                    <th className="p-3.5 text-right">{u.tableB.costBasis}</th>
                    <th className="p-3.5 text-right">{u.tableB.washDisallowed}</th>
                    <th className="p-3.5 text-right">{u.tableB.gainLoss}</th>
                    <th className="p-3.5 text-center">{u.tableB.term}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        {u.tableB.empty}
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-foreground">
                          {s.ticker}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                              s.accountType === "roth_ira"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : s.accountType === "traditional_ira_401k"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {s.accountType === "roth_ira"
                              ? u.tableDiv.badgeRoth
                              : s.accountType === "traditional_ira_401k"
                              ? u.tableDiv.badgeTraditional
                              : u.tableDiv.badgeTaxable}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {new Date(s.acquisitionDate).toISOString().split("T")[0]}
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {new Date(s.saleDate).toISOString().split("T")[0]}
                        </td>
                        <td className="p-3.5 font-mono text-right text-foreground">
                          {formatUsd(s.proceeds)}
                        </td>
                        <td className="p-3.5 font-mono text-right text-foreground">
                          {formatUsd(s.costBasis)}
                        </td>
                        <td className="p-3.5 font-mono text-right font-semibold">
                          {s.washSaleLossDisallowed > 0 ? (
                            <span className="text-amber-500 flex items-center justify-end gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {formatUsd(s.washSaleLossDisallowed)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className={cn(
                            "p-3.5 font-mono text-right font-bold",
                            s.gainOrLoss >= 0 ? "text-emerald-500" : "text-destructive",
                          )}
                        >
                          {s.gainOrLoss >= 0 ? `+${formatUsd(s.gainOrLoss)}` : formatUsd(s.gainOrLoss)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              s.term === "LONG_TERM"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {s.term === "LONG_TERM" ? u.tableB.longTerm : u.tableB.shortTerm}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Roth IRA Strategy */}
        <TabsContent value="roth" className="mt-4">
          <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {u.rothCard.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                  {u.rothCard.description}
                </CardDescription>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">{u.rothCard.shieldedDividends}</span>
                <div className="text-xl font-mono font-bold text-foreground">
                  {formatUsd(summary.divSummary.rothIraDividendsShielded)}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-1">
                <span className="text-xs text-muted-foreground">{u.rothCard.shieldedGains}</span>
                <div className="text-xl font-mono font-bold text-foreground">
                  {formatUsd(summary.bSummary.rothIraCapitalGainsShielded)}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {u.rothCard.totalShielded}
                </span>
                <div className="text-2xl font-mono font-bold text-emerald-500">
                  {formatUsd(summary.totalRothTaxFreeIncome)}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-sm text-foreground">
                  {u.rothCard.estimatedSavings}
                </span>
                <p className="text-xs text-muted-foreground">{u.rothCard.savingsNote}</p>
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-500">
                +{formatUsd(summary.estimatedTaxSavingsRoth)}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
