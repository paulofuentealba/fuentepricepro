import React from "react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/i18n";
import type { Currency } from "@/lib/domain";

interface ValuationRadarProps {
  currentPrice: number;
  currency: Currency;
  graham: number | null;
  bazin: number | null;
  gordon: number | null;
  consensus: number | null;
  className?: string;
}

export function ValuationRadar({
  currentPrice,
  currency,
  graham,
  bazin,
  gordon,
  consensus,
  className,
}: ValuationRadarProps) {
  const { t, locale } = useI18n();

  if (consensus === null) {
    return (
      <div className={cn("flex flex-col justify-center opacity-50", className)}>
        <span className="text-xs uppercase font-semibold text-muted-foreground">
          {t.valuation.consensus}
        </span>
        <span className="text-lg font-mono">--</span>
      </div>
    );
  }

  const isSafeBuy = currentPrice < consensus;
  const margin = ((consensus - currentPrice) / currentPrice) * 100;

  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      <div className="flex flex-col relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t.valuation.consensus}
          </span>
          {isSafeBuy ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 text-[9px] uppercase font-bold px-1.5 py-0">
              {t.valuation.safeBuy}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 border-rose-500/20 text-[9px] uppercase font-bold px-1.5 py-0"
            >
              {t.valuation.overvalued}
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "text-3xl font-mono font-bold tracking-tighter drop-shadow-md",
            isSafeBuy ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {formatCurrency(consensus, currency, locale)}
        </div>
        <div className="text-[11px] text-muted-foreground/70 mt-1 font-medium font-mono">
          Margin: {margin > 0 ? "+" : ""}
          {margin.toFixed(1)}%
        </div>
      </div>

      {/* Subtle Radar SVG Background */}
      <div className="w-16 h-16 relative opacity-30 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Base Grid */}
          <polygon
            points="50,5 95,75 5,75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/50"
          />
          <polygon
            points="50,25 80,70 20,70"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/30"
          />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="5"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/50"
          />
          <line
            x1="50"
            y1="50"
            x2="95"
            y2="75"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/50"
          />
          <line
            x1="50"
            y1="50"
            x2="5"
            y2="75"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/50"
          />

          {/* Data Polygon */}
          <polygon
            points={`50,${graham ? 20 : 50} ${bazin ? 80 : 50},${bazin ? 70 : 50} ${gordon ? 20 : 50},${gordon ? 70 : 50}`}
            fill={isSafeBuy ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"}
            stroke={isSafeBuy ? "rgb(52, 211, 153)" : "rgb(251, 113, 133)"}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
