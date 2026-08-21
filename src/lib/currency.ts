import type { Currency } from "@/lib/domain";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";

/** Fallback USD/BRL rate used whenever a live quote isn't available (SSOT: macroDefaults.ts). */
export const DEFAULT_USD_BRL_RATE = EXCHANGE_RATE_FALLBACK;

/**
 * SSOT for BRL/USD currency conversion. Every aggregator that mixes
 * multi-currency positions into a single total (cashflow projections,
 * realized income, FI progress, net worth) should convert through this
 * function instead of reimplementing `value * rate` / `value / rate` inline
 * — those independent reimplementations previously drifted (e.g. missing
 * fallback rates, or one-directional conversion only).
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  fxRate?: number,
): number {
  if (from === to || amount === 0) return amount;
  const rate =
    typeof fxRate === "number" && Number.isFinite(fxRate) && fxRate > 0
      ? fxRate
      : DEFAULT_USD_BRL_RATE;
  if (from === "USD" && to === "BRL") return amount * rate;
  if (from === "BRL" && to === "USD") return amount / rate;
  return amount;
}

/** Multiplier form of {@link convertCurrency} — useful when scaling a rate/percentage rather than an amount. */
export function getFxMultiplier(
  assetCurrency: Currency,
  targetCurrency: Currency,
  fxRate: number = DEFAULT_USD_BRL_RATE,
): number {
  return convertCurrency(1, assetCurrency, targetCurrency, fxRate);
}
