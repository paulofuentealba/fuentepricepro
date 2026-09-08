import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { assetQueryOptions, quoteQueryOptions } from "@/lib/queryOptions";
import { formatCurrency, formatNumber, formatPercent, formatDate } from "@/lib/formatters";
import { convertCurrency } from "@/lib/currency";
import { useMarketScope } from "@/lib/useMarketScope";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ValuationConsensusMatrix } from "@/components/shared/ValuationConsensusMatrix";
import { DividendSafetyBadge } from "@/components/shared/DividendSafetyBadge";
import { DividendSafetyRadar } from "@/components/shared/DividendSafetyRadar";
import type { AssetSafetyInput } from "@/lib/dividendSafety";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/lib/apiService.functions";
import type { AssetType } from "@/lib/domain";
import {
  REPRESENTATIVE_ASSETS,
  REPRESENTATIVE_KEYS,
  REPRESENTATIVE_KEYS_US,
  REPRESENTATIVE_KEYS_BR,
  getDynamicClassMetrics,
  getDynamicTaxPassport,
  type RepresentativeAssetData,
} from "./detailAssetsData";

interface AssetDeepDiveViewProps {
  initialTicker?: string;
  onSelectTicker?: (ticker: string) => void;
  mode?: "page" | "modal";
  onCloseModal?: () => void;
  hideSelector?: boolean;
  hideSearch?: boolean;
}

