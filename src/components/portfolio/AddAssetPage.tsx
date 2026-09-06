import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { MaskedInput } from "@/components/ceiling/shared/MaskedInput";
import type { SearchHit } from "@/lib/api/types";
import { assetQueryOptions, exchangeRateQueryOptions, quoteQueryOptions } from "@/lib/queryOptions";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import {
  useTransactions,
  recalculateHoldingFromTransactions,
  type Transaction,
  type ThesisSnapshot,
} from "@/lib/transactions";
import { buildWatchlistItem } from "@/lib/buildWatchlistItem";
import { KNOWN_BROKER_LABELS } from "@/lib/brokers";
import { getAssetValuation } from "@/lib/calculations";
import { useSettings } from "@/lib/settings";
import { useUserSettings } from "@/lib/useUserSettings";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { convertCurrency } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import { getDisplayAssetType, displayTicker } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/i18n";
import { resolveReasonText } from "@/lib/askEngine";
import { cn } from "@/lib/utils";

type OperationType = "buy" | "sell";

/**
 * Full-page "Adicionar ativo" flow — replaces the old NewContributionDialog modal for the
 * /myportfolio entry point (see Watchlist.tsx's AddAssetDropdown). Reuses the same
 * asset-picking (TickerSearchField), draft-building (buildWatchlistItem), and
 * transaction-saving (recalculateHoldingFromTransactions, thesisSnapshot capture) logic
 * NewContributionDialog already used — no calculation is duplicated, only the layout and the
 * live preview panels (impact on portfolio, consensus on date) are new.
 */
