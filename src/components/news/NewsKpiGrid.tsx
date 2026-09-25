import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/i18n";
import type { NewsKpis } from "@/lib/news/newsFeedLogic";
import type { Currency } from "@/lib/domain";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface NewsKpiGridProps {
  kpis: NewsKpis;
  currency: Currency;
}

export function NewsKpiGrid({ kpis, currency }: NewsKpiGridProps) {
  const { t, locale } = useI18n();

  const formattedDividends = formatCurrency(
    kpis.announcedDividendsTotal,
    currency,
    locale,
  );

  const formattedWeeklyDelta =
    kpis.weeklyNetWorthDeltaPercent !== null
      ? `${kpis.weeklyNetWorthDeltaPercent > 0 ? "+" : ""}${kpis.weeklyNetWorthDeltaPercent.toFixed(1).replace(".", ",")}%`
      : "—";

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* 1. Precisam de atenção */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.newsScreen.kpis.attentionRequired}
        </div>
        <div
          className={`font-serif text-2xl md:text-3xl font-medium mt-1 ${
            kpis.attentionCount > 0 ? "text-danger" : "text-foreground"
          }`}
        >
          {kpis.attentionCount}
        </div>
        <div
          className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
            kpis.attentionCount > 0 ? "text-danger" : "text-muted-foreground"
          }`}
        >
          {kpis.attentionCount > 0 && <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>{t.newsScreen.kpis.attentionSub}</span>
        </div>
      </div>

      {/* 2. Entraram na zona */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.newsScreen.kpis.enteredBuyZone}
        </div>
        <div
          className={`font-serif text-2xl md:text-3xl font-medium mt-1 ${
            kpis.buyZoneCount > 0 ? "text-success" : "text-foreground"
          }`}
        >
          {kpis.buyZoneCount}
        </div>
        <div
          className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
            kpis.buyZoneCount > 0 ? "text-success" : "text-muted-foreground"
          }`}
        >
          {kpis.buyZoneCount > 0 && <ArrowUpRight className="h-3.5 w-3.5" />}
          <span>{t.newsScreen.kpis.enteredBuyZoneSub}</span>
        </div>
      </div>

      {/* 3. Proventos anunciados */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.newsScreen.kpis.announcedDividends}
        </div>
        <div className="font-serif text-2xl md:text-3xl font-medium mt-1 text-foreground">
          {formattedDividends}
        </div>
        <div className="text-xs font-semibold mt-1 text-success flex items-center gap-1">
          {kpis.announcedDividendsCount > 0 && <ArrowUpRight className="h-3.5 w-3.5" />}
          <span>
            {kpis.announcedDividendsCount === 1
              ? t.newsScreen.kpis.announcedCountSingle
              : t.newsScreen.kpis.announcedCount.replace(
                  "{{count}}",
                  String(kpis.announcedDividendsCount),
                )}
          </span>
        </div>
      </div>

      {/* 4. Patrimônio */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.newsScreen.kpis.netWorthChange}
        </div>
        <div className="font-serif text-2xl md:text-3xl font-medium mt-1 text-foreground">
          {formattedWeeklyDelta}
        </div>
        <div
          className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
            kpis.weeklyNetWorthDirection === "up"
              ? "text-success"
              : kpis.weeklyNetWorthDirection === "down"
              ? "text-danger"
              : "text-muted-foreground"
          }`}
        >
          {kpis.weeklyNetWorthDirection === "up" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : kpis.weeklyNetWorthDirection === "down" ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
          <span>{t.newsScreen.kpis.inTheWeek}</span>
        </div>
      </div>
    </div>
  );
}
