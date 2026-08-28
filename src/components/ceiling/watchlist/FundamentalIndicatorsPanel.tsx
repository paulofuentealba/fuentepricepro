import React from "react";
import { BarChart3, TrendingUp, Layers, Building2, PieChart } from "lucide-react";
import type { Asset } from "@/lib/domain";
import type { getAssetValuation } from "@/lib/calculations";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/i18n";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn } from "@/lib/utils";

interface Props {
  asset: Asset;
  valuation: ReturnType<typeof getAssetValuation>;
}

interface IndicatorItemProps {
  label: string;
  tooltip: string;
  value: React.ReactNode;
  valueClassName?: string;
}

function IndicatorItem({ label, tooltip, value, valueClassName }: IndicatorItemProps) {
  return (
    <div className="flex flex-col p-3 rounded-lg bg-background border border-border/30 hover:border-border/60 transition-colors">
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-xs text-muted-foreground leading-snug">{label}</span>
        <InfoTooltip content={tooltip} />
      </div>
      <div className={cn("text-sm font-semibold text-foreground truncate mt-auto", valueClassName)}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export function FundamentalIndicatorsPanel({ asset, valuation }: Props) {
  const { t, locale } = useI18n();

  const isStock = asset.type === "STOCK_BR" || asset.type === "STOCK_US";
  const isFii =
    asset.type === "FII" ||
    asset.type === "FII_INFRA" ||
    asset.type === "FIAGRO" ||
    asset.type === "REIT";
  const isEtf = asset.type === "ETF";

  const metrics = asset.metrics;

  return (
    <div className="rounded-xl border border-border/50 bg-background p-4 sm:p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t.fundamentalIndicators.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t.fundamentalIndicators.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Category 1: Valuation & Preço */}
        <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pb-1 border-b border-border/30">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>{t.fundamentalIndicators.categoryValuation}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 pt-1">
            {isStock && (
              <IndicatorItem
                label={t.fundamentalIndicators.peRatio}
                tooltip={t.fundamentalIndicators.peRatioTip}
                value={
                  metrics?.peRatio != null
                    ? `${formatNumber(metrics.peRatio, locale, 2)}x`
                    : "—"
                }
              />
            )}
            <IndicatorItem
              label={
                isFii
                  ? t.fundamentalIndicators.pNavRatio
                  : t.fundamentalIndicators.pbRatio
              }
              tooltip={
                isFii
                  ? t.fundamentalIndicators.pNavRatioTip
                  : t.fundamentalIndicators.pbRatioTip
              }
              value={
                metrics?.pbRatio != null
                  ? `${formatNumber(metrics.pbRatio, locale, 2)}x`
                  : "—"
              }
            />
            <IndicatorItem
              label={t.fundamentalIndicators.activeCeiling}
              tooltip={t.fundamentalIndicators.activeCeilingTip}
              value={
                valuation.activeCeiling != null && valuation.activeCeiling > 0
                  ? formatCurrency(valuation.activeCeiling, asset.currency, locale)
                  : "—"
              }
            />
            <IndicatorItem
              label={t.fundamentalIndicators.marginOfSafety}
              tooltip={t.fundamentalIndicators.marginOfSafetyTip}
              value={
                valuation.margin != null
                  ? formatPercent(valuation.margin, locale)
                  : "—"
              }
              valueClassName={
                valuation.margin != null
                  ? valuation.margin > 0
                    ? "text-success font-bold"
                    : "text-destructive font-bold"
                  : undefined
              }
            />
          </div>
        </div>

        {/* Category 2: Proventos & Renda */}
        <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pb-1 border-b border-border/30">
            <PieChart className="h-3.5 w-3.5 text-primary" />
            <span>{t.fundamentalIndicators.categoryDividends}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 pt-1">
            <IndicatorItem
              label={t.fundamentalIndicators.currentDy}
              tooltip={t.fundamentalIndicators.currentDyTip}
              value={
                metrics?.currentDy != null
                  ? formatPercent(metrics.currentDy, locale)
                  : "—"
              }
              valueClassName="text-success font-bold"
            />
            <IndicatorItem
              label={t.fundamentalIndicators.dividendCagr5y}
              tooltip={t.fundamentalIndicators.dividendCagr5yTip}
              value={
                metrics?.dividendCagr5y != null
                  ? formatPercent(metrics.dividendCagr5y, locale)
                  : "—"
              }
              valueClassName={
                metrics?.dividendCagr5y != null && metrics.dividendCagr5y < 0
                  ? "text-warning font-semibold"
                  : undefined
              }
            />
            {isStock && (
              <IndicatorItem
                label={t.fundamentalIndicators.payoutRatio}
                tooltip={t.fundamentalIndicators.payoutRatioTip}
                value={
                  metrics?.payoutRatio != null
                    ? formatPercent(metrics.payoutRatio, locale)
                    : "—"
                }
              />
            )}
          </div>
        </div>

        {/* Category 3: Rentabilidade & Eficiência (Stocks & REITs) */}
        {(isStock || isFii) && (
          <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pb-1 border-b border-border/30">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>{t.fundamentalIndicators.categoryProfitability}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 pt-1">
              <IndicatorItem
                label={t.fundamentalIndicators.roe}
                tooltip={t.fundamentalIndicators.roeTip}
                value={
                  metrics?.roe != null
                    ? formatPercent(metrics.roe, locale)
                    : "—"
                }
              />
              <IndicatorItem
                label={t.fundamentalIndicators.eps}
                tooltip={t.fundamentalIndicators.epsTip}
                value={
                  metrics?.eps != null
                    ? formatCurrency(metrics.eps, asset.currency, locale)
                    : "—"
                }
              />
              <IndicatorItem
                label={t.fundamentalIndicators.bvps}
                tooltip={t.fundamentalIndicators.bvpsTip}
                value={
                  metrics?.bvps != null
                    ? formatCurrency(metrics.bvps, asset.currency, locale)
                    : "—"
                }
              />
            </div>
          </div>
        )}

        {/* Category 4: Fundos Imobiliários & Crédito */}
        {isFii && (
          <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pb-1 border-b border-border/30">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>{t.fundamentalIndicators.categoryRealEstate}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 pt-1">
              <IndicatorItem
                label={t.fundamentalIndicators.capRate}
                tooltip={t.fundamentalIndicators.capRateTip}
                value={
                  metrics?.capRate != null
                    ? formatPercent(metrics.capRate, locale)
                    : "—"
                }
              />
              <IndicatorItem
                label={t.fundamentalIndicators.vacancy}
                tooltip={t.fundamentalIndicators.vacancyTip}
                value={
                  metrics?.vacancy != null
                    ? formatPercent(metrics.vacancy, locale)
                    : "—"
                }
              />
            </div>
          </div>
        )}

        {/* Category 5: ETFs & Gestão */}
        {isEtf && (
          <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pb-1 border-b border-border/30">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>{t.fundamentalIndicators.categoryEtf}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 pt-1">
              <IndicatorItem
                label={t.fundamentalIndicators.expenseRatio}
                tooltip={t.fundamentalIndicators.expenseRatioTip}
                value={
                  metrics?.expenseRatio != null
                    ? formatPercent(metrics.expenseRatio, locale)
                    : "—"
                }
              />
              <IndicatorItem
                label={t.fundamentalIndicators.aum}
                tooltip={t.fundamentalIndicators.aumTip}
                value={
                  metrics?.aum != null
                    ? formatCurrency(metrics.aum, asset.currency, locale)
                    : "—"
                }
              />
              <IndicatorItem
                label={t.fundamentalIndicators.trackingError}
                tooltip={t.fundamentalIndicators.trackingErrorTip}
                value={
                  metrics?.trackingError != null
                    ? formatPercent(metrics.trackingError, locale)
                    : "—"
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
