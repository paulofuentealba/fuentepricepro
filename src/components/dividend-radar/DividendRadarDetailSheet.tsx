import React from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, Calendar, Scale } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import type { RadarItem } from "@/lib/dividendRadarLogic";

interface DividendRadarDetailSheetProps {
  item: RadarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvest: (item: RadarItem) => void;
  formatCurrency: (val: number, currency?: string) => string;
}

export function DividendRadarDetailSheet({
  item,
  open,
  onOpenChange,
  onInvest,
  formatCurrency,
}: DividendRadarDetailSheetProps) {
  const { t } = useI18n();
  const d = t.dividendRadar;

  if (!item) return null;

  const isPositiveMargin = item.margin > 0;
  const isUs = item.currency === "USD";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-6 scrollbar-none"
      >
        <SheetHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              {item.type.replace("_", " ")} • {item.currency}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] py-0 px-1.5",
                isUs
                  ? "border-warning/30 text-warning"
                  : "border-primary/30 text-primary"
              )}
            >
              {item.ticker}
            </Badge>
          </div>
          <SheetTitle className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {item.ticker} — {item.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {d.detailSheet.title}
          </SheetDescription>
        </SheetHeader>

        {/* Radar Status Card */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {d.detailSheet.statusRadar}
              </div>
              <div
                className={cn(
                  "font-serif text-lg sm:text-xl font-bold mt-0.5",
                  item.isTrap
                    ? "text-warning"
                    : isPositiveMargin
                    ? "text-success"
                    : "text-danger"
                )}
              >
                {item.margin >= 0 ? "+" : ""}
                {item.margin.toFixed(1)}%{" "}
                {isPositiveMargin ? d.card.belowCeiling : d.card.aboveCeiling}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-mono font-bold text-primary">
                {item.safetyTier === "cut_risk" ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                ) : item.safetyTier === "caution" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                )}
                Score: {item.safetyScore} / 100
              </span>
              <span className="text-[10px] font-medium text-muted-foreground mt-1">
                {item.safetyLabel}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
            {item.safetySummary}
          </p>
        </div>

        {/* Bazin Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
            <Scale className="h-3.5 w-3.5 text-primary" />
            <span>{d.detailSheet.bazinDecomposition}</span>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden text-xs">
            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between p-3">
                <span className="text-muted-foreground">{d.detailSheet.dpa}</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(item.dpa, item.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-muted-foreground">{d.detailSheet.targetYield}</span>
                <span className="font-mono font-semibold text-foreground">
                  {item.targetYield.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/20">
                <span className="text-muted-foreground font-medium">{d.detailSheet.formulaBazin}</span>
                <span className="font-mono font-bold text-success">
                  {formatCurrency(item.ceilingPrice, item.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-muted-foreground">{d.detailSheet.currentPrice}</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(item.price, item.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-muted-foreground">{d.detailSheet.effectiveMargin}</span>
                <span
                  className={cn(
                    "font-mono font-bold",
                    item.isTrap
                      ? "text-warning"
                      : isPositiveMargin
                      ? "text-success"
                      : "text-danger"
                  )}
                >
                  {item.margin >= 0 ? "+" : ""}
                  {item.margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FCF & Fundamentals */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>{d.detailSheet.fcfHealth}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase">{d.detailSheet.fcfPayout}</div>
              <div className="font-mono text-sm font-bold text-foreground mt-1">
                {item.fcfPayout != null
                  ? `${item.fcfPayout}%`
                  : item.payout != null
                  ? `${item.payout}%`
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase">{d.detailSheet.cagr5y}</div>
              <div className="font-mono text-sm font-bold text-foreground mt-1">
                {item.cagr5y != null
                  ? `${item.cagr5y >= 0 ? "+" : ""}${item.cagr5y.toFixed(1)}%`
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase">{d.detailSheet.netDebtEbitda}</div>
              <div className="font-mono text-sm font-bold text-foreground mt-1">
                {item.netDebtEbitda != null ? `${item.netDebtEbitda.toFixed(1)}x` : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase">ROE</div>
              <div className="font-mono text-sm font-bold text-foreground mt-1">
                {item.roe != null ? `${item.roe.toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Seasonality Audit */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{d.detailSheet.seasonalityAudit}</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{d.card.windowCom}</span>
              <span className="font-mono font-semibold text-foreground">{item.windowCom}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{d.card.seasonality}</span>
              <span className="font-medium text-foreground">{item.nextMonth}</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span>{d.detailSheet.historyTrack}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2">
          <Button
            type="button"
            className="flex-1 text-xs"
            onClick={() => {
              onOpenChange(false);
              onInvest(item);
            }}
          >
            {d.card.investBtn} ({item.ticker})
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            {d.detailSheet.close}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
