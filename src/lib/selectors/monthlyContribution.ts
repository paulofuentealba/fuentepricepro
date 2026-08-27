import type { Transaction } from "@/lib/transactions";
import type { Currency } from "@/lib/domain";

/**
 * Pure selector: computes the net contribution (buys minus sells, converted
 * to BRL) for the calendar month containing `referenceDate`.
 *
 * This is an approximation of "new capital added this month" — the app has
 * no separate cash/deposit ledger, only asset transactions. Selling one
 * asset and buying another in the same month (portfolio rebalancing) will
 * net out and understate true external contributions. Callers should
 * present this with a caveat (e.g. "based on registered transactions"),
 * never as an exact cash-flow figure.
 *
 * @param transactions All transactions to consider (already filtered to the
 *   relevant user/scope by the caller).
 * @param referenceDate Any timestamp within the target calendar month
 *   (defaults to now).
 * @param convertToBRL Currency conversion function, same signature as the
 *   one already used in `useFIProgress.ts` — injected so this selector
 *   stays pure and doesn't need to fetch the exchange rate itself.
 * @param currencyByTicker Map of ticker -> Currency, since `Transaction`
 *   itself doesn't carry currency (it's a property of the asset, not the
 *   transaction row).
 */
export function getMonthlyNetContribution(
  transactions: Transaction[],
  referenceDate: Date | number = Date.now(),
  convertToBRL: (value: number, currency: Currency) => number = (v) => v,
  currencyByTicker: Record<string, Currency> = {},
): number {
  const ref = typeof referenceDate === "number" ? new Date(referenceDate) : referenceDate;
  const refYear = ref.getFullYear();
  const refMonth = ref.getMonth();

  let net = 0;

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate.getFullYear() !== refYear || txDate.getMonth() !== refMonth) continue;

    const currency = currencyByTicker[tx.ticker] ?? "BRL";
    const amount = convertToBRL(tx.quantity * tx.pricePerShare, currency);

    if (tx.type === "buy") {
      net += amount;
    } else if (tx.type === "sell") {
      net -= amount;
    }
  }

  return net;
}

/**
 * Pure selector: same net-contribution logic as `getMonthlyNetContribution`, but over an
 * arbitrary `[windowStart, windowEnd]` timestamp range instead of a single calendar month.
 * Used to approximate "capital added in the last 12 months" for the idle-dividends insight —
 * same fungibility caveat applies (buys aren't provably funded by any specific dividend).
 */
export function getNetContributionInWindow(
  transactions: Transaction[],
  windowStart: number,
  windowEnd: number = Date.now(),
  convertToBRL: (value: number, currency: Currency) => number = (v) => v,
  currencyByTicker: Record<string, Currency> = {},
): number {
  let net = 0;

  for (const tx of transactions) {
    if (tx.date < windowStart || tx.date > windowEnd) continue;

    const currency = currencyByTicker[tx.ticker] ?? "BRL";
    const amount = convertToBRL(tx.quantity * tx.pricePerShare, currency);

    if (tx.type === "buy") {
      net += amount;
    } else if (tx.type === "sell") {
      net -= amount;
    }
  }

  return net;
}
