import React from "react";
import { usePortfolioRisk } from "@/lib/usePortfolioRisk";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { AlertTriangle, PieChart, ShieldAlert, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayTicker } from "@/lib/i18n";

export function RiskRadar() {
  const { t, locale } = useI18n();
  const risk = usePortfolioRisk();
  const l = locale as "ptBR" | "en" | "es";

  if (risk.totalEquity === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-2xl bg-background/20 backdrop-blur mt-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{t.riskRadar.emptyTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t.riskRadar.emptySubtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Warnings */}
      {risk.warnings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t.riskRadar.systemWarnings}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risk.warnings.map(w => {
              const Icon = w.severity === "red" ? ShieldAlert : AlertCircle;
              const bgClass = w.severity === "red" ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20";
              const textClass = w.severity === "red" ? "text-red-500" : "text-amber-500";
              
              let title = "";
              let desc = "";
              
              if (w.type === "yield_trap") {
                title = t.riskRadar.warnings.yieldTrapTitle;
                desc = t.riskRadar.warnings.yieldTrapDesc;
              } else if (w.type === "payout_audit") {
                title = t.riskRadar.warnings.payoutAuditTitle;
                desc = t.riskRadar.warnings.payoutAuditDesc;
              } else if (w.type === "concentration") {
                if (w.extraData?.sector) {
                  title = t.riskRadar.warnings.sectorConcentrationTitle;
                  desc = t.riskRadar.warnings.sectorConcentrationDesc.replace("{sector}", w.extraData.sector);
                } else {
                  title = t.riskRadar.warnings.assetConcentrationTitle;
                  desc = t.riskRadar.warnings.assetConcentrationDesc;
                }
              }

              return (
                <div key={w.id} className={cn("p-4 rounded-xl border flex items-start gap-3", bgClass)}>
                  <Icon className={cn("h-5 w-5 mt-0.5", textClass)} />
                  <div>
                    <h4 className={cn("font-medium text-sm", textClass)}>
                      {w.ticker ? `${displayTicker(w.ticker)} — ` : ""}{title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t.riskRadar.currencyExposure}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {risk.currencies.map(c => (
                <div key={c.currency} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{c.currency}</span>
                    <span className="text-muted-foreground">{formatPercent(c.weightPct, l)}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${Math.min(c.weightPct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              {t.riskRadar.typeExposure}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {risk.types.map(tItem => (
                <div key={tItem.type} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{tItem.type}</span>
                    <span className="text-muted-foreground">{formatPercent(tItem.weightPct, l)}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${Math.min(tItem.weightPct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Concentration */}
        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">{t.riskRadar.assetConcentration}</CardTitle>
            <CardDescription>{t.riskRadar.assetConcentrationDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t.riskRadar.asset}</th>
                    <th className="px-4 py-3 font-medium text-right">{t.riskRadar.weight}</th>
                    <th className="px-4 py-3 font-medium text-center">{t.riskRadar.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {risk.assets.map(a => {
                    const isCritical = a.weightPct > 15;
                    const isWarning = a.weightPct > 10 && a.weightPct <= 15;
                    const badgeClass = isCritical 
                      ? "bg-red-500/10 text-red-500 border-red-500/20" 
                      : isWarning 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    const statusText = isCritical 
                      ? t.riskRadar.critical 
                      : isWarning 
                        ? t.riskRadar.warning 
                        : t.riskRadar.safe;

                    return (
                      <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {displayTicker(a.ticker)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatPercent(a.weightPct, l)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={badgeClass}>
                            {statusText}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sector Exposure */}
        <Card className="bg-background/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">{t.riskRadar.sectorExposure}</CardTitle>
            <CardDescription>{t.riskRadar.sectorExposureDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t.riskRadar.sector}</th>
                    <th className="px-4 py-3 font-medium text-right">{t.riskRadar.weight}</th>
                    <th className="px-4 py-3 font-medium text-center">{t.riskRadar.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {risk.sectors.map(s => {
                    const isWarning = s.weightPct > 25;
                    const badgeClass = isWarning 
                      ? "bg-destructive/10 text-destructive border-destructive/20" 
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    const statusText = isWarning 
                      ? t.riskRadar.concentrationRisk 
                      : t.riskRadar.safe;

                    return (
                      <tr key={s.sector} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {s.sector}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatPercent(s.weightPct, l)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={badgeClass}>
                            {statusText}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
