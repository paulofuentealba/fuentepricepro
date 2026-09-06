import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { assetQueryOptions, quoteQueryOptions } from "@/lib/queryOptions";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ValuationConsensusMatrix } from "@/components/shared/ValuationConsensusMatrix";
import { DividendSafetyBadge } from "@/components/shared/DividendSafetyBadge";
import { DividendSafetyRadar } from "@/components/shared/DividendSafetyRadar";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/lib/apiService.functions";
import {
  REPRESENTATIVE_ASSETS,
  REPRESENTATIVE_KEYS,
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

  const showSelector = hideSelector !== undefined ? !hideSelector : mode !== "modal";
  const showSearch = hideSearch !== undefined ? !hideSearch : mode !== "modal";

  const [currentTicker, setCurrentTicker] = useState<string>(initialTicker.toUpperCase());

  // Keep internal state synced if initialTicker changes from parent (e.g. modal prop)
  useEffect(() => {
    if (initialTicker) {
      setCurrentTicker(initialTicker.toUpperCase());
    }
  }, [initialTicker]);

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
    if (repData) {
      return { label: repData.action, type: repData.actionType };
    }
    if (marginConsensus >= 15) return { label: "APORTE FORTE", type: "strong" as const };
    if (marginConsensus >= 0) return { label: "APORTE OK", type: "ok" as const };
    if (marginConsensus >= -10) return { label: "AGUARDAR", type: "hold" as const };
    return { label: "QUARENTENA", type: "danger" as const };
  }, [repData, marginConsensus]);

  // Class fundamentals metrics
  const classMetrics = useMemo(() => {
    if (repData) {
      return {
        badge: repData.metricsBadge,
        title: repData.metricsTitle,
        items: repData.metrics,
      };
    }
    const assetType = asset?.type ?? "STOCK_BR";
    return getDynamicClassMetrics(assetType, asset?.metrics, currency);
  }, [repData, asset, currency]);

  // Tax passport
  const taxPassportHtml = useMemo(() => {
    if (repData) return repData.taxPassportHtml;
    const assetType = asset?.type ?? "STOCK_BR";
    return getDynamicTaxPassport(assetType, currency);
  }, [repData, asset, currency]);

  // Snowball calculations
  const snowballInfo = useMemo(() => {
    if (repData) {
      return {
        reqQty: repData.snowballReqQty,
        text: repData.snowballText,
      };
    }
    const dividendPerShare = annualDividend / (asset?.paymentMonths?.length || 4 || 1);
    const req = dividendPerShare > 0 ? Math.ceil(livePrice / dividendPerShare) : 100;
    return {
      reqQty: req,
      text: t.deepDive?.snowballText?.replace("{{qty}}", String(req)) ||
        `A cada ciclo, ${req} cotas geram proventos suficientes para adquirir 1 nova cota automaticamente.`,
    };
  }, [repData, annualDividend, asset, livePrice, t]);

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

  return (
    <div className="space-y-6">
      {/* 8 REPRESENTATIVE CLASS SELECTOR BAR (App Style) */}
      {showSelector && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.deepDive?.categoriesTitle || "Selecione 1 ativo representativo de cada uma das 8 categorias:"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {t.deepDive?.categoriesCount || "8 classes mapeadas"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {REPRESENTATIVE_KEYS.map((key) => {
              const item = REPRESENTATIVE_ASSETS[key];
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
                        isPositive ? "text-success" : "text-danger",
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
                t.deepDive?.searchPlaceholder ||
                "Buscar qualquer ticker ou ativo da B3 / EUA (ex: PETR4, TAEE11, AAPL, MXRF11)..."
              }
              onPick={handleSearchPick}
            />
          </div>

          {/* User holdings quick chips (if available) */}
          {valuedItems.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">Na sua carteira:</span>
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
                {repData?.classLabel ?? asset?.type ?? "Ações"}
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
                    {portfolioHolding.broker || (currency === "USD" ? "Avenue / Schwab" : "Corretora")}
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
              {asset?.sector || repData?.sector || "Segmento de Renda & Valor"}
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
                    ? `${custodyWeightPct.toFixed(1)}% da carteira`
                    : "Em Carteira"}
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
                {currency === "USD" && fx?.USDBRL && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    ≈ {formatCurrency(custodyTotalValue * fx.USDBRL, "BRL", locale)}
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
                  ? `${custodyYoC.toFixed(1)}% a.a.`
                  : repData?.dyProj ?? "12,2% a.a."}
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
                input={{
                  type: asset?.type,
                  payoutRatio: (asset as any)?.payoutRatio ?? 0.55,
                  netDebtToEbitda: (asset as any)?.netDebtToEbitda ?? 1.4,
                  roe: (asset as any)?.roe ?? 0.18,
                  yearsPayingDividends: 10,
                  vacancyRate: (asset as any)?.vacancyRate,
                  pvp: (asset as any)?.pvp,
                }}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.projectedDy || "DY Projetado (12M)"}
                </div>
                <div className="text-lg font-bold text-success font-display mt-0.5">
                  {repData?.dyProj ||
                    (livePrice > 0 ? `${((annualDividend / livePrice) * 100).toFixed(1)}% a.a.` : "9.8% a.a.")}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.paymentFrequency || "Frequência"}
                </div>
                <div className="text-lg font-bold text-foreground mt-0.5">
                  {repData?.payFreq || "Trimestral"}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.nextComDate || "Próxima Data COM"}
                </div>
                <div className="text-lg font-bold text-accent-text font-display mt-0.5">
                  {asset?.exDividendDate
                    ? new Date(asset.exDividendDate).toLocaleDateString(locale)
                    : repData?.nextCom || "18/SET/2026"}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.nextPayment || "Data Pagto & Valor"}
                </div>
                <div className="text-sm font-bold text-foreground font-display mt-1">
                  {repData?.nextPay || "—"} • {repData?.nextVal || (annualDividend > 0 ? `${currency === "USD" ? "US$ " : "R$ "}${(annualDividend / 4).toFixed(2)} / ${currency === "USD" ? "share" : "ação"}` : (currency === "USD" ? "US$ — / share" : "R$ — / ação"))}
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
                formula: currency === "USD" ? `DPA / ${bazinYield.toFixed(1)}%` : "DPA / 6%",
                yieldTarget: bazinYield ?? (currency === "USD" ? 3.5 : 6),
                isNetJcp: false,
                source: currency === "USD" ? "SEC / Proventos Líquidos (WHT 30%)" : "CVM / B3",
                date: "2026",
              },
              gordon: {
                formula: "D1 / (k - g)",
                rate: kDiscount ?? (currency === "USD" ? 8.5 : 11),
                growth: gGrowth ?? 5,
                source: "Consenso Fuente",
                date: "2026",
              },
              graham: {
                formula: "√(22,5 × LPA × VPA)",
                margin: 0,
                source: currency === "USD" ? "Benjamin Graham (Bolsa US)" : "Graham Formula",
                date: "2026",
              },
              lynch: {
                formula: "P/L = Crescimento + DY",
                growth: 10,
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
        input={{
          type: asset?.type,
          payoutRatio: (asset as any)?.payoutRatio ?? 0.55,
          netDebtToEbitda: (asset as any)?.netDebtToEbitda ?? 1.4,
          roe: (asset as any)?.roe ?? 0.18,
          yearsPayingDividends: 10,
          vacancyRate: (asset as any)?.vacancyRate,
          pvp: (asset as any)?.pvp,
        }}
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
