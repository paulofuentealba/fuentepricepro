import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-provider";
import { useUserSettings } from "@/lib/useUserSettings";
import { formatCurrency } from "@/lib/formatters";
import { dividendRadarQueryOptions } from "@/lib/queryOptions";
import {
  buildRadarItems,
  type RadarItem,
} from "@/lib/dividendRadarLogic";
import { DividendRadarAgendaDaily } from "./DividendRadarAgendaDaily";
import { DividendRadarDetailSheet } from "./DividendRadarDetailSheet";

export function DividendRadarView() {
  const { t, locale } = useI18n();
  const d = t.dividendRadar;
  const { settings } = useUserSettings();
  const navigate = useNavigate();

  const radarQuery = useQuery(dividendRadarQueryOptions());

  // Detail Sheet State
  const [activeDetailItem, setActiveDetailItem] = useState<RadarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Currency Formatter Helper
  const formatCurr = (val: number, cur: string = "BRL") =>
    formatCurrency(val, cur as any, locale);

  // Derived Items
  const items = useMemo(() => {
    return buildRadarItems(
      radarQuery.data,
      settings?.taxJurisdiction,
      locale,
      settings?.classTargetYields,
    );
  }, [radarQuery.data, settings?.taxJurisdiction, locale, settings?.classTargetYields]);

  // Actions
  const handleInvest = (item: RadarItem) => {
    toast.success(d.investToast.replace("{{ticker}}", item.ticker));
    navigate({
      to: "/app/contributionplan",
    });
  };

  const handleOpenDetail = (item: RadarItem) => {
    setActiveDetailItem(item);
    setIsDetailOpen(true);
  };

  return (
    <div data-testid="dividend-radar-view" className="space-y-6">
      {/* Primary Unified Experience: Agenda Diária & Radar Data Com */}
      <DividendRadarAgendaDaily
        radarItems={items}
        agendaEvents={radarQuery.data?.agendaEvents}
        classTargetYields={settings?.classTargetYields}
        onOpenDetail={handleOpenDetail}
        formatCurrency={formatCurr}
      />

      {/* Deep Dive Raio-X Side Drawer Sheet */}
      <DividendRadarDetailSheet
        item={activeDetailItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onInvest={handleInvest}
        formatCurrency={formatCurr}
      />
    </div>
  );
}