export function AssetDeepDiveView({
  initialTicker = "BBAS3",
  onSelectTicker,
  mode = "page",
  onCloseModal,
  hideSelector,
  hideSearch,
}: AssetDeepDiveViewProps) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { valuedItems, fx, totals } = useValuedPortfolio();
  const { settings, updateSettings } = useUserSettings();
  const { isUS, currency: userCurrency } = useMarketScope();
  const defaultTicker = initialTicker === "BBAS3" && isUS ? "KO" : initialTicker;

  const showSelector = hideSelector !== undefined ? !hideSelector : mode !== "modal";
  const showSearch = hideSearch !== undefined ? !hideSearch : mode !== "modal";

  const [currentTicker, setCurrentTicker] = useState<string>(defaultTicker.toUpperCase());

  // Keep internal state synced if initialTicker changes from parent (e.g. modal prop)
  useEffect(() => {
    if (initialTicker) {
      const eff = initialTicker === "BBAS3" && isUS ? "KO" : initialTicker;
      setCurrentTicker(eff.toUpperCase());
    }
  }, [initialTicker, isUS]);

  const activeRepresentativeKeys = isUS ? REPRESENTATIVE_KEYS_US : REPRESENTATIVE_KEYS_BR;

  // Representative data if known
  const repData: RepresentativeAssetData | undefined = REPRESENTATIVE_ASSETS[currentTicker];

  // Queries for live market data & full asset metadata
  const assetQuery = useQuery({
    ...assetQueryOptions(currentTicker),
    enabled: !!currentTicker,
  });

  const quoteQuery = useQuery({
    ...quoteQueryOptions(currentTicker),
    enabled: !!currentTicker && assetQuery.data?.type !== "FIXED_INCOME",
  });

  const asset = assetQuery.data;
  const quote = quoteQuery.data;

  // Active pricing and currency
  const currency = asset?.currency ?? repData?.currency ?? "BRL";
  const livePrice = quote?.price ?? asset?.currentPrice ?? repData?.price ?? 0;

  // Portfolio match
  const portfolioHolding = useMemo(() => {
    return valuedItems.find((i) => i.ticker.toUpperCase() === currentTicker);
  }, [valuedItems, currentTicker]);

  // Sensitivity Sliders State
  const defaultBazinYield = useMemo(() => {
    const assetType = asset?.type ?? repData?.classType ?? "STOCK_BR";
    if (currency === "USD" || assetType === "STOCK_US" || assetType === "REIT") {
      return settings?.classTargetYields?.[assetType] ?? repData?.bazinYieldTarget ?? 3.5;
    }
    return settings?.classTargetYields?.[assetType] ?? repData?.bazinYieldTarget ?? 6.0;
  }, [asset?.type, repData, settings, currency]);

  const defaultKDiscount = useMemo(() => {
    if (repData?.kDiscount) return repData.kDiscount;
    if (currency === "USD" || asset?.type === "STOCK_US" || asset?.type === "REIT") {
      return 8.5;
    }
    return 11.0;
  }, [repData?.kDiscount, currency, asset?.type]);

  const [bazinYield, setBazinYield] = useState<number>(defaultBazinYield);
  const [kDiscount, setKDiscount] = useState<number>(defaultKDiscount);
  const [gGrowth, setGGrowth] = useState<number>(repData?.gGrowth ?? 5.0);

  // Reset sliders when ticker changes
  useEffect(() => {
    const assetType = asset?.type ?? repData?.classType ?? "STOCK_BR";
    const isUs = currency === "USD" || assetType === "STOCK_US" || assetType === "REIT";
    const initialYield = settings?.classTargetYields?.[assetType] ?? repData?.bazinYieldTarget ?? (isUs ? 3.5 : 6.0);
    setBazinYield(initialYield);
    setKDiscount(repData?.kDiscount ?? (isUs ? 8.5 : 11.0));
    setGGrowth(repData?.gGrowth ?? 5.0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTicker, currency]);

  // Handle ticker selection
  function handleSelectTicker(ticker: string) {
    const upper = ticker.toUpperCase();
    setCurrentTicker(upper);
    if (onSelectTicker) {
      onSelectTicker(upper);
    }
  }

  function handleSearchPick(hit: SearchHit) {
    handleSelectTicker(hit.ticker);
  }

  // Base annual dividend estimate for valuation
  const annualDividend = useMemo(() => {
    if (repData) return repData.bazinDiv;
    if (asset?.dividends3y && asset.dividends3y.length > 0) {
      const sum = asset.dividends3y.reduce((acc, v) => acc + v, 0);
      return sum / asset.dividends3y.length;
    }
    return livePrice * (currency === "USD" ? 0.035 : 0.06);
  }, [repData, asset, livePrice, currency]);

  // Portfolio Custody calculations (Mixed-currency consolidated)
  const totalPortfolioValue = useMemo(() => {
    if (totals?.consolidatedNetWorth && totals.consolidatedNetWorth > 0) {
      return totals.consolidatedNetWorth;
    }
    return valuedItems.reduce((acc, it) => {
      const p = it.livePrice || it.currentPrice || 0;
      const q = it.quantity || 0;
      const val = p * q;
      return acc + (it.currency === "USD" ? val * (fx?.USDBRL ?? 5.5) : val);
    }, 0);
  }, [totals?.consolidatedNetWorth, valuedItems, fx?.USDBRL]);

  const custodyQuantity = portfolioHolding ? portfolioHolding.quantity : (repData?.defaultQty ?? 0);
  const custodyAveragePrice =
    portfolioHolding?.averagePrice != null
      ? portfolioHolding.averagePrice
      : (repData?.defaultPm ?? livePrice);
  const custodyTotalValue = custodyQuantity * livePrice;
  const custodyCostBasis = custodyQuantity * custodyAveragePrice;
  const custodyCapitalGain = custodyTotalValue - custodyCostBasis;
  const custodyCapitalGainPct =
    custodyCostBasis > 0 ? (custodyCapitalGain / custodyCostBasis) * 100 : 0;
  const custodyValueBRL = currency === "USD" ? custodyTotalValue * (fx?.USDBRL ?? 5.5) : custodyTotalValue;
  const custodyWeightPct =
    totalPortfolioValue > 0 && portfolioHolding
      ? (custodyValueBRL / totalPortfolioValue) * 100
      : null;
  const custodyYoC =
    portfolioHolding && portfolioHolding.averagePrice && portfolioHolding.averagePrice > 0
      ? ((portfolioHolding.annualDividend ?? annualDividend) / portfolioHolding.averagePrice) * 100
      : null;
  const custodyDividends = repData?.defaultQty
    ? repData.bazinDiv * repData.defaultQty
    : annualDividend * custodyQuantity;

  // EPS and BVPS
  const eps = asset?.metrics?.eps ?? (repData?.ticker === "BBAS3" ? 6.7 : null);
  const bvps = asset?.metrics?.bvps ?? (repData?.ticker === "BBAS3" ? 33.5 : null);

  // ==================== 4 VALUATION MODELS ====================
  // 1. Bazin: Div / (yield / 100)
  const tetoBazin = useMemo(() => {
    if (bazinYield <= 0) return null;
    return annualDividend / (bazinYield / 100);
  }, [annualDividend, bazinYield]);

  // 2. Graham: √(22.5 × LPA × VPA)
  const tetoGraham = useMemo(() => {
    const isUs = currency === "USD" || asset?.type === "STOCK_US" || asset?.type === "REIT";
    if (isUs) {
      if (eps != null && bvps != null && eps > 0 && bvps > 0) {
        return Math.sqrt(22.5 * eps * bvps);
      }
      return null;
    }
    if (eps != null && bvps != null && eps > 0 && bvps > 0) {
      return Math.sqrt(22.5 * eps * bvps);
    }
    if (repData && repData.currency !== "USD") {
      return repData.teto * 1.05;
    }
    return null;
  }, [eps, bvps, repData, currency, asset?.type]);

  // 3. Gordon: D1 / (k - g)
  const tetoGordon = useMemo(() => {
    const k = kDiscount / 100;
    const g = gGrowth / 100;
    const denominator = Math.max(0.005, k - g);
    const d1 = annualDividend * (1 + g);
    return d1 / denominator;
  }, [annualDividend, kDiscount, gGrowth]);

  // 4. Lynch: LPA × g (PEG logic)
  const tetoLynch = useMemo(() => {
    if (eps != null && eps > 0) {
      return eps * gGrowth;
    }
    if (repData) {
      return repData.teto * 0.96;
    }
    return null;
  }, [eps, gGrowth, repData]);

  // Multi-method Weighted Consensus
  const { tetoConsensus, marginConsensus, approvalsCount, minFloor, maxCeiling } = useMemo(() => {
    const validModels: { key: string; val: number; baseWeight: number }[] = [];
    if (tetoBazin != null && Number.isFinite(tetoBazin) && tetoBazin > 0) {
      validModels.push({ key: "bazin", val: tetoBazin, baseWeight: 0.35 });
    }
    if (tetoGraham != null && Number.isFinite(tetoGraham) && tetoGraham > 0) {
      validModels.push({ key: "graham", val: tetoGraham, baseWeight: 0.25 });
    }
    if (tetoGordon != null && Number.isFinite(tetoGordon) && tetoGordon > 0) {
      validModels.push({ key: "gordon", val: tetoGordon, baseWeight: 0.25 });
    }
    if (tetoLynch != null && Number.isFinite(tetoLynch) && tetoLynch > 0) {
      validModels.push({ key: "lynch", val: tetoLynch, baseWeight: 0.15 });
    }

    if (validModels.length === 0) {
      return {
        tetoConsensus: livePrice,
        marginConsensus: 0,
        approvalsCount: 0,
        minFloor: livePrice,
        maxCeiling: livePrice,
      };
    }

    const totalWeight = validModels.reduce((acc, m) => acc + m.baseWeight, 0);
    const weightedSum = validModels.reduce((acc, m) => acc + m.val * (m.baseWeight / totalWeight), 0);

    const margin = livePrice > 0 ? ((weightedSum - livePrice) / livePrice) * 100 : 0;
    const approvals = validModels.filter((m) => m.val >= livePrice).length;

    const values = validModels.map((m) => m.val).sort((a, b) => a - b);

    return {
      tetoConsensus: weightedSum,
      marginConsensus: margin,
      approvalsCount: approvals,
      minFloor: values[0],
      maxCeiling: values[values.length - 1],
    };
  }, [tetoBazin, tetoGraham, tetoGordon, tetoLynch, livePrice]);

  // Action verdict badge
  const actionVerdict = useMemo(() => {
    const verdictType = repData?.actionType ?? (
      marginConsensus >= 15
        ? ("strong" as const)
        : marginConsensus >= 0
          ? ("ok" as const)
          : marginConsensus >= -10
            ? ("hold" as const)
            : ("danger" as const)
    );
    const label =
      verdictType === "strong"
        ? (t.dashboard?.matrix?.actionBuy || "APORTE FORTE")
        : verdictType === "ok"
          ? (t.dashboard?.matrix?.actionOk || "APORTE OK")
          : verdictType === "hold"
            ? (t.dashboard?.matrix?.actionWatch || "AGUARDAR")
            : (t.dashboard?.matrix?.actionAvoid || "QUARENTENA");
    return { label, type: verdictType };
  }, [repData, marginConsensus, t]);

  // Class fundamentals metrics
  const classMetrics = useMemo(() => {
    if (repData && locale === "ptBR") {
      return {
        badge: repData.metricsBadge,
        title: repData.metricsTitle,
        items: repData.metrics,
      };
    }
    const assetType = asset?.type ?? (repData?.classType as AssetType) ?? "STOCK_BR";
    return getDynamicClassMetrics(assetType, asset?.metrics, currency, locale, t);
  }, [repData, locale, asset, currency, t]);

  // Tax passport
  const taxPassportHtml = useMemo(() => {
    if (repData && !isUS && locale === "ptBR") return repData.taxPassportHtml;
    const assetType = asset?.type ?? (repData?.classType as AssetType) ?? "STOCK_BR";
    return getDynamicTaxPassport(assetType, currency, isUS ? "US" : "BR", t);
  }, [repData, isUS, locale, asset, currency, t]);

  // Snowball calculations
  const snowballInfo = useMemo(() => {
    const dividendPerShare = annualDividend / (asset?.paymentMonths?.length || 4 || 1);
    const req = dividendPerShare > 0 ? Math.ceil(livePrice / dividendPerShare) : (repData?.snowballReqQty ?? 100);
    if (repData && locale === "ptBR") {
      return {
        reqQty: repData.snowballReqQty,
        text: repData.snowballText,
      };
    }
    return {
      reqQty: req,
      text: t.deepDive?.snowballText?.replace("{{qty}}", String(req)) ||
        (locale === "en"
          ? `Every cycle, ${req} shares generate enough dividends to automatically purchase 1 new share.`
          : locale === "es"
            ? `En cada ciclo, ${req} cuotas generan dividendos suficientes para adquirir 1 nueva cuota automáticamente.`
            : `A cada ciclo, ${req} cotas geram proventos suficientes para adquirir 1 nova cota automaticamente.`),
    };
  }, [repData, locale, annualDividend, asset, livePrice, t]);

  // Save consensus / target yield to user settings
  async function handleApplyConsensus(assumptions?: { bazinYield: number; kDiscount: number; gGrowth: number }) {
    try {
      const targetYield = assumptions?.bazinYield ?? bazinYield;
      const assetType = asset?.type ?? repData?.classType ?? "STOCK_BR";
      const updatedClassYields = {
        ...(settings?.classTargetYields ?? {}),
        [assetType]: targetYield,
      };
      await updateSettings({ classTargetYields: updatedClassYields });
      toast.success(
        t.deepDive?.appliedSuccess?.replace("{{ticker}}", currentTicker) ||
          `Ativo ${currentTicker} sincronizado com o Consenso Fuente!`,
      );
    } catch {
      toast.error(t.errors?.saveProfileFailed || "Falha ao salvar preferências.");
    }
  }

  // Localized sector description
  const sectorText = useMemo(() => {
    if (asset?.sector) return asset.sector;
    if (!repData?.sector) {
      return locale === "en"
        ? "Income & Value Segment"
        : locale === "es"
          ? "Segmento de Renta & Valor"
          : "Segmento de Renda & Valor";
    }
    if (locale === "ptBR") return repData.sector;
    if (currentTicker === "O") {
      return locale === "en"
        ? "Real Estate • Triple-Net Retail & Commercial"
        : locale === "es"
          ? "Bienes Raíces • Comercial & Minorista Triple-Net"
          : repData.sector;
    }
    if (currentTicker === "KO") {
      return locale === "en"
        ? "Consumer Staples • Beverages & Global Brands"
        : locale === "es"
          ? "Bienes de Consumo • Bebidas & Marcas Globales"
          : repData.sector;
    }
    if (currentTicker === "SCHD") {
      return locale === "en"
        ? "US Equity ETFs • Dividend Yield & Value Equities"
        : locale === "es"
          ? "ETFs de Renta Variable EE.UU. • Dividendos & Valor"
          : repData.sector;
    }
    if (currentTicker === "SPYI") {
      return locale === "en"
        ? "US ETFs • Covered Call & Equity Income"
        : locale === "es"
          ? "ETFs EE.UU. • Covered Call & Renta Variable"
          : repData.sector;
    }
    if (currentTicker === "BTCI") {
      return locale === "en"
        ? "Crypto Yield • Bitcoin Covered Call Strategy"
        : locale === "es"
          ? "Cripto Renta • Estrategia Covered Call Bitcoin"
          : repData.sector;
    }
    if (currentTicker === "BBAS3") {
      return locale === "en"
        ? "Financial Sector • Multiple Banking"
        : locale === "es"
          ? "Sector Financiero • Bancos Múltiples"
          : repData.sector;
    }
    if (currentTicker === "TAEE11") {
      return locale === "en"
        ? "Electric Utilities • Power Transmission"
        : locale === "es"
          ? "Sector Eléctrico • Transmisión de Energía"
          : repData.sector;
    }
    if (currentTicker === "VALE3") {
      return locale === "en"
        ? "Basic Materials • Global Mining"
        : locale === "es"
          ? "Materiales Básicos • Minería Global"
          : repData.sector;
    }
    if (currentTicker === "HGLG11") {
      return locale === "en"
        ? "Real Estate Funds • Logistics & Warehouses"
        : locale === "es"
          ? "Fondos Inmobiliarios • Logística & Galpones"
          : repData.sector;
    }
    if (currentTicker === "MXRF11") {
      return locale === "en"
        ? "Real Estate Funds • Receivables & Mortgage (CRI)"
        : locale === "es"
          ? "Fondos Inmobiliarios • Papel & Crédito Hipotecario (CRI)"
          : repData.sector;
    }
    if (currentTicker === "BODB11") {
      return locale === "en"
        ? "Fixed Income • Infrastructure Debentures (Tax-Exempt)"
        : locale === "es"
          ? "Renta Fija • Obligaciones de Infraestructura (Exento)"
          : repData.sector;
    }
    return repData.sector;
  }, [asset?.sector, repData?.sector, currentTicker, locale]);

  // Localized payment frequency
  const paymentFrequencyText = useMemo(() => {
    if (repData && locale === "ptBR") return repData.payFreq;
    if (currentTicker === "O") {
      return locale === "en"
        ? "Monthly (The Monthly Dividend Co.)"
        : locale === "es"
          ? "Mensual (The Monthly Dividend Co.)"
          : "Mensal (The Monthly Dividend Co.)";
    }
    if (repData?.payFreq?.toLowerCase().startsWith("mensal")) {
      return locale === "en" ? "Monthly" : locale === "es" ? "Mensual" : repData.payFreq;
    }
    if (repData?.payFreq?.toLowerCase().startsWith("trimestral")) {
      return locale === "en" ? "Quarterly" : locale === "es" ? "Trimestral" : repData.payFreq;
    }
    if (repData?.payFreq?.toLowerCase().startsWith("semestral")) {
      return locale === "en" ? "Semiannual" : locale === "es" ? "Semestral" : repData.payFreq;
    }
    if (repData?.payFreq?.toLowerCase().includes("8x")) {
      return locale === "en" ? "8x per year" : locale === "es" ? "8x al año" : repData.payFreq;
    }
    return locale === "en" ? "Quarterly" : locale === "es" ? "Trimestral" : "Trimestral";
  }, [repData, currentTicker, locale]);

  // Localized date strings for COM and Payment
  const nextComDateText = useMemo(() => {
    if (asset?.exDividendDate) {
      return formatDate(asset.exDividendDate, locale) || "—";
    }
    if (repData?.nextCom) {
      if (locale === "ptBR") return repData.nextCom;
      return repData.nextCom
        .replace(/SET/g, "SEP")
        .replace(/OUT/g, "OCT")
        .replace(/DEZ/g, locale === "en" ? "DEC" : "DIC")
        .replace(/FEV/g, "FEB")
        .replace(/ABR/g, locale === "en" ? "APR" : "ABR")
        .replace(/MAI/g, locale === "en" ? "MAY" : "MAY")
        .replace(/AGO/g, locale === "en" ? "AUG" : "AGO");
    }
    return "—";
  }, [asset?.exDividendDate, repData?.nextCom, locale]);

  const nextPaymentDateText = useMemo(() => {
    if (repData?.nextPay) {
      if (locale === "ptBR") return repData.nextPay;
      return repData.nextPay
        .replace(/SET/g, "SEP")
        .replace(/OUT/g, "OCT")
        .replace(/DEZ/g, locale === "en" ? "DEC" : "DIC")
        .replace(/FEV/g, "FEB")
        .replace(/ABR/g, locale === "en" ? "APR" : "ABR")
        .replace(/MAI/g, locale === "en" ? "MAY" : "MAY")
        .replace(/AGO/g, locale === "en" ? "AUG" : "AGO");
    }
    return "—";
  }, [repData?.nextPay, locale]);

  const nextValFormatted = useMemo(() => {
    const shareUnit =
      currency === "USD"
        ? locale === "en"
          ? "share"
          : locale === "es"
            ? "acción"
            : "ação"
        : locale === "en"
          ? "share"
          : locale === "es"
            ? "cuota"
            : "cota";

    if (repData && locale === "ptBR") return repData.nextVal;
    if (repData?.nextVal) {
      return currency === "USD" ? repData.nextVal.replace(",", ".") : repData.nextVal;
    }
    if (annualDividend > 0) {
      return `${currency === "USD" ? "US$ " : "R$ "}${(annualDividend / 4).toFixed(2)} / ${shareUnit}`;
    }
    return `${currency === "USD" ? "US$ —" : "R$ —"} / ${shareUnit}`;
  }, [repData, locale, currency, annualDividend]);

  // Dividend Safety Score Input
  const safetyInput: AssetSafetyInput = useMemo(() => {
    const assetType = asset?.type ?? (repData?.classType as AssetType) ?? "STOCK_BR";
    const isReit = assetType === "REIT" || currentTicker === "O";
    return {
      type: assetType,
      currency,
      locale,
      payoutRatio:
        (asset as any)?.payoutRatio ??
        (currentTicker === "O" ? 0.74 : asset?.metrics?.payoutRatio != null ? asset.metrics.payoutRatio : 0.55),
      netDebtToEbitda:
        (asset as any)?.netDebtToEbitda ??
        (currentTicker === "O" ? 5.4 : 1.4),
      roe:
        (asset as any)?.roe ??
        (currentTicker === "O" ? 0.08 : asset?.metrics?.roe != null ? asset.metrics.roe : 0.18),
      yearsPayingDividends: currentTicker === "O" ? 30 : currentTicker === "KO" ? 62 : 10,
      vacancyRate: (asset as any)?.vacancyRate ?? asset?.metrics?.vacancy ?? (isReit ? 0.014 : undefined),
      pvp: (asset as any)?.pvp ?? asset?.metrics?.pbRatio ?? (isReit ? 1.05 : undefined),
    };
  }, [asset, repData, currentTicker, currency, locale]);

  return (
    <div className="space-y-6">
      {/* REPRESENTATIVE CLASS SELECTOR BAR (App Style) */}
      {showSelector && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isUS
                ? t.deepDive?.categoriesTitleUs || "Select a representative US dividend asset class:"
                : t.deepDive?.categoriesTitle || "Selecione 1 ativo representativo de cada uma das 8 categorias:"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {isUS
                ? t.deepDive?.categoriesCountUs || "5 US classes mapped"
                : t.deepDive?.categoriesCount || "8 classes mapeadas"}
            </span>
          </div>
          <div
            className={cn(
              "grid gap-2.5",
              isUS
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8",
            )}
          >
            {activeRepresentativeKeys.map((key) => {
              const item = REPRESENTATIVE_ASSETS[key];
              if (!item) return null;
              const isSelected = item.ticker === currentTicker;
              const isPositive = item.margin >= 0;
              return (
                <button
                  type="button"
                  key={item.ticker}
                  onClick={() => handleSelectTicker(item.ticker)}
                  className={cn(
                    "rounded-xl p-3 text-left transition-all border shadow-xs cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary shadow-sm"
                      : "border-border/70 bg-card hover:bg-muted/40 hover:border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <strong className={cn("text-sm font-bold", isSelected ? "text-primary" : "text-foreground")}>
                      {item.ticker}
                    </strong>
                    <span
                      className={cn(
                        "text-[11px] font-bold font-display",
                        isPositive ? "text-success" : "text-destructive",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {item.margin}%
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                    {item.classLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TICKER SEARCH BAR & HOLDINGS CHIPS */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-xl">
            <TickerSearchField
              placeholder={
                isUS
                  ? (t.deepDive?.searchPlaceholderUs || (locale === "en" ? "Search any US ticker or asset (e.g. O, AAPL, SCHD, KO, MSFT)..." : "Buscar qualquer ticker ou ativo dos EUA..."))
                  : (t.deepDive?.searchPlaceholder || "Buscar qualquer ticker ou ativo da B3 / EUA (ex: PETR4, TAEE11, AAPL, MXRF11)...")
              }
              onPick={handleSearchPick}
            />
          </div>

          {/* User holdings quick chips (if available) */}
          {valuedItems.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">
                {t.deepDive?.inYourPortfolio || (locale === "en" ? "In your portfolio:" : locale === "es" ? "En su cartera:" : "Na sua carteira:")}
              </span>
              {valuedItems.slice(0, 5).map((holding) => (
                <button
                  key={holding.ticker}
                  type="button"
                  onClick={() => handleSelectTicker(holding.ticker)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold font-display border transition-colors cursor-pointer",
                    holding.ticker.toUpperCase() === currentTicker
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80",
                  )}
                >
                  {holding.ticker}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ASSET HERO CARD (App Look & Feel) */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                {(() => {
                  const assetType = asset?.type ?? (repData?.classType as AssetType) ?? "STOCK_BR";
                  return t.types?.[assetType] ?? (locale === "ptBR" ? repData?.classLabel : undefined) ?? assetType;
                })()}
              </span>
              {currency === "USD" && (
                <span className="inline-flex items-center rounded-full bg-accent-gold/15 text-accent-gold px-2 py-0.5 text-[11px] font-semibold">
                  USD • US Market
                </span>
              )}
              {portfolioHolding ? (
                <span className="text-xs text-muted-foreground">
                  {t.deepDive?.custodyAt || "Custodiado em:"}{" "}
                  <strong className="text-foreground font-medium">
                    {portfolioHolding.broker || (currency === "USD" ? "Avenue / Schwab" : (locale === "en" ? "Broker" : "Corretora"))}
                  </strong>
                </span>
              ) : repData?.broker ? (
                <span className="text-xs text-muted-foreground">
                  {t.deepDive?.refBroker || "Corretora ref.:"}{" "}
                  <strong className="text-foreground font-medium">
                    {repData.broker}
                  </strong>
                </span>
              ) : null}
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              {currentTicker}{" "}
              <span className="text-muted-foreground font-sans font-normal text-base sm:text-xl">
                • {asset?.name || repData?.name || currentTicker}
              </span>
            </h2>
            <div className="text-sm text-muted-foreground mt-0.5">
              {sectorText}
            </div>
          </div>

          {/* KPIS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-3 lg:pt-0 lg:border-l lg:border-border/70 lg:pl-8 shrink-0">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.deepDive?.currentPrice || "Cotação Atual"}
              </div>
              <div className="font-serif text-xl sm:text-2xl font-bold text-foreground font-display">
                {formatCurrency(livePrice, currency, locale)}
              </div>
            </div>

            <div className="border-l border-border/40 pl-4 sm:border-0 sm:pl-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.deepDive?.fuenteCeiling || "Preço Teto Fuente"}
              </div>
              <div className="font-serif text-xl sm:text-2xl font-bold text-accent-text font-display">
                {formatCurrency(tetoConsensus, currency, locale)}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.deepDive?.safetyMargin || "Margem de Segurança"}
              </div>
              <div
                className={cn(
                  "text-xl sm:text-2xl font-bold font-display",
                  marginConsensus >= 0 ? "text-success" : "text-danger",
                )}
              >
                {marginConsensus >= 0 ? "+" : ""}
                {Number.isFinite(marginConsensus) ? marginConsensus.toFixed(1) : "0.0"}%
              </div>
            </div>

            <div className="border-l border-border/40 pl-4 sm:border-0 sm:pl-0 flex items-center">
              <StatusBadge
                variant={
                  actionVerdict.type === "strong" || actionVerdict.type === "ok"
                    ? "success"
                    : actionVerdict.type === "hold"
                      ? "warning"
                      : "danger"
                }
                className="px-3.5 sm:px-4 py-1.5 text-xs font-bold w-full justify-center"
              >
                {actionVerdict.label}
              </StatusBadge>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COL: MINHA POSIÇÃO & INTELIGÊNCIA DE PROVENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD: MINHA POSIÇÃO EM CARTEIRA */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.custodyBadge || "CUSTÓDIA PESSOAL"}
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {t.deepDive?.custodyTitle || "Minha Posição em Carteira"}
                </h3>
              </div>
              {portfolioHolding ? (
                <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                  {custodyWeightPct != null && Number.isFinite(custodyWeightPct)
                    ? `${custodyWeightPct.toFixed(1)}% ${locale === "en" ? "of portfolio" : locale === "es" ? "de la cartera" : "da carteira"}`
                    : (locale === "en" ? "In Portfolio" : locale === "es" ? "En Cartera" : "Em Carteira")}
                </span>
              ) : (
                <span className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded">
                  {t.deepDive?.notInPortfolio || "Ativo fora da sua carteira"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border border-border/70 bg-card/80 dark:bg-[#121f19] dark:border-[#1e382d] p-3 shadow-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.qtyInCustody || "Quantidade em Custódia"}
                </div>
                <div className="text-lg font-bold text-foreground font-display mt-0.5">
                  {formatNumber(custodyQuantity, locale)}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {currency === "USD"
                      ? (t.deepDive?.sharesUsSuffix || "shares")
                      : (t.deepDive?.sharesSuffix || "cotas/ações")}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/80 dark:bg-[#121f19] dark:border-[#1e382d] p-3 shadow-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.averagePrice || "Preço Médio (PM)"}
                </div>
                <div className="text-lg font-bold text-foreground font-display mt-0.5">
                  {formatCurrency(
                    custodyAveragePrice,
                    currency,
                    locale,
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/80 dark:bg-[#121f19] dark:border-[#1e382d] p-3 shadow-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.totalCurrentPosition || "Posição Atual Total"}
                </div>
                <div className="text-lg font-bold text-accent-text font-display mt-0.5">
                  {formatCurrency(
                    custodyTotalValue,
                    currency,
                    locale,
                  )}
                </div>
                {currency !== userCurrency && fx?.USDBRL && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    ≈ {formatCurrency(convertCurrency(custodyTotalValue, currency, userCurrency, fx.USDBRL), userCurrency, locale)}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/70 bg-card/80 dark:bg-[#121f19] dark:border-[#1e382d] p-3 shadow-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.capitalGain || "Lucro de Capital"}
                </div>
                {(() => {
                  const isGainPos = custodyCapitalGain >= 0;
                  return (
                    <div
                      className={cn(
                        "text-lg font-bold font-display mt-0.5",
                        isGainPos ? "text-success" : "text-danger",
                      )}
                    >
                      {isGainPos ? "+" : ""}
                      {formatCurrency(custodyCapitalGain, currency, locale)}{" "}
                      <span className="text-xs font-semibold">
                        ({isGainPos ? "+" : ""}
                        {Number.isFinite(custodyCapitalGainPct) ? custodyCapitalGainPct.toFixed(1) : "0.0"}%)
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-card/90 dark:bg-[#0c1a15] p-3 text-xs border border-border/70 shadow-xs">
            <span className="text-muted-foreground">
              {t.deepDive?.yieldOnCost || "Yield on Cost (YoC) Real"}:{" "}
              <strong className="text-success font-semibold">
                {custodyYoC != null && Number.isFinite(custodyYoC)
                  ? `${custodyYoC.toFixed(1)}% ${locale === "en" ? "p.a." : "a.a."}`
                  : (repData && locale === "ptBR" ? repData.dyProj : (locale === "en" ? "12.2% p.a." : "12,2% a.a."))}
              </strong>
            </span>
            <span className="text-muted-foreground">
              {t.deepDive?.dividendsReceived || "Proventos Recebidos"}:{" "}
              <strong className="text-accent-text font-semibold">
                {formatCurrency(
                  custodyDividends,
                  currency,
                  locale,
                )}
              </strong>
            </span>
          </div>
        </div>

        {/* CARD: INTELIGÊNCIA DE PROVENTOS */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-text">
                  {t.deepDive?.dividendIntelligenceBadge || "DIVIDEND FLOW & BOLA DE NEVE"}
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {t.deepDive?.dividendIntelligenceTitle || "Inteligência de Proventos"}
                </h3>
              </div>
              <DividendSafetyBadge
                input={safetyInput}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.projectedDy || "DY Projetado (12M)"}
                </div>
                <div className="text-lg font-bold text-success font-display mt-0.5">
                  {repData && locale === "ptBR"
                    ? repData.dyProj
                    : (livePrice > 0 ? `${((annualDividend / livePrice) * 100).toFixed(1)}% ${locale === "en" ? "p.a." : "a.a."}` : (locale === "en" ? "9.8% p.a." : "9.8% a.a."))}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.paymentFrequency || "Frequência"}
                </div>
                <div className="text-lg font-bold text-foreground mt-0.5">
                  {paymentFrequencyText}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.nextComDate || "Próxima Data COM"}
                </div>
                <div className="text-lg font-bold text-accent-text font-display mt-0.5">
                  {nextComDateText}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.nextPayment || "Data Pagto & Valor"}
                </div>
                <div className="text-sm font-bold text-foreground font-display mt-1">
                  {nextPaymentDateText} • {nextValFormatted}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/10 border-l-4 border-primary p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
              {t.deepDive?.snowballTitle || "Efeito Bola de Neve (Autofinanciamento)"}
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {snowballInfo.text}
            </p>
          </div>
        </div>
      </div>

      {/* 2-COL: CLASS SPECIFIC METRICS & CONSENSUS MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CLASS SPECIFIC METRICS */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
          <div className="mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {classMetrics.badge}
            </span>
            <h3 className="font-serif text-lg font-bold text-foreground">
              {classMetrics.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {classMetrics.items.map((m, idx) => (
              <div key={idx} className="rounded-lg border border-border/70 bg-card/80 dark:bg-[#121f19] dark:border-[#1e382d] p-3 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{m.label}</span>
                  {m.desc && <InfoTooltip content={m.desc} />}
                </div>
                <div className="text-xl font-bold text-foreground font-display my-1">
                  {m.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MATRIZ DE CONSENSO FUENTE (4 MODELOS) */}
        <ValuationConsensusMatrix
          valuation={{
            bazin: tetoBazin,
            graham: tetoGraham,
            gordon: tetoGordon,
            lynch: tetoLynch,
            consensus: tetoConsensus,
            methodDetails: {
              bazin: {
                formula: currency === "USD" ? `DPS / ${bazinYield.toFixed(1)}%` : `DPA / ${bazinYield.toFixed(1)}%`,
                yieldTarget: bazinYield ?? (currency === "USD" ? 3.5 : 6),
                isNetJcp: false,
                source:
                  currency === "USD"
                    ? isUS
                      ? t.deepDive.bazinSourceUs
                      : t.deepDive.bazinSourceUsNonResident
                    : t.deepDive.bazinSourceBr,
                date: "2026",
              },
              gordon: {
                formula: "D1 / (k - g)",
                rate: kDiscount ?? (currency === "USD" ? 8.5 : 11),
                growth: gGrowth ?? (currency === "USD" ? 2.5 : 5),
                source: currency === "USD" || locale === "en" ? "Fuente DDM" : "Consenso Fuente",
                date: "2026",
              },
              graham: {
                formula: currency === "USD" || locale === "en" ? "√(22.5 × EPS × BVPS)" : "√(22,5 × LPA × VPA)",
                margin: 0,
                source: currency === "USD" ? t.deepDive.grahamSourceUs : t.deepDive.grahamSourceBr,
                date: "2026",
              },
              lynch: {
                formula: currency === "USD" || locale === "en" ? "P/E = Growth + DY" : "P/L = Crescimento + DY",
                growth: gGrowth ?? (currency === "USD" ? 2.5 : 5),
                dividendYield: bazinYield ?? (currency === "USD" ? 3.5 : 6),
                source: "Peter Lynch",
                date: "2026",
              },
            },
          }}
          livePrice={livePrice}
          currency={currency}
          ticker={currentTicker}
          showSensitivitySliders={true}
          onApplyAssumptions={handleApplyConsensus}
        />
      </div>

      {/* DIVIDEND SAFETY RADAR */}
      <DividendSafetyRadar
        ticker={currentTicker}
        input={safetyInput}
      />

      {/* TAX PASSPORT */}
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {t.deepDive?.taxPassportBadge || "REGIME TRIBUTÁRIO & COMPLIANCE"}
        </span>
        <h3 className="font-serif text-base font-bold text-foreground mt-0.5 mb-2">
          {t.deepDive?.taxPassportTitle || "Passaporte Fiscal do Ativo"}
        </h3>
        <p
          className="text-xs text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: taxPassportHtml }}
        />
      </div>

      {/* MODAL BOTTOM ACTION: LINK TO FULL EXPLORE ROUTE */}
      {mode === "modal" && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onCloseModal?.();
              navigate({
                to: "/app/explore",
                search: { tab: "deepdive", ticker: currentTicker },
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 transition-all cursor-pointer"
          >
            <span>{t.deepDive?.openInExplore || "Abrir em Tela Cheia no Explorar ↗"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
