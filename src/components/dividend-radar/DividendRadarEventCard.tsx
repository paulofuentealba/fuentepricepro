import React from "react";
import { CalendarCheck, Banknote, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-provider";
import type { AgendaDividendEvent, RadarItem } from "@/lib/dividendRadarLogic";

interface DividendRadarEventCardProps {
  event: AgendaDividendEvent;
  onOpenDetail: (radarItem: RadarItem) => void;
  formatCurrency: (val: number, cur?: string) => string;
}

export function DividendRadarEventCard({
  event,
  onOpenDetail,
  formatCurrency,
}: DividendRadarEventCardProps) {
  const { t } = useI18n();
  const d = t.dividendRadar.agenda;

  const isCom = event.eventType === "com";
  const isUs = event.currency === "USD";

  const handleCardClick = () => {
    if (event.radarItem) {
      onOpenDetail(event.radarItem);
    }
  };

  return (
    <div
      data-testid={`agenda-card-${event.ticker}-${event.id}`}
      onClick={handleCardClick}
      className={`group relative flex flex-col md:grid md:grid-cols-[140px_1.4fr_1.2fr_1.6fr_auto] items-start md:items-center gap-3 md:gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
        event.isTrap
          ? "border-destructive/30 bg-destructive/[0.02] hover:border-destructive/50"
          : "border-border/80 bg-card hover:border-primary/50 hover:shadow-sm"
      }`}
    >
      {/* Coluna 1: Tipo de Evento & Tributação */}
      <div className="flex flex-col items-start gap-1">
        {isCom ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30">
            <CalendarCheck className="h-3.5 w-3.5" />
            {d.badgeCom}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-warning/15 text-warning border border-warning/30">
            <Banknote className="h-3.5 w-3.5" />
            {d.badgePay}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground font-medium">
          {d.taxTypes[event.taxType]}
        </span>
      </div>

      {/* Coluna 2: Identidade do Ativo */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-foreground tracking-tight">
            {event.ticker}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 ${
              isUs
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-success/30 bg-success/10 text-success"
            }`}
          >
            {event.type.replace("_", " ")}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground truncate block max-w-[240px]">
          {event.name}
        </span>
      </div>

      {/* Coluna 3: Valor Declarado & Data Recíproca */}
      <div className="min-w-0">
        <div className="font-mono font-bold text-sm sm:text-base text-foreground">
          {formatCurrency(event.declaredAmount, event.currency)}
          <span className="text-xs text-muted-foreground font-normal ml-1">
            {isUs ? "/ share" : "/ cota"}
          </span>
        </div>
        <span className="text-[11.5px] text-muted-foreground block">
          {isCom
            ? d.reciprocalCom.replace("{{date}}", event.reciprocalDateFormatted)
            : d.reciprocalPay.replace("{{date}}", event.reciprocalDateFormatted)}
        </span>
      </div>

      {/* Coluna 4: Inteligência Fuente (Teto Bazin & Safety Score) */}
      <div className="flex flex-wrap md:flex-col items-start gap-1.5">
        {event.isBelowCeiling ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-success/10 text-success border border-success/20">
            {d.belowCeiling
              .replace("{{price}}", formatCurrency(event.ceilingPrice, event.currency))
              .replace("{{margin}}", `+${event.margin.toFixed(1)}%`)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
            {d.aboveCeiling.replace("{{margin}}", `${event.margin.toFixed(1)}%`)}
          </span>
        )}

        {event.isTrap ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
            <AlertTriangle className="h-3 w-3" />
            {d.scoreTrap.replace("{{score}}", String(event.safetyScore))}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-success/10 text-success border border-success/20">
            <ShieldCheck className="h-3 w-3" />
            {d.scoreSafe
              .replace("{{score}}", String(event.safetyScore))
              .replace("{{label}}", event.safetyLabel)}
          </span>
        )}
      </div>

      {/* Coluna 5: Ação / Drill-Down */}
      <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
        <Button
          size="sm"
          variant={event.isTrap ? "outline" : "secondary"}
          className="text-xs h-8 px-3 gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            if (event.radarItem) onOpenDetail(event.radarItem);
          }}
        >
          <span>{event.isTrap ? d.btnAuditRisk : d.btnXRay}</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Button>
      </div>
    </div>
  );
}
