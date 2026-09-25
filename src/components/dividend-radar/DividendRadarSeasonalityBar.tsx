import React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import type { RadarItem } from "@/lib/dividendRadarLogic";

interface DividendRadarSeasonalityBarProps {
  selectedMonth: number | "ALL";
  onSelectMonth: (month: number | "ALL") => void;
  items: RadarItem[];
}

export function DividendRadarSeasonalityBar({
  selectedMonth,
  onSelectMonth,
  items,
}: DividendRadarSeasonalityBarProps) {
  const { t } = useI18n();
  const d = t.dividendRadar;

  // Month map 1..12
  const monthKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

  const getMonthCount = (m: number | "ALL") => {
    if (m === "ALL") return items.length;
    return items.filter((item) => item.months.includes(m)).length;
  };

  const currentMonthName =
    selectedMonth === "ALL"
      ? d.seasonality.allMonths
      : d.seasonality.monthNames[selectedMonth as keyof typeof d.seasonality.monthNames] ||
        `Mês ${selectedMonth}`;

  const currentCount = getMonthCount(selectedMonth);

  const statusText =
    selectedMonth === "ALL"
      ? d.seasonality.statusAll.replace("{{count}}", String(currentCount))
      : d.seasonality.statusMonth
          .replace("{{month}}", currentMonthName)
          .replace("{{count}}", String(currentCount));

  return (
    <div
      data-testid="seasonality-bar"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
          <Calendar className="h-3.5 w-3.5" />
          <span>{d.seasonality.title}</span>
        </div>
        <div className="font-medium text-primary text-xs">
          {statusText}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
        {/* ALL tab */}
        <button
          type="button"
          onClick={() => onSelectMonth("ALL")}
          className={cn(
            "flex flex-col items-center justify-center shrink-0 min-w-[70px] rounded-xl border px-3 py-2 text-center transition-all cursor-pointer",
            selectedMonth === "ALL"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 font-semibold"
              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span className="text-xs font-bold tracking-tight">
            {d.seasonality.allMonths}
          </span>
          <span className="text-[10px] font-mono mt-0.5 opacity-80">
            {d.seasonality.assetsCount.replace("{{count}}", String(items.length))}
          </span>
        </button>

        {/* JAN..DEZ tabs */}
        {monthKeys.map((m) => {
          const name = d.seasonality.monthNames[m];
          const count = getMonthCount(m);
          const isSelected = selectedMonth === m;
          const isPeak = m === 5 || m === 11; // Historical peaks in B3

          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={cn(
                "flex flex-col items-center justify-center shrink-0 min-w-[62px] sm:min-w-[68px] rounded-xl border px-2.5 py-2 text-center transition-all cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 font-semibold"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-0.5 text-xs font-bold tracking-tight">
                <span>{name}</span>
                {isPeak && (
                  <span className="text-[10px] text-warning font-normal">
                    ★
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono mt-0.5 opacity-80">
                {d.seasonality.assetsCount.replace("{{count}}", String(count))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