export function AddAssetPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { targetYield: globalYield } = useSettings();
  const { settings } = useUserSettings();
  const { items, upsert: upsertWatchlistItem } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { valuedItems } = useValuedPortfolio();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const usdRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;
  const displayCurrency = settings.displayCurrency;

  const [pickedHit, setPickedHit] = useState<SearchHit | null>(null);
  const [workingItem, setWorkingItem] = useState<WatchlistItem | null>(null);
  const [type, setType] = useState<OperationType>("buy");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [quantity, setQuantity] = useState<string>("100");
  const [pricePerShare, setPricePerShare] = useState<string>("");
  const [fees, setFees] = useState<string>("");
  const [broker, setBroker] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastPricedTicker, setLastPricedTicker] = useState<string | null>(null);

  const assetResult = useQuery({
    ...assetQueryOptions(pickedHit?.ticker ?? ""),
    enabled: !!pickedHit?.ticker,
  });
  const quoteResult = useQuery({
    ...quoteQueryOptions(pickedHit?.ticker ?? ""),
    enabled: !!pickedHit?.ticker,
  });

  const existingItem = useMemo(
    () => (pickedHit ? items.find((i) => i.ticker === pickedHit.ticker) ?? null : null),
    [items, pickedHit],
  );

  function handlePick(hit: SearchHit) {
    setPickedHit(hit);
    const existing = items.find((i) => i.ticker === hit.ticker) ?? null;
    if (existing) {
      setWorkingItem(existing);
      setBroker(existing.broker ?? "");
      if (existing.currentPrice && existing.currentPrice > 0) {
        setPricePerShare(String(existing.currentPrice));
        setLastPricedTicker(hit.ticker);
      } else {
        setPricePerShare("");
        setLastPricedTicker(null);
      }
    } else {
      const isUs = hit.type === "STOCK_US" || hit.type === "REIT";
      const initialDraft: WatchlistItem = {
        id: hit.ticker,
        ticker: hit.ticker,
        name: hit.name,
        type: hit.type,
        currency: isUs ? "USD" : "BRL",
        currentPrice: 0,
        annualDividend: 0,
        targetYield: globalYield,
        ceilingPrice: 0,
        safetyMargin: 0,
        quantity: 0,
        averagePrice: null,
        paymentMonths: [],
        targetMonthlyIncome: null,
        payoutRatio: null,
        addedAt: Date.now(),
        investingSince: Date.now(),
      };
      setWorkingItem(initialDraft);
      setBroker("");
      setPricePerShare("");
      setLastPricedTicker(null);
    }
  }

  useEffect(() => {
    if (!pickedHit) return;
    if (existingItem) {
      setWorkingItem(existingItem);
      setBroker(existingItem.broker ?? "");
      return;
    }
    if (assetResult.data && assetResult.data.ticker === pickedHit.ticker) {
      const draft = buildWatchlistItem(assetResult.data, {
        targetYield: globalYield,
        quantity: 0,
        averagePrice: null,
      });
      setWorkingItem(draft);
    }
  }, [pickedHit, assetResult.data, existingItem, globalYield]);

  useEffect(() => {
    if (!workingItem) return;
    const isNewTicker = lastPricedTicker !== workingItem.ticker;
    if (isNewTicker || !pricePerShare) {
      const quotePrice = quoteResult.data?.ticker === workingItem.ticker ? quoteResult.data.price : null;
      const assetPrice = assetResult.data?.ticker === workingItem.ticker ? assetResult.data.currentPrice : null;
      const livePrice =
        quotePrice ??
        assetPrice ??
        (workingItem.currentPrice > 0 ? workingItem.currentPrice : null);
      if (livePrice != null && livePrice > 0) {
        setPricePerShare(String(livePrice));
        setLastPricedTicker(workingItem.ticker);
      }
    }
  }, [
    workingItem,
    lastPricedTicker,
    pricePerShare,
    quoteResult.data,
    assetResult.data,
  ]);

  const tickerTxs = useMemo(
    () => (workingItem ? transactions.filter((tx) => tx.ticker === workingItem.ticker) : []),
    [transactions, workingItem],
  );

  const qtyNum = parseFloat(quantity);
  const priceNum = parseFloat(pricePerShare);
  const feesNum = fees ? parseFloat(fees) : 0;
  const isValidEntry = !!workingItem && !!date && qtyNum > 0 && priceNum > 0;

  const draftTx: Transaction | null = useMemo(() => {
    if (!isValidEntry || !workingItem || !date) return null;
    return {
      id: "draft",
      ticker: workingItem.ticker,
      type,
      date: date.getTime(),
      quantity: qtyNum,
      pricePerShare: priceNum,
      fees: feesNum > 0 ? feesNum : null,
    };
  }, [isValidEntry, workingItem, type, date, qtyNum, priceNum, feesNum]);

  // --- "Como isso afeta sua carteira" preview -------------------------------------------
  const impact = useMemo(() => {
    if (!workingItem || !draftTx) return null;

    const { quantity: newQuantity, averagePrice: newAveragePrice } = recalculateHoldingFromTransactions([
      ...tickerTxs,
      draftTx,
    ]);
    const investedValue = newQuantity * newAveragePrice;
    const deltaQty = newQuantity - (existingItem?.quantity ?? 0);
    const perShareDividend = workingItem.annualDividend ?? 0;
    const estimatedMonthlyIncome = (deltaQty * perShareDividend) / 12;

    const liveQuote = quoteResult.data?.ticker === workingItem.ticker ? quoteResult.data : null;
    const assetData = assetResult.data?.ticker === workingItem.ticker ? assetResult.data : null;
    const livePriceForValuation =
      liveQuote?.price ??
      assetData?.currentPrice ??
      (workingItem.currentPrice > 0 ? workingItem.currentPrice : null) ??
      priceNum;
    const thisItemNewValue = convertCurrency(
      newQuantity * livePriceForValuation,
      workingItem.currency,
      displayCurrency,
      usdRate,
    );

    const displayClass = getDisplayAssetType(workingItem.type);
    let otherTotal = 0;
    let otherClassTotal = 0;
    for (const it of valuedItems) {
      if (it.ticker === workingItem.ticker || it.isClosedPosition || !it.quantity) continue;
      const value = convertCurrency(it.quantity * it.livePrice, it.currency, displayCurrency, usdRate);
      otherTotal += value;
      if (getDisplayAssetType(it.type) === displayClass) otherClassTotal += value;
    }
    const totalAfter = otherTotal + thisItemNewValue;
    const classAfter = otherClassTotal + thisItemNewValue;
    const allocationPct = totalAfter > 0 ? (classAfter / totalAfter) * 100 : 0;
    const allocationTargetPct = settings.smartAllocationTargets?.[displayClass] ?? null;

    return {
      newAveragePrice,
      newQuantity,
      investedValue,
      estimatedMonthlyIncome,
      displayClass,
      allocationPct,
      allocationTargetPct,
    };
  }, [
    workingItem,
    draftTx,
    tickerTxs,
    existingItem,
    quoteResult.data,
    assetResult.data,
    priceNum,
    valuedItems,
    displayCurrency,
    usdRate,
    settings.smartAllocationTargets,
  ]);

  // --- "Consenso na data" preview -------------------------------------------------------
  const consensus = useMemo(() => {
    if (!workingItem || priceNum <= 0) return null;
    const assetData = assetResult.data?.ticker === workingItem.ticker ? assetResult.data : null;
    try {
      const val = getAssetValuation({
        targetYield: workingItem.targetYield,
        currentPrice: priceNum,
        avgDividend: workingItem.annualDividend,
        eps: assetData?.epsCurrent ?? assetData?.metrics?.eps ?? null,
        bvps: assetData?.metrics?.bvps ?? null,
        dividendCagr: assetData?.metrics?.dividendCagr5y ?? null,
        currency: workingItem.currency,
        type: workingItem.type,
      });
      const consensusPrice = val.fuenteConsensus ?? workingItem.ceilingPrice ?? null;
      const margin = consensusPrice != null && priceNum > 0 ? ((consensusPrice - priceNum) / priceNum) * 100 : null;
      return {
        consensusPrice,
        margin,
        payoutRatio: workingItem.payoutRatio ?? assetData?.metrics?.payoutRatio ?? null,
      };
    } catch {
      if (workingItem.ceilingPrice != null && priceNum > 0) {
        const margin = ((workingItem.ceilingPrice - priceNum) / priceNum) * 100;
        return { consensusPrice: workingItem.ceilingPrice, margin, payoutRatio: workingItem.payoutRatio ?? null };
      }
      return null;
    }
  }, [workingItem, assetResult.data, priceNum]);

  async function handleSubmit() {
    if (!workingItem || !draftTx || isSaving) return;
    setIsSaving(true);
    try {
      let finalTx: Transaction = { ...draftTx, id: crypto.randomUUID() };

      if (type === "buy") {
        const assetData = assetResult.data?.ticker === workingItem.ticker ? assetResult.data : null;
        try {
          const val = getAssetValuation({
            targetYield: workingItem.targetYield,
            currentPrice: priceNum,
            avgDividend: workingItem.annualDividend,
            eps: assetData?.epsCurrent ?? assetData?.metrics?.eps ?? null,
            bvps: assetData?.metrics?.bvps ?? null,
            dividendCagr: assetData?.metrics?.dividendCagr5y ?? null,
            currency: workingItem.currency,
            type: workingItem.type,
          });
          const consensusPrice = val.fuenteConsensus ?? workingItem.ceilingPrice ?? null;
          const safetyMarginVsConsensus =
            consensusPrice != null && priceNum > 0 ? ((consensusPrice - priceNum) / priceNum) * 100 : null;
          const dy =
            priceNum > 0 && workingItem.annualDividend > 0
              ? (workingItem.annualDividend / priceNum) * 100
              : val.dividendYield;

          const snapshot: ThesisSnapshot = {
            consensusPrice,
            bazinPrice: val.methods.bazin,
            grahamPrice: val.methods.graham ?? val.methods.lynch ?? null,
            gordonPrice: val.methods.gordon,
            purchasePrice: priceNum,
            safetyMarginVsConsensus,
            payoutRatio: workingItem.payoutRatio ?? assetData?.metrics?.payoutRatio ?? null,
            dividendYield: dy,
            dividendCagr5y: assetData?.metrics?.dividendCagr5y ?? null,
            piotroskiScore: (assetData?.metrics as any)?.piotroskiScore ?? null,
            isYieldTrap: !!val.yieldTrapWarning,
            valuationVersion: "fuente-v1",
            capturedAt: Date.now(),
            unavailableReason: consensusPrice == null ? "CONSENSUS_UNAVAILABLE" : null,
          };
          finalTx = { ...finalTx, thesisSnapshot: snapshot };
        } catch {
          // Save without a thesis snapshot rather than blocking the transaction.
        }
      }

      await upsertTransaction(finalTx);
      const newTxs = [...transactions.filter((tx) => tx.id !== finalTx.id), finalTx].filter(
        (tx) => tx.ticker === workingItem.ticker,
      );
      const { quantity: finalQty, averagePrice: finalAvg } = recalculateHoldingFromTransactions(
        newTxs.sort((a, b) => b.date - a.date),
      );
      upsertWatchlistItem({ ...workingItem, quantity: finalQty, averagePrice: finalAvg, broker: broker.trim() || null });
      navigate({ to: "/app/myportfolio" });
    } finally {
      setIsSaving(false);
    }
  }

  const liveQuote = quoteResult.data?.ticker === workingItem?.ticker ? quoteResult.data : null;
  const assetDataForWorkingItem = assetResult.data?.ticker === workingItem?.ticker ? assetResult.data : null;
  const assetPrice =
    liveQuote?.price ??
    assetDataForWorkingItem?.currentPrice ??
    (workingItem && workingItem.currentPrice > 0 ? workingItem.currentPrice : null);
  const changePct = liveQuote?.changePct ?? null;
  const currencySymbol = workingItem?.currency === "USD" ? "US$" : "R$";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-display font-semibold uppercase tracking-widest text-success">
            {t.addAssetPage?.eyebrow}
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t.addAssetPage?.title}
          </h1>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate({ to: "/app/myportfolio" })}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.addAssetPage?.back}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: search + form */}
        <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
          <h3 className="font-serif text-base font-medium text-foreground">{t.addAssetPage?.searchCardTitle}</h3>

          <div className="mt-4">
            <TickerSearchField onPick={handlePick} label={t.addAssetPage?.searchLabel} autoFocus />
          </div>

          {workingItem && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 font-mono text-[11px] font-semibold text-accent-text">
                {workingItem.ticker.slice(0, 4)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{displayTicker(workingItem.ticker)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[workingItem.name, assetDataForWorkingItem?.sector].filter(Boolean).join(" · ")}
                </div>
              </div>
              {assetPrice != null && (
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {formatCurrency(assetPrice, workingItem.currency, locale)}
                  </div>
                  {changePct != null && (
                    <div className={cn("text-xs font-medium", changePct >= 0 ? "text-success" : "text-danger")}>
                      {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 space-y-2">
            <Label>{t.transactions.type}</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType("buy")}
                disabled={!workingItem}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                  type === "buy"
                    ? "border-success bg-success/15 text-success"
                    : "border-border text-muted-foreground hover:bg-muted/30",
                )}
              >
                {t.transactions.buy}
              </button>
              <button
                type="button"
                onClick={() => setType("sell")}
                disabled={!workingItem}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                  type === "sell"
                    ? "border-danger bg-danger/15 text-danger"
                    : "border-border text-muted-foreground hover:bg-muted/30",
                )}
              >
                {t.transactions.sell}
              </button>
              <button
                type="button"
                disabled
                title={t.addAssetPage?.bonificacaoDisabledHint}
                className="cursor-not-allowed rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground/50"
              >
                {t.addAssetPage?.bonificacao}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-asset-qty">{t.transactions.qty}</Label>
              <MaskedInput
                id="add-asset-qty"
                formatMode="numeric"
                value={quantity ? parseFloat(quantity) : null}
                onChangeValue={(v) => setQuantity(v !== undefined ? String(v) : "")}
                disabled={!workingItem}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-asset-price">{t.transactions.price}</Label>
              <MaskedInput
                id="add-asset-price"
                formatMode="currency"
                currencySymbol={currencySymbol}
                value={pricePerShare ? parseFloat(pricePerShare) : null}
                onChangeValue={(v) => setPricePerShare(v !== undefined ? String(v) : "")}
                disabled={!workingItem}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="add-asset-broker" className="text-xs font-semibold text-foreground">
              {t.portfolio.brokerLabel}
            </Label>
            <Input
              id="add-asset-broker"
              list="known-brokers"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder={t.portfolio.brokerPlaceholder}
              className="h-11 sm:h-9"
              disabled={!workingItem}
            />
            <datalist id="known-brokers">
              {Object.values(KNOWN_BROKER_LABELS).map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.transactions.date}</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder={t.transactions.date}
                disabled={!workingItem ? true : (d) => d > new Date() || d < new Date("1990-01-01")}
                rangeMode="past"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-asset-fees">{t.transactions.fees}</Label>
              <MaskedInput
                id="add-asset-fees"
                formatMode="currency"
                currencySymbol={currencySymbol}
                value={fees ? parseFloat(fees) : null}
                onChangeValue={(v) => setFees(v !== undefined ? String(v) : "")}
                disabled={!workingItem}
              />
            </div>
          </div>

          <Button
            className="mt-5 w-full bg-success text-success-foreground hover:bg-success/90"
            disabled={!isValidEntry || isSaving}
            onClick={handleSubmit}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.addAssetPage?.submit}
          </Button>
        </div>

        {/* Right: impact + consensus */}
        <div className="flex flex-col gap-5">
          <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-base font-medium text-foreground">{t.addAssetPage?.impactCardTitle}</h3>
              <StatusBadge variant="gold">{t.addAssetPage?.impactBadge}</StatusBadge>
            </div>

            {!impact ? (
              <p className="mt-4 text-sm text-muted-foreground">{t.addAssetPage?.impactEmpty}</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-border/40">
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{t.addAssetPage?.newAveragePrice}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(impact.newAveragePrice, workingItem!.currency, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{t.addAssetPage?.positionAfter}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {resolveReasonText(t, "addAssetPage.positionUnit", { qty: impact.newQuantity })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{t.addAssetPage?.investedValue}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(impact.investedValue, workingItem!.currency, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{t.addAssetPage?.estimatedMonthlyIncome}</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      impact.estimatedMonthlyIncome >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {impact.estimatedMonthlyIncome >= 0 ? "+ " : ""}
                    {formatCurrency(impact.estimatedMonthlyIncome, workingItem!.currency, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {resolveReasonText(t, "addAssetPage.allocationAfter", { class: t.types?.[impact.displayClass] ?? impact.displayClass })}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {impact.allocationPct.toFixed(0)}%{" "}
                    {impact.allocationTargetPct != null && (
                      <span className="text-muted-foreground">
                        {resolveReasonText(t, "addAssetPage.allocationTarget", { target: impact.allocationTargetPct })}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-base font-medium text-foreground">{t.addAssetPage?.consensusCardTitle}</h3>
              <StatusBadge variant={consensus?.consensusPrice != null ? "success" : "default"}>
                {consensus?.consensusPrice != null
                  ? t.addAssetPage?.consensusBadgeRegistered
                  : t.addAssetPage?.consensusBadgeUnavailable}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.addAssetPage?.consensusDesc}</p>

            {consensus?.consensusPrice != null ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.addAssetPage?.consensusLabel}
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {formatCurrency(consensus.consensusPrice, workingItem!.currency, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.addAssetPage?.marginLabel}
                  </div>
                  <div
                    className={cn(
                      "mt-1 font-mono text-sm font-semibold",
                      (consensus.margin ?? 0) >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {consensus.margin != null ? `${consensus.margin >= 0 ? "+" : ""}${consensus.margin.toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.addAssetPage?.payoutLabel}
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {consensus.payoutRatio != null ? `${consensus.payoutRatio.toFixed(0)}%` : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">{t.addAssetPage?.consensusUnavailable}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
