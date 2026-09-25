import React, { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Download,
  BellRing,
  Calendar,
  Zap,
  Search,
  Filter,
  Info,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-provider";
import {
  buildAgendaEvents,
  computeAgendaStats,
  type AgendaDividendEvent,
  type MarketRegion,
  type DividendEventType,
  type AgendaAssetClass,
  type RadarItem,
} from "@/lib/dividendRadarLogic";
import { DividendRadarEventCard } from "./DividendRadarEventCard";

interface DividendRadarAgendaDailyProps {
  radarItems: RadarItem[];
  onOpenDetail: (radarItem: RadarItem) => void;
  formatCurrency: (val: number, cur?: string) => string;
}

export function DividendRadarAgendaDaily({
  radarItems,
  onOpenDetail,
  formatCurrency,
}: DividendRadarAgendaDailyProps) {
  const { t, locale } = useI18n();
  const d = t.dividendRadar.agenda;
  const s = t.dividendRadar.seasonality;

  // Filter States
  const [selectedMarket, setSelectedMarket] = useState<MarketRegion>("BR");
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(9); // Setembro 2026
  const [selectedClass, setSelectedClass] = useState<AgendaAssetClass>("all");
  const [selectedEventType, setSelectedEventType] = useState<"all" | DividendEventType>("all");
  const [selectedFuenteFilter, setSelectedFuenteFilter] = useState<"all" | "bazin" | "safe" | "trap">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const todayRef = useRef<HTMLDivElement | null>(null);

  // Build canonical events
  const allEvents = useMemo(() => {
    return buildAgendaEvents(radarItems, locale);
  }, [radarItems, locale]);

  // Market count indicators
  const brCount = useMemo(
    () => allEvents.filter((e) => e.market === "BR").length,
    [allEvents]
  );
  const usCount = useMemo(
    () => allEvents.filter((e) => e.market === "US").length,
    [allEvents]
  );

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (event.market !== selectedMarket) return false;
      if (selectedMonth !== "ALL" && event.month !== selectedMonth) return false;
      if (selectedClass !== "all") {
        if (selectedClass === "BDR") {
          if (event.taxType !== "bdr") return false;
        } else if (selectedClass === "ETF_BR") {
          if (event.type !== "ETF" || event.market !== "BR") return false;
        } else if (selectedClass === "ETF_US") {
          if (event.type !== "ETF" || event.market !== "US") return false;
        } else if (event.type !== selectedClass) {
          return false;
        }
      }
      if (selectedEventType !== "all" && event.eventType !== selectedEventType) return false;
      if (selectedFuenteFilter === "bazin" && !event.isBelowCeiling) return false;
      if (selectedFuenteFilter === "safe" && event.safetyScore < 80) return false;
      if (selectedFuenteFilter === "trap" && !event.isTrap) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          event.ticker.toLowerCase().includes(q) ||
          event.name.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    allEvents,
    selectedMarket,
    selectedMonth,
    selectedClass,
    selectedEventType,
    selectedFuenteFilter,
    searchQuery,
  ]);

  // Summary statistics
  const stats = useMemo(() => {
    return computeAgendaStats(filteredEvents);
  }, [filteredEvents]);

  // Group events chronologically by dateKey
  const groupedEvents = useMemo(() => {
    const groups: {
      dateKey: string;
      dateFormatted: string;
      isToday: boolean;
      items: AgendaDividendEvent[];
    }[] = [];

    const map = new Map<string, AgendaDividendEvent[]>();
    for (const ev of filteredEvents) {
      if (!map.has(ev.dateKey)) {
        map.set(ev.dateKey, []);
      }
      map.get(ev.dateKey)!.push(ev);
    }

    const sortedKeys = Array.from(map.keys()).sort();
    for (const key of sortedKeys) {
      const items = map.get(key)!;
      groups.push({
        dateKey: key,
        dateFormatted: items[0].dateFormatted,
        isToday: items.some((i) => i.isToday),
        items,
      });
    }

    return groups;
  }, [filteredEvents]);

  // Handler: Scroll to Today
  const handleScrollToToday = () => {
    if (selectedMonth !== 9) {
      setSelectedMonth(9);
    }
    setTimeout(() => {
      if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        todayRef.current.classList.add("ring-2", "ring-primary", "transition-all");
        setTimeout(() => {
          todayRef.current?.classList.remove("ring-2", "ring-primary");
        }, 2000);
      }
    }, 100);
  };

  // Switch Market and reset contextual class
  const handleSwitchMarket = (mkt: MarketRegion) => {
    setSelectedMarket(mkt);
    setSelectedClass("all");
  };

  const handleExportCsv = () => {
    toast.success(d.exportToast);
  };

  const handleAlerts = () => {
    toast.success(d.alertToast);
  };

  const monthNames = s.monthNames;

  return (
    <div data-testid="dividend-radar-agenda" className="space-y-6">
      {/* Top Header & Export / Alert Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {d.eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {d.title}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            {d.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={handleExportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{d.exportBtn}</span>
          </Button>
          <Button
            size="sm"
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground"
            onClick={handleAlerts}
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>{d.alertBtn}</span>
          </Button>
        </div>
      </div>

      {/* Market Selector Bar + Quick "Go to Today" Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-muted/40 border border-border/80 rounded-xl">
        <div className="inline-flex items-center gap-1 p-1 bg-background/80 rounded-lg border border-border/60">
          <button
            type="button"
            data-testid="btn-market-br"
            onClick={() => handleSwitchMarket("BR")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedMarket === "BR"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">🇧🇷</span>
            <span>{d.marketBr}</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-muted font-mono"
            >
              {d.eventsBadge.replace("{{count}}", String(brCount))}
            </Badge>
          </button>

          <button
            type="button"
            data-testid="btn-market-us"
            onClick={() => handleSwitchMarket("US")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedMarket === "US"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">🇺🇸</span>
            <span>{d.marketUs}</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-muted font-mono"
            >
              {d.eventsBadge.replace("{{count}}", String(usCount))}
            </Badge>
          </button>
        </div>

        <button
          type="button"
          data-testid="btn-scroll-today"
          onClick={handleScrollToToday}
          className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span>{d.todayAnchor.replace("{{date}}", "25/Set")}</span>
          <Zap className="h-3 w-3" />
        </button>
      </div>

      {/* 12-Month Timeline Navigation */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
          const isCurrent = selectedMonth === m;
          const monthKey = m as keyof typeof monthNames;
          const label = monthNames[monthKey] || String(m);
          const isSept = m === 9;

          return (
            <button
              key={m}
              type="button"
              data-testid={`agenda-month-${m}`}
              onClick={() => setSelectedMonth(m)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                isCurrent
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/80 bg-card hover:border-primary/40"
              }`}
            >
              <div
                className={`text-xs font-bold tracking-tight ${
                  isCurrent ? "text-primary" : "text-foreground"
                }`}
              >
                {label}
                {isSept && (
                  <span className="ml-1 text-[9px] text-primary">⚡</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {isSept ? "Pico" : "~"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {d.stats.monitoredMonth
              .replace("{{month}}", selectedMonth === "ALL" ? "Ano" : String(monthNames[selectedMonth as keyof typeof monthNames]))
              .replace("{{market}}", selectedMarket === "BR" ? "B3" : "EUA")}
          </span>
          <div className="font-mono font-bold text-xl text-foreground">
            {stats.totalEvents}
            <span className="text-xs text-muted-foreground font-normal ml-1.5">
              {d.stats.eventsUnit}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {d.stats.monitoredSub}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {d.stats.comDates}
          </span>
          <div className="font-mono font-bold text-xl text-success">
            {stats.totalCom}
            <span className="text-xs text-muted-foreground font-normal ml-1.5">
              {d.stats.assetsUnit}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {d.stats.comDatesSub}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {d.stats.payDates}
          </span>
          <div className="font-mono font-bold text-xl text-warning">
            {stats.totalPay}
            <span className="text-xs text-muted-foreground font-normal ml-1.5">
              {d.stats.depositsUnit}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {d.stats.payDatesSub}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {d.stats.bazinZone}
          </span>
          <div className="font-mono font-bold text-xl text-success">
            {stats.totalBelowCeiling}
            <span className="text-xs text-muted-foreground font-normal ml-1.5">
              {d.stats.opportunitiesUnit}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {d.stats.bazinZoneSub}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {d.stats.highSafety}
          </span>
          <div className="font-mono font-bold text-xl text-primary">
            {stats.totalHighSafety}
            <span className="text-xs text-muted-foreground font-normal ml-1.5">
              {d.stats.safeAssetsUnit}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {d.stats.highSafetySub}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
        {/* Row 1: Contextual Asset Class Chips & Search Box */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedClass("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedClass === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              {selectedMarket === "BR" ? d.classes.allBr : d.classes.allUs}
            </button>

            {selectedMarket === "BR" ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedClass("STOCK_BR")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "STOCK_BR"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.stocksBr}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClass("FII")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "FII"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.fiis}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClass("ETF_BR")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "ETF_BR"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.etfsBr}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClass("BDR")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "BDR"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.bdrs}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedClass("STOCK_US")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "STOCK_US"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.stocksUs}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClass("REIT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "REIT"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.reits}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClass("ETF_US")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedClass === "ETF_US"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {d.classes.etfsUs}
                </button>
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              data-testid="agenda-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={d.searchPlaceholder}
              className="pl-8 text-xs h-8 bg-background/80"
            />
          </div>
        </div>

        {/* Row 2: Event Type Filters & Fuente Intelligence Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-dashed border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
              {d.eventTypeLabel}
            </span>
            <button
              type="button"
              onClick={() => setSelectedEventType("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedEventType === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.eventTypes.all}
            </button>
            <button
              type="button"
              onClick={() => setSelectedEventType("com")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedEventType === "com"
                  ? "bg-success text-success-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.eventTypes.com}
            </button>
            <button
              type="button"
              onClick={() => setSelectedEventType("pay")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedEventType === "pay"
                  ? "bg-warning text-warning-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.eventTypes.pay}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
              {d.fuenteLabel}
            </span>
            <button
              type="button"
              onClick={() => setSelectedFuenteFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedFuenteFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.fuenteFilters.all}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFuenteFilter("bazin")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedFuenteFilter === "bazin"
                  ? "bg-success/20 text-success border border-success/30 font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.fuenteFilters.bazin}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFuenteFilter("safe")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedFuenteFilter === "safe"
                  ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.fuenteFilters.safe}
            </button>
            <button
              type="button"
              onClick={() => setSelectedFuenteFilter("trap")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedFuenteFilter === "trap"
                  ? "bg-destructive/20 text-destructive border border-destructive/30 font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.fuenteFilters.trap}
            </button>
          </div>
        </div>
      </div>

      {/* Main Chronological Daily Feed */}
      {groupedEvents.length === 0 ? (
        <div
          data-testid="agenda-empty-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {d.emptyTitle}
          </h3>
          <p className="max-w-md text-xs text-muted-foreground">
            {d.emptyDesc}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs mt-2"
            onClick={() => {
              setSelectedClass("all");
              setSelectedEventType("all");
              setSelectedFuenteFilter("all");
              setSearchQuery("");
              setSelectedMonth(9);
            }}
          >
            {d.resetFilters}
          </Button>
        </div>
      ) : (
        <div data-testid="agenda-feed" className="space-y-6">
          {groupedEvents.map((group) => (
            <div
              key={group.dateKey}
              ref={group.isToday ? todayRef : null}
              id={group.isToday ? "agenda-day-today" : undefined}
              className="space-y-2.5"
            >
              {/* Day Header */}
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg border-l-4 transition-all ${
                  group.isToday
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-muted/40 border-border"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {group.isToday && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                  )}
                  <span className="font-semibold text-sm text-foreground">
                    {group.dateFormatted}
                  </span>
                  {group.isToday && (
                    <Badge className="bg-success text-success-foreground text-[10px] font-bold uppercase px-2 py-0.5">
                      {d.todayBadge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {group.items.length === 1
                    ? d.eventsScheduledSingle
                    : d.eventsScheduledPlural.replace(
                        "{{count}}",
                        String(group.items.length)
                      )}
                </span>
              </div>

              {/* Event Cards inside this day */}
              <div className="space-y-2">
                {group.items.map((event) => (
                  <DividendRadarEventCard
                    key={event.id}
                    event={event}
                    onOpenDetail={onOpenDetail}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regulatory & Methodology Disclaimer */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>{d.disclaimer}</div>
      </div>
    </div>
  );
}
