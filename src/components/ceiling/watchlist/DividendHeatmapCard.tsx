import { useMemo } from "react";
import { Flame, PieChart, Info } from "lucide-react";
import type { Asset } from "@/lib/domain";
import { computeDividendHeatmap } from "@/lib/dividendHeatmap";
import { useI18n } from "@/lib/i18n-provider";
import { formatNumber, formatPercent } from "@/lib/i18n";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn } from "@/lib/utils";

interface Props {
  asset: Asset;
}

export function DividendHeatmapCard({ asset }: Props) {
  const { t, locale } = useI18n();

  const data = useMemo(() => {
    return computeDividendHeatmap(asset);
  }, [asset]);

  const { years, cellsByYear, maxMonthlyAmount, recurrenceByMonth, payoutRatio } = data;

  const monthsShort =
    t.dividendHeatmap?.monthsShort || [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

  if (years.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t.dividendHeatmap.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t.dividendHeatmap.subtitle}
            </p>
          </div>
        </div>

        {/* Payout ratio badge for stocks */}
        {payoutRatio != null && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold text-primary">
            <PieChart className="h-3.5 w-3.5" />
            <span>Payout: {formatPercent(payoutRatio, locale)}</span>
          </div>
        )}
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="overflow-x-auto rounded-lg border border-border/40 bg-background/40">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 text-[11px] font-semibold text-muted-foreground">
              <th className="py-2 px-2 text-left pl-3 font-medium">Ano</th>
              {monthsShort.map((m: string, idx: number) => (
                <th key={idx} className="py-2 px-1 min-w-[36px] font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {years.map((year) => (
              <tr key={year} className="hover:bg-muted/15 transition-colors">
                <td className="py-2 px-2 text-left pl-3 font-semibold text-foreground text-[11px]">
                  {year}
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const cell = cellsByYear[year]?.[month];
                  const amount = cell?.totalAmount || 0;
                  const ratio = maxMonthlyAmount > 0 ? amount / maxMonthlyAmount : 0;

                  return (
                    <td key={month} className="p-1">
                      {amount > 0 ? (
                        <div
                          className={cn(
                            "rounded py-1 px-0.5 text-[10px] font-semibold transition-all text-center",
                            ratio > 0.6
                              ? "bg-success text-success-foreground font-bold shadow-2xs"
                              : ratio > 0.3
                                ? "bg-success/30 text-success border border-success/40"
                                : "bg-success/15 text-success border border-success/20",
                          )}
                          title={`${year}/${month}: R$ ${amount.toFixed(2)}`}
                        >
                          {amount.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 text-[10px]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Recurrence Summary Row */}
            <tr className="border-t-2 border-border/50 bg-muted/25 font-semibold">
              <td className="py-2 px-2 text-left pl-3 text-[11px] text-foreground flex items-center gap-1">
                <span>{t.dividendHeatmap.recurrenceHeader}</span>
                <InfoTooltip content={t.dividendHeatmap.recurrenceTip} />
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const rec = recurrenceByMonth[month];
                const pct = rec?.recurrencePct || 0;
                const isFrequent = pct >= 50;

                return (
                  <td key={month} className="p-1 text-center">
                    <span
                      className={cn(
                        "text-[10px] block py-0.5 px-0.5 rounded",
                        isFrequent
                          ? "font-bold text-primary bg-primary/10 border border-primary/20"
                          : pct > 0
                            ? "text-muted-foreground font-medium"
                            : "text-muted-foreground/40",
                      )}
                    >
                      {pct > 0 ? `${pct.toFixed(0)}%` : "0%"}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payout note for FIIs / REITs */}
      {asset.type === "FII" || asset.type === "FII_INFRA" || asset.type === "FIAGRO" || asset.type === "REIT" ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/75 bg-muted/20 p-2 rounded-lg border border-border/30">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{t.dividendHeatmap.payoutFiiNote}</span>
        </div>
      ) : null}
    </div>
  );
}
