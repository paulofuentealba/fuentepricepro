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
  const { valuedItems, fx } = useValuedPortfolio();
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
    return settings?.classTargetYields?.[assetType] ?? repData?.bazinYieldTarget ?? 6.0;
  }, [asset?.type, repData, settings]);

  const [bazinYield, setBazinYield] = useState<number>(defaultBazinYield);
  const [kDiscount, setKDiscount] = useState<number>(repData?.kDiscount ?? 11.0);
  const [gGrowth, setGGrowth] = useState<number>(repData?.gGrowth ?? 5.0);

  // Reset sliders when ticker changes
  useEffect(() => {
    const assetType = asset?.type ?? repData?.classType ?? "STOCK_BR";
    const initialYield = settings?.classTargetYields?.[assetType] ?? repData?.bazinYieldTarget ?? 6.0;
    setBazinYield(initialYield);
    setKDiscount(repData?.kDiscount ?? 11.0);
    setGGrowth(repData?.gGrowth ?? 5.0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTicker]);

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
    return livePrice * 0.06;
  }, [repData, asset, livePrice]);

  // Portfolio Custody calculations
  const totalPortfolioValue = useMemo(() => {
    return valuedItems.reduce(
      (acc, it) => acc + (it.livePrice || it.currentPrice || 0) * (it.quantity || 0),
      0,
    );
  }, [valuedItems]);

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
  const custodyWeightPct =
    totalPortfolioValue > 0 && portfolioHolding
      ? (custodyTotalValue / totalPortfolioValue) * 100
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
    if (eps != null && bvps != null && eps > 0 && bvps > 0) {
      return Math.sqrt(22.5 * eps * bvps);
    }
    if (repData) {
      return repData.teto * 1.05;
    }
    return null;
  }, [eps, bvps, repData]);

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
    return getDynamicClassMetrics(assetType, asset?.metrics);
  }, [repData, asset]);

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
  async function handleApplyConsensus() {
    try {
      const assetType = asset?.type ?? repData?.classType ?? "STOCK_BR";
      const updatedClassYields = {
        ...(settings?.classTargetYields ?? {}),
        [assetType]: bazinYield,
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
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                {repData?.classLabel ?? asset?.type ?? "Ações"}
              </span>
              <span className="text-xs text-muted-foreground">
                Custodiado em:{" "}
                <strong className="text-foreground font-medium">
                  {portfolioHolding?.broker || repData?.broker || "BTG Pactual"}
                </strong>
              </span>
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              {currentTicker}{" "}
              <span className="text-muted-foreground font-sans font-normal text-xl">
                • {asset?.name || repData?.name || currentTicker}
              </span>
            </h2>
            <div className="text-sm text-muted-foreground mt-0.5">
              {asset?.sector || repData?.sector || "Segmento de Renda & Valor"}
            </div>
          </div>

          {/* KPIS */}
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.deepDive?.currentPrice || "Cotação Atual"}
              </div>
              <div className="font-serif text-2xl font-bold text-foreground font-display">
                {formatCurrency(livePrice, currency, locale)}
              </div>
            </div>

            <div className="border-l border-border/70 pl-6 sm:pl-8">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.deepDive?.fuenteCeiling || "Preço Teto Fuente"}
              </div>
              <div className="font-serif text-2xl font-bold text-accent-text font-display">
                {formatCurrency(tetoConsensus, currency, locale)}
              </div>
            </div>

            <div className="border-l border-border/70 pl-6 sm:pl-8">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.deepDive?.safetyMargin || "Margem de Segurança"}
              </div>
              <div
                className={cn(
                  "text-2xl font-bold font-display",
                  marginConsensus >= 0 ? "text-success" : "text-danger",
                )}
              >
                {marginConsensus >= 0 ? "+" : ""}
                {Number.isFinite(marginConsensus) ? marginConsensus.toFixed(1) : "0.0"}%
              </div>
            </div>

            <div className="border-l border-border/70 pl-6 sm:pl-8">
              <StatusBadge
                variant={
                  actionVerdict.type === "strong" || actionVerdict.type === "ok"
                    ? "success"
                    : actionVerdict.type === "hold"
                      ? "warning"
                      : "danger"
                }
                className="px-4 py-1.5 text-xs font-bold"
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
              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.qtyInCustody || "Quantidade em Custódia"}
                </div>
                <div className="text-lg font-bold text-foreground font-display mt-0.5">
                  {formatNumber(custodyQuantity, locale)}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {t.deepDive?.sharesSuffix || "cotas/ações"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
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

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
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
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/25 p-3">
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

          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs border border-border/50">
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
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                Previsibilidade Alta
              </span>
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
                  {repData?.nextPay || "02/OUT"} • {repData?.nextVal || "R$ 0,65 / ação"}
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
              <div key={idx} className="rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </div>
                <div className="text-xl font-bold text-foreground font-display my-0.5">
                  {m.val}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MATRIZ DE CONSENSO FUENTE (4 MODELOS) */}
        <div className="rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-accent/5 p-5 shadow-xs">
          <div className="mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-text">
              {t.deepDive?.consensusBadge || "VALUATION MULTI-METODOLÓGICO • 4 MODELOS CLÁSSICOS"}
            </span>
            <h3 className="font-serif text-lg font-bold text-foreground">
              {t.deepDive?.consensusTitle || "Matriz de Consenso de Preço Teto Fuente"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.deepDive?.consensusDescription ||
                "Cruzamento de Bazin, Graham, Gordon e Peter Lynch para eliminar vieses de uma única fórmula."}
            </p>
          </div>

          {/* HERO BANNER CONSENSO */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.consensusCeiling || "Preço Teto de Consenso Fuente"}
                </div>
                <div className="font-serif text-3xl font-bold text-accent-text font-display">
                  {formatCurrency(tetoConsensus, currency, locale)}
                </div>
                <div
                  className={cn(
                    "text-xs font-semibold mt-0.5",
                    marginConsensus >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {t.deepDive?.avgSafetyMargin || "Margem de Segurança Média"}:{" "}
                  {marginConsensus >= 0 ? "+" : ""}
                  {Number.isFinite(marginConsensus) ? marginConsensus.toFixed(1) : "0.0"}%
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.deepDive?.methodConvergence || "Convergência"}
                </div>
                <span className="inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success ring-1 ring-success/30 mt-1">
                  {t.deepDive?.approvalsCount?.replace("{{count}}", String(approvalsCount)) ||
                    `${approvalsCount} de 4 Aprovam`}
                </span>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {t.deepDive?.highConvergence || "Convergência Alta • Risco Baixo"}
                </div>
              </div>
            </div>

            {/* RANGE RULER */}
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>{t.deepDive?.conservativeFloor || "Piso Conservador"}</span>
                <span className="text-accent-text font-semibold">
                  {t.deepDive?.weightedConsensus || "Consenso Ponderado"}
                </span>
                <span>{t.deepDive?.optimisticCeiling || "Teto Otimista"}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                <div className="absolute left-[15%] right-[15%] h-full bg-gradient-to-r from-primary to-accent rounded-full" />
              </div>
              <div className="flex justify-between text-[11px] font-display font-medium text-foreground mt-1">
                <span>{formatCurrency(minFloor, currency, locale)}</span>
                <span className="text-accent-text font-bold">
                  {formatCurrency(tetoConsensus, currency, locale)}
                </span>
                <span>{formatCurrency(maxCeiling, currency, locale)}</span>
              </div>
            </div>
          </div>

          {/* 4 METHOD CARDS */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {/* BAZIN */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="font-semibold text-foreground">1. Décio Bazin</strong>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold",
                    tetoBazin != null && tetoBazin >= livePrice
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  )}
                >
                  {tetoBazin != null && tetoBazin >= livePrice
                    ? t.deepDive?.belowCeiling || "Abaixo Teto"
                    : t.deepDive?.aboveCeiling || "Acima Teto"}
                </span>
              </div>
              <div className="text-base font-bold text-foreground font-display my-0.5">
                {tetoBazin != null ? formatCurrency(tetoBazin, currency, locale) : "N/D"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Margem:{" "}
                {tetoBazin != null && livePrice > 0 ? (
                  <span
                    className={cn(
                      "font-semibold",
                      tetoBazin >= livePrice ? "text-success" : "text-danger",
                    )}
                  >
                    {tetoBazin >= livePrice ? "+" : ""}
                    {Number.isFinite(((tetoBazin - livePrice) / livePrice) * 100)
                      ? (((tetoBazin - livePrice) / livePrice) * 100).toFixed(1)
                      : "0.0"}%
                  </span>
                ) : (
                  "-"
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                {t.deepDive?.bazinFormula || "Div / Yield Alvo"}
              </div>
            </div>

            {/* GRAHAM */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="font-semibold text-foreground">2. Benjamin Graham</strong>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold",
                    tetoGraham != null && tetoGraham >= livePrice
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  )}
                >
                  {tetoGraham != null && tetoGraham >= livePrice
                    ? t.deepDive?.belowCeiling || "Abaixo Teto"
                    : t.deepDive?.aboveCeiling || "Acima Teto"}
                </span>
              </div>
              <div className="text-base font-bold text-foreground font-display my-0.5">
                {tetoGraham != null ? formatCurrency(tetoGraham, currency, locale) : "N/D"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Margem:{" "}
                {tetoGraham != null && livePrice > 0 ? (
                  <span
                    className={cn(
                      "font-semibold",
                      tetoGraham >= livePrice ? "text-success" : "text-danger",
                    )}
                  >
                    {tetoGraham >= livePrice ? "+" : ""}
                    {Number.isFinite(((tetoGraham - livePrice) / livePrice) * 100)
                      ? (((tetoGraham - livePrice) / livePrice) * 100).toFixed(1)
                      : "0.0"}%
                  </span>
                ) : (
                  "-"
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                {t.deepDive?.grahamFormula || "√(22.5 × LPA × VPA)"}
              </div>
            </div>

            {/* GORDON */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="font-semibold text-foreground">3. Gordon (DCF)</strong>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold",
                    tetoGordon != null && tetoGordon >= livePrice
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  )}
                >
                  {tetoGordon != null && tetoGordon >= livePrice
                    ? t.deepDive?.belowCeiling || "Abaixo Teto"
                    : t.deepDive?.aboveCeiling || "Acima Teto"}
                </span>
              </div>
              <div className="text-base font-bold text-foreground font-display my-0.5">
                {tetoGordon != null ? formatCurrency(tetoGordon, currency, locale) : "N/D"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Margem:{" "}
                {tetoGordon != null && livePrice > 0 ? (
                  <span
                    className={cn(
                      "font-semibold",
                      tetoGordon >= livePrice ? "text-success" : "text-danger",
                    )}
                  >
                    {tetoGordon >= livePrice ? "+" : ""}
                    {Number.isFinite(((tetoGordon - livePrice) / livePrice) * 100)
                      ? (((tetoGordon - livePrice) / livePrice) * 100).toFixed(1)
                      : "0.0"}%
                  </span>
                ) : (
                  "-"
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                {t.deepDive?.gordonFormula || "D1 / (k - g)"}
              </div>
            </div>

            {/* LYNCH */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="font-semibold text-foreground">4. Peter Lynch</strong>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold",
                    tetoLynch != null && tetoLynch >= livePrice
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  )}
                >
                  {tetoLynch != null && tetoLynch >= livePrice
                    ? t.deepDive?.belowCeiling || "Abaixo Teto"
                    : t.deepDive?.aboveCeiling || "Acima Teto"}
                </span>
              </div>
              <div className="text-base font-bold text-foreground font-display my-0.5">
                {tetoLynch != null ? formatCurrency(tetoLynch, currency, locale) : "N/D"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Margem:{" "}
                {tetoLynch != null && livePrice > 0 ? (
                  <span
                    className={cn(
                      "font-semibold",
                      tetoLynch >= livePrice ? "text-success" : "text-danger",
                    )}
                  >
                    {tetoLynch >= livePrice ? "+" : ""}
                    {Number.isFinite(((tetoLynch - livePrice) / livePrice) * 100)
                      ? (((tetoLynch - livePrice) / livePrice) * 100).toFixed(1)
                      : "0.0"}%
                  </span>
                ) : (
                  "-"
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                {t.deepDive?.lynchFormula || "LPA × Crescimento g"}
              </div>
            </div>
          </div>

          {/* SLIDERS DE PREMISSAS */}
          <div className="rounded-lg border border-border/60 bg-muted/25 p-3.5 space-y-3 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t.deepDive?.assumptionsTitle || "Ajuste de Premissas Globais (Tempo Real)"}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {t.deepDive?.bazinYieldLabel || "Yield Mínimo Bazin"}:
                </span>
                <strong className="text-primary font-bold">{(bazinYield ?? 6).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="4"
                max="14"
                step="0.5"
                value={bazinYield ?? 6}
                onChange={(e) => setBazinYield(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {t.deepDive?.gordonDiscountLabel || "Taxa de Desconto Gordon (k)"}:
                </span>
                <strong className="text-accent-text font-bold">{(kDiscount ?? 11).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="8"
                max="16"
                step="0.5"
                value={kDiscount ?? 11}
                onChange={(e) => setKDiscount(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {t.deepDive?.perpetualGrowthLabel || "Crescimento Perpétuo Gordon / Lynch (g)"}:
                </span>
                <strong className="text-foreground font-bold">{(gGrowth ?? 5).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="1"
                max="7.5"
                step="0.5"
                value={gGrowth ?? 5}
                onChange={(e) => setGGrowth(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyConsensus}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-all cursor-pointer"
          >
            {t.deepDive?.applyConsensusBtn || "Aplicar Consenso ao Motor de Aportes"}
          </button>
        </div>
      </div>

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
