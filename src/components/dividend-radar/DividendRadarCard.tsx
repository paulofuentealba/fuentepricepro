import React from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import type { RadarItem } from "@/lib/dividendRadarLogic";

interface DividendRadarCardProps {
  item: RadarItem;
  onOpenDetail: (item: RadarItem) => void;
  onInvest: (item: RadarItem) => void;
  formatCurrency: (val: number, currency?: string) => string;
}

export function DividendRadarCard({
  item,
  onOpenDetail,
  onInvest,
  formatCurrency,
}: DividendRadarCardProps) {
  const { t } = useI18n();
  const d = t.dividendRadar;

  const isUs = item.currency === "USD";
  const isPositiveMargin = item.margin > 0;

  const getScoreBadge = () => {
    switch (item.safetyTier) {
      case "very_safe":
      case "safe":
        return {
          icon: <ShieldCheck className="h-3.5 w-3.5 text-success" />,
          colorClass: "text-success bg-success/15 border-success/30",
        };
      case "caution":
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
          colorClass: "text-warning bg-warning/15 border-warning/30",
        };
      case "cut_risk":
      default:
        return {
          icon: <ShieldAlert className="h-3.5 w-3.5 text-danger" />,
          colorClass: "text-danger bg-danger/15 border-danger/30",
        };
    }
  };

  const badgeInfo = getScoreBadge();

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40 cursor-pointer",
        item.isTrap
          ? "border-warning/40 bg-gradient-to-br from-warning/5 via-card to-card"
          : "border-border"
      )}
    >
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                {item.ticker}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider py-0 px-1.5",
                  isUs
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : "border-primary/40 bg-primary/10 text-primary"
                )}
              >
                {item.type.replace("_", " ")}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1">
              {item.name}
            </div>
          </div>

          {/* Safety Score badge */}
          <div
            className={cn(
              "flex flex-col items-end rounded-lg border px-2 py-1 text-right",
              badgeInfo.colorClass
            )}
          >
            <div className="flex items-center gap-1 font-mono text-xs font-bold">
              {badgeInfo.icon}
              <span>{item.safetyScore}</span>
              <span className="text-[10px] font-normal opacity-70">
                {d.card.scoreSuffix}
              </span>
            </div>
            <span className="text-[10px] font-medium leading-none mt-0.5">
              {item.safetyLabel}
            </span>
          </div>
        </div>

        {/* 3 Metrics: Price, Ceiling, Margin */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {d.card.price}
            </div>
            <div className="font-mono text-xs sm:text-sm font-semibold text-foreground mt-0.5">
              {formatCurrency(item.price, item.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {d.card.ceiling}
            </div>
            <div className="font-mono text-xs sm:text-sm font-semibold text-success mt-0.5">
              {formatCurrency(item.ceilingPrice, item.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {d.card.margin}
            </div>
            <div
              className={cn(
                "font-mono text-xs sm:text-sm font-bold mt-0.5",
                item.isTrap
                  ? "text-warning"
                  : isPositiveMargin
                  ? "text-success"
                  : "text-danger"
              )}
            >
              {item.margin >= 0 ? "+" : ""}
              {item.margin.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Secondary metrics: DY 12m, Net DY, Payout */}
        <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span>
            {d.card.dy12m}{" "}
            <strong className="font-mono font-medium text-foreground">
              {item.dyGross.toFixed(1)}%
            </strong>
          </span>
          <span>
            {d.card.dyNet}{" "}
            <strong className="font-mono font-semibold text-success">
              {item.dyNet.toFixed(1)}%
            </strong>
          </span>
          <span>
            {d.card.payout}{" "}
            <strong
              className={cn(
                "font-mono font-medium",
                item.isTrap
                  ? "text-danger font-bold"
                  : "text-foreground"
              )}
            >
              {item.payout != null ? `${item.payout}%` : "—"}
            </strong>
          </span>
        </div>

        {/* Seasonality note */}
        <div className="flex items-center justify-between rounded-lg bg-card/60 border border-border/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" />
            <span>
              {d.card.seasonality}{" "}
              <strong className="text-foreground">{item.nextMonth}</strong>
            </span>
          </div>
          <span className="font-medium text-primary text-[10px]">
            {item.consistency}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px]">
        <div className="text-muted-foreground">
          {d.card.windowCom}{" "}
          <strong className="text-foreground font-mono">{item.windowCom}</strong>
        </div>

        <Button
          type="button"
          size="sm"
          variant={item.isTrap ? "outline" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            if (item.isTrap) {
              onOpenDetail(item);
            } else {
              onInvest(item);
            }
          }}
          className={cn(
            "h-7 text-xs font-medium px-2.5",
            item.isTrap && "border-warning/40 text-warning hover:bg-warning/10"
          )}
        >
          {item.isTrap ? d.card.auditBtn : d.card.investBtn}
        </Button>
      </div>
    </div>
  );
}
