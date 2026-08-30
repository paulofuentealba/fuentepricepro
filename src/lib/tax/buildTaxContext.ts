import type { Transaction } from "@/lib/transactionsLogic";
import type { WatchlistItem } from "@/lib/watchlist";
import type { AssetType, Currency } from "@/lib/domain";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import { isUsAsset } from "@/lib/calculations";
import { calculateRealizedGains } from "./br/capitalGains";
import { simulateBrDividendTax } from "./br/dividends";
import { simulateBrJcpTax } from "./br/jcp";
import { simulateUsWithholdingTax } from "./us/withholding";
import { simulateForeignCapitalGainsTax } from "./exterior/foreignCapitalGains";
import type {
  RealizedGainEvent,
  TaxSimulationResult,
  TaxSimulationPositionInput,
  AnnualForeignCapitalGainsResult,
} from "./types";
import { getLocalDateISOString } from "@/lib/formatters";

export interface TaxRealityContext {
  assetTypeByTicker: Map<string, AssetType>;
  currencyByTicker: Map<string, Currency>;
  isFixedIncomeEtfByTicker: Map<string, boolean>;
  transactions: Transaction[];
  realizedGainEvents: RealizedGainEvent[];
  currentYear: number;
  currentMonthKey: string; // "YYYY-MM"
  brDividendsTaxResult: TaxSimulationResult;
  jcpTaxResult: TaxSimulationResult;
  usWithholdingTaxResult: TaxSimulationResult;
  foreignCapitalGainsResults: AnnualForeignCapitalGainsResult[];
  fxRate: number;
  totalNetDividends: number;
  totalNetJcp: number;
  totalNetUsBrl: number;
  totalDividendNet: number;
  totalWithheldTax: number;
}

/**
 * Pure helper to build the input context for the 4 tax calculation modules
 * (dividends BR, JCP BR, US withholding, capital gains stocks, capital gains FII).
 *
 * Consumes raw gross amounts (ev.amountGross) — NEVER ev.amountNet — to ensure the
 * Phase 2 tax adapters are the single source of truth for net tax simulation without
 * double-taxation risk.
 */
export function buildTaxContext(
  transactions: Transaction[],
  watchlistItems: WatchlistItem[],
  realizedIncomeEvents: RealizedIncomeEvent[] = [],
  fxRate: number = 1,
): TaxRealityContext {
  // 1. assetTypeByTicker, currencyByTicker, isFixedIncomeEtfByTicker & customTaxRateByTicker
  //    derived from WatchlistItem
  const assetTypeByTicker = new Map<string, AssetType>();
  const currencyByTicker = new Map<string, Currency>();
  const isFixedIncomeEtfByTicker = new Map<string, boolean>();
  const customTaxRateByTicker = new Map<string, number | null | undefined>();
  for (const item of watchlistItems) {
    const ticker = item.ticker.toUpperCase();
    assetTypeByTicker.set(ticker, item.type);
    currencyByTicker.set(ticker, item.currency);
    isFixedIncomeEtfByTicker.set(ticker, !!item.isFixedIncomeEtf);
    customTaxRateByTicker.set(ticker, item.customTaxRate);
  }

  // 2. RealizedGainEvent[] from transactions (calculateRealizedGains replays buys/splits to maintain cost basis)
  const realizedGainEvents = calculateRealizedGains(transactions);

  // 3. Current year/month in LOCAL timezone (consistent with tax modules)
  const nowLocal = getLocalDateISOString(); // "YYYY-MM-DD"
  const currentYear = parseInt(nowLocal.slice(0, 4), 10);
  const currentYearStr = String(currentYear);
  const currentMonthKey = nowLocal.slice(0, 7); // "YYYY-MM"

  // 4. Segregate current-year paid dividend events into Phase 2 adapters
  const brPositions: TaxSimulationPositionInput[] = [];
  const jcpPositions: TaxSimulationPositionInput[] = [];
  const usPositions: TaxSimulationPositionInput[] = [];

  for (const ev of realizedIncomeEvents) {
    if (!ev.isPaid) continue;
    const payDate = ev.paymentDate || ev.exDate;
    if (!payDate.startsWith(currentYearStr)) continue;

    const tickerUpper = ev.ticker.toUpperCase();
    const resolvedType =
      assetTypeByTicker.get(tickerUpper) ||
      (ev.currency === "USD" ? "STOCK_US" : "STOCK_BR");
    const customTaxRate = customTaxRateByTicker.get(tickerUpper);

    // CRITICAL: use ev.amountGross as grossAmount. Do NOT use ev.amountNet (avoids double taxation)
    const pos: TaxSimulationPositionInput = {
      ticker: ev.ticker,
      type: resolvedType,
      grossAmount: ev.amountGross,
      currency: ev.currency,
      customTaxRate,
    };

    if (ev.taxType === "jcp") {
      jcpPositions.push(pos);
    } else if (ev.taxType === "us_dividend" || isUsAsset(resolvedType, ev.currency)) {
      usPositions.push({ ...pos, jurisdiction: "US" });
    } else {
      // "dividend" or "rendimento_fii"
      brPositions.push({ ...pos, jurisdiction: "BR" });
    }
  }

  const brDividendsTaxResult = simulateBrDividendTax(brPositions);
  const jcpTaxResult = simulateBrJcpTax(jcpPositions);
  const usWithholdingTaxResult = simulateUsWithholdingTax(usPositions);
  const foreignCapitalGainsResults = simulateForeignCapitalGainsTax(
    realizedGainEvents,
    assetTypeByTicker,
    currencyByTicker,
  );

  const totalNetDividends = brDividendsTaxResult.totalNet;
  const totalNetJcp = jcpTaxResult.totalNet;
  const effectiveFx = typeof fxRate === "number" && fxRate > 0 ? fxRate : 1;
  const totalNetUsBrl = usWithholdingTaxResult.totalNet * effectiveFx;
  const totalDividendNet = totalNetDividends + totalNetJcp + totalNetUsBrl;
  const totalWithheldTax = jcpTaxResult.totalTax + usWithholdingTaxResult.totalTax * effectiveFx;

  return {
    assetTypeByTicker,
    currencyByTicker,
    isFixedIncomeEtfByTicker,
    transactions,
    realizedGainEvents,
    currentYear,
    currentMonthKey,
    brDividendsTaxResult,
    jcpTaxResult,
    usWithholdingTaxResult,
    foreignCapitalGainsResults,
    fxRate: effectiveFx,
    totalNetDividends: Math.round(totalNetDividends * 100) / 100,
    totalNetJcp: Math.round(totalNetJcp * 100) / 100,
    totalNetUsBrl: Math.round(totalNetUsBrl * 100) / 100,
    totalDividendNet: Math.round(totalDividendNet * 100) / 100,
    totalWithheldTax: Math.round(totalWithheldTax * 100) / 100,
  };
}