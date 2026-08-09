import React from "react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/i18n";
import type { Currency } from "@/lib/domain";
import { Info } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

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
        <div className="flex flex-col items-start gap-1.5 mb-2">
          <div className="flex items-center gap-1">
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  aria-label={t.valuation.breakdown}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.valuation.consensus}
                  <Info className="h-3 w-3" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                side="top"
                align="start"
                className="z-[999] w-48 p-3 bg-popover border-border shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground mb-1">
                    {t.valuation.breakdown}
                  </span>
                  <div className="flex justify-between items-center text-sm font-mono">
                    <span className="text-muted-foreground">{t.valuation.bazin}:</span>
                    <span
                      className={bazin ? "text-foreground font-semibold" : "text-muted-foreground"}
                    >
                      {bazin ? formatCurrency(bazin, currency, locale) : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-mono">
                    <span className="text-muted-foreground">{t.valuation.graham}:</span>
                    <span
                      className={graham ? "text-foreground font-semibold" : "text-muted-foreground"}
                    >
                      {graham ? formatCurrency(graham, currency, locale) : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-mono">
                    <span className="text-muted-foreground">{t.valuation.gordon}:</span>
                    <span
                      className={gordon ? "text-foreground font-semibold" : "text-muted-foreground"}
                    >
                      {gordon ? formatCurrency(gordon, currency, locale) : "--"}
                    </span>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          {isSafeBuy ? (
            <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20 text-[9px] uppercase font-bold px-1.5 py-0">
              {t.valuation.safeBuy}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-danger/5 text-danger hover:bg-danger/10 border-danger/20 text-[9px] uppercase font-bold px-1.5 py-0"
            >
              {t.valuation.overvalued}
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "text-xl font-mono font-bold tracking-tighter drop-shadow-md",
            isSafeBuy ? "text-success" : "text-danger",
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
            className="text-primary/50"
          />
          <polygon
            points="50,25 80,70 20,70"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/30"
          />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="5"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/50"
          />
          <line
            x1="50"
            y1="50"
            x2="95"
            y2="75"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/50"
          />
          <line
            x1="50"
            y1="50"
            x2="5"
            y2="75"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/50"
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
