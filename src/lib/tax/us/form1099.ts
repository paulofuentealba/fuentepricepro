import type { Transaction, AccountType } from "@/lib/transactionsLogic";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import type { AssetType } from "@/lib/domain";
import type {
  Us1099DivItem,
  Us1099DivSummary,
  Us1099BSaleLot,
  Us1099BSummary,
  UsTaxYearSummary,
} from "../types";

export interface AssetMetaEntry {
  type?: AssetType;
  name?: string;
  accountType?: AccountType | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const ONE_YEAR_DAYS = 365;

/**
 * Normalizes date input to a Unix timestamp in milliseconds.
 */
function toTimestamp(date: number | string | Date): number {
  if (typeof date === "number") return date;
  if (date instanceof Date) return date.getTime();
  return new Date(date).getTime();
}

/**
 * Computes IRS Form 1099-DIV summary and per-asset line items for a given calendar year.
 * Segregates:
 * - Box 1a: Total ordinary dividends
 * - Box 1b: Qualified dividends (stocks/ETFs held for > 60 days around ex-date)
 * - Box 5: Section 199A dividends (REITs eligible for 20% QBI deduction)
 * - Roth IRA: 100% tax-free shielded earnings
 * - Traditional IRA / 401(k): Tax-deferred earnings
 */
export function computeUs1099Div(
  realizedEvents: RealizedIncomeEvent[],
  transactions: Transaction[] = [],
  assetMetaMap: Record<string, AssetMetaEntry | undefined> = {},
  taxYear: number = new Date().getFullYear(),
): Us1099DivSummary {
  // Sort transactions by date for holding period verification
  const txsByTicker = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const t = tx.ticker.toUpperCase();
    if (!txsByTicker.has(t)) txsByTicker.set(t, []);
    txsByTicker.get(t)!.push(tx);
  }
  for (const list of txsByTicker.values()) {
    list.sort((a, b) => a.date - b.date);
  }

  const itemsMap = new Map<string, Us1099DivItem>();
  let totalOrdinary = 0;
  let totalQualified = 0;
  let totalSection199a = 0;
  let rothIraShielded = 0;
  let traditionalIraDeferred = 0;

  for (const ev of realizedEvents) {
    // Only paid or confirmed events for the target tax year
    const dateStr = ev.paymentDate || ev.exDate;
    if (!dateStr) continue;
    const evYear = parseInt(dateStr.slice(0, 4), 10);
    if (evYear !== taxYear) continue;

    const ticker = ev.ticker.toUpperCase();
    const meta = assetMetaMap[ticker];
    const assetType = meta?.type;
    const accountType: AccountType = meta?.accountType || "taxable";

    const isRoth = accountType === "roth_ira";
    const isTraditional = accountType === "traditional_ira_401k";

    // Gross amount from dividend event
    const gross = ev.amountGross > 0 ? ev.amountGross : ev.amountNet;

    if (isRoth) {
      rothIraShielded += gross;
    } else if (isTraditional) {
      traditionalIraDeferred += gross;
    } else {
      // Taxable account: reportable on Form 1099-DIV
      totalOrdinary += gross;

      // Section 199A check (REITs)
      const isReit = assetType === "REIT";
      let isSection199a = false;
      let isQualified = false;

      if (isReit) {
        // REIT distributions are ordinary dividends eligible for Section 199A deduction
        isSection199a = true;
        totalSection199a += gross;
      } else {
        // Check 60-day holding period rule for Qualified Dividends (IRC § 1(h)(11))
        const exDateTs = new Date(ev.exDate).getTime();
        const txs = txsByTicker.get(ticker) || [];
        // Check if there was an acquisition at least 60 days before ex-date
        const earliestBuy = txs.find((t) => t.type === "buy" && t.date <= exDateTs);
        const holdingMs = earliestBuy ? exDateTs - earliestBuy.date : 0;

        if (holdingMs >= SIXTY_DAYS_MS || txs.length === 0) {
          // If no transactions provided or held >= 60 days, treated as qualified
          isQualified = true;
          totalQualified += gross;
        }
      }

      // Aggregate item
      const key = `${ticker}_${accountType}`;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          ticker,
          payerName: meta?.name || ticker,
          accountType,
          ordinaryDividends: 0,
          qualifiedDividends: 0,
          section199aDividends: 0,
          totalEvents: 0,
          isTaxExempt: false,
          isTaxDeferred: false,
        });
      }
      const item = itemsMap.get(key)!;
      item.ordinaryDividends = Math.round((item.ordinaryDividends + gross) * 100) / 100;
      if (isQualified) {
        item.qualifiedDividends = Math.round((item.qualifiedDividends + gross) * 100) / 100;
      }
      if (isSection199a) {
        item.section199aDividends = Math.round((item.section199aDividends + gross) * 100) / 100;
      }
      item.totalEvents += 1;
    }
  }

  const items = Array.from(itemsMap.values()).sort(
    (a, b) => b.ordinaryDividends - a.ordinaryDividends,
  );

  return {
    year: taxYear,
    totalOrdinaryDividends: Math.round(totalOrdinary * 100) / 100,
    totalQualifiedDividends: Math.round(totalQualified * 100) / 100,
    totalSection199aDividends: Math.round(totalSection199a * 100) / 100,
    totalNonQualifiedOrdinary:
      Math.round(Math.max(0, totalOrdinary - totalQualified) * 100) / 100,
    rothIraDividendsShielded: Math.round(rothIraShielded * 100) / 100,
    traditionalIraDividendsDeferred: Math.round(traditionalIraDeferred * 100) / 100,
    items,
  };
}

/**
 * Computes IRS Form 1099-B & Schedule D capital gains / losses using FIFO matching.
 * Implements:
 * - Short-Term (<= 365 days) vs Long-Term (> 365 days)
 * - Wash Sale detection (IRC § 1091): loss disallowed if identical security purchased within 30 days
 * - Annual $3,000 loss deduction against ordinary income
 * - Roth IRA capital gains shielding
 */
export function computeUs1099B(
  transactions: Transaction[],
  taxYear: number = new Date().getFullYear(),
): Us1099BSummary {
  // Sort all transactions chronologically
  const sortedTxs = [...transactions].sort((a, b) => a.date - b.date);

  // Group by ticker + accountType
  const txsByGroup = new Map<string, Transaction[]>();
  for (const tx of sortedTxs) {
    const acct = tx.accountType || "taxable";
    const groupKey = `${tx.ticker.toUpperCase()}_${acct}`;
    if (!txsByGroup.has(groupKey)) txsByGroup.set(groupKey, []);
    txsByGroup.get(groupKey)!.push(tx);
  }

  const sales: Us1099BSaleLot[] = [];
  let totalProceeds = 0;
  let totalCostBasis = 0;
  let shortTermGains = 0;
  let shortTermLosses = 0;
  let longTermGains = 0;
  let longTermLosses = 0;
  let totalWashDisallowed = 0;
  let rothIraGainsShielded = 0;

  for (const [groupKey, txList] of txsByGroup.entries()) {
    // Buy lots FIFO queue: { id, date, quantityRemaining, pricePerShare, feesPerShare }
    const buyLots: {
      id: string;
      date: number;
      quantityRemaining: number;
      pricePerShare: number;
      feesPerShare: number;
    }[] = [];

    // All buys for wash sale checking
    const allBuys = txList.filter((t) => t.type === "buy");

    for (let i = 0; i < txList.length; i++) {
      const tx = txList[i];

      if (tx.type === "buy") {
        const feesPerShare = tx.quantity > 0 ? (tx.fees || 0) / tx.quantity : 0;
        buyLots.push({
          id: tx.id,
          date: tx.date,
          quantityRemaining: tx.quantity,
          pricePerShare: tx.pricePerShare,
          feesPerShare,
        });
      } else if (tx.type === "corporate_action") {
        const factor = tx.factor || 1;
        if (factor > 0) {
          for (const lot of buyLots) {
            lot.quantityRemaining *= factor;
            lot.pricePerShare /= factor;
            lot.feesPerShare /= factor;
          }
        }
      } else if (tx.type === "sell") {
        const saleYear = new Date(tx.date).getFullYear();
        let qtyToSell = tx.quantity;
        const saleFeesPerShare = tx.quantity > 0 ? (tx.fees || 0) / tx.quantity : 0;

        while (qtyToSell > 0.000001 && buyLots.length > 0) {
          const lot = buyLots[0];
          const qtyFromLot = Math.min(qtyToSell, lot.quantityRemaining);

          lot.quantityRemaining -= qtyFromLot;
          qtyToSell -= qtyFromLot;

          // If sale happened in target taxYear, process lot slice
          if (saleYear === taxYear) {
            const holdingDays = Math.max(
              0,
              Math.round((tx.date - lot.date) / (1000 * 60 * 60 * 24)),
            );
            const isLongTerm = holdingDays > ONE_YEAR_DAYS;
            const term: "SHORT_TERM" | "LONG_TERM" = isLongTerm ? "LONG_TERM" : "SHORT_TERM";

            const proceeds = Math.round((qtyFromLot * tx.pricePerShare - qtyFromLot * saleFeesPerShare) * 100) / 100;
            const costBasis = Math.round((qtyFromLot * lot.pricePerShare + qtyFromLot * lot.feesPerShare) * 100) / 100;
            const rawGain = Math.round((proceeds - costBasis) * 100) / 100;

            const isRoth = tx.accountType === "roth_ira";
            const isTraditional = tx.accountType === "traditional_ira_401k";

            let washSaleLossDisallowed = 0;
            let isWashSale = false;

            // Wash Sale Rule (IRC § 1091):
            // If sold at a loss and purchased replacement shares within 30 days before or 30 days after
            if (rawGain < 0 && !isRoth && !isTraditional) {
              const saleDateTs = tx.date;
              const hasReplacementBuy = allBuys.some((buyTx) => {
                if (buyTx.id === lot.id) return false; // Not the same purchase being sold
                const diff = Math.abs(buyTx.date - saleDateTs);
                return diff <= THIRTY_DAYS_MS && buyTx.date !== saleDateTs;
              });

              if (hasReplacementBuy) {
                isWashSale = true;
                washSaleLossDisallowed = Math.abs(rawGain);
                totalWashDisallowed += washSaleLossDisallowed;
              }
            }

            const gainOrLoss = Math.round((rawGain + washSaleLossDisallowed) * 100) / 100;

            if (isRoth) {
              rothIraGainsShielded += rawGain;
            } else if (!isTraditional) {
              totalProceeds += proceeds;
              totalCostBasis += costBasis;

              if (term === "SHORT_TERM") {
                if (gainOrLoss > 0) shortTermGains += gainOrLoss;
                else shortTermLosses += Math.abs(gainOrLoss);
              } else {
                if (gainOrLoss > 0) longTermGains += gainOrLoss;
                else longTermLosses += Math.abs(gainOrLoss);
              }
            }

            sales.push({
              id: `${tx.id}_lot_${sales.length + 1}`,
              ticker: tx.ticker.toUpperCase(),
              accountType: tx.accountType || "taxable",
              acquisitionDate: lot.date,
              saleDate: tx.date,
              quantity: Math.round(qtyFromLot * 10000) / 10000,
              proceeds,
              costBasis,
              washSaleLossDisallowed,
              gainOrLoss,
              term,
              holdingDays,
              isWashSale,
              isTaxExempt: isRoth,
              isTaxDeferred: isTraditional,
            });
          }

          if (lot.quantityRemaining <= 0.000001) {
            buyLots.shift();
          }
        }
      }
    }
  }

  const netShortTerm = Math.round((shortTermGains - shortTermLosses) * 100) / 100;
  const netLongTerm = Math.round((longTermGains - longTermLosses) * 100) / 100;
  const netTaxableGainOrLoss = Math.round((netShortTerm + netLongTerm) * 100) / 100;

  // IRS rule: capital losses can offset ordinary income up to $3,000/year; excess carries forward
  let deductibleLossAgainstIncome = 0;
  let carryforwardLoss = 0;

  if (netTaxableGainOrLoss < 0) {
    const totalLoss = Math.abs(netTaxableGainOrLoss);
    deductibleLossAgainstIncome = Math.min(3000, totalLoss);
    carryforwardLoss = Math.max(0, totalLoss - 3000);
  }

  return {
    year: taxYear,
    totalProceeds: Math.round(totalProceeds * 100) / 100,
    totalCostBasis: Math.round(totalCostBasis * 100) / 100,
    shortTermGains: Math.round(shortTermGains * 100) / 100,
    shortTermLosses: Math.round(shortTermLosses * 100) / 100,
    netShortTerm,
    longTermGains: Math.round(longTermGains * 100) / 100,
    longTermLosses: Math.round(longTermLosses * 100) / 100,
    netLongTerm,
    totalWashSaleDisallowed: Math.round(totalWashDisallowed * 100) / 100,
    netTaxableGainOrLoss,
    deductibleLossAgainstIncome,
    carryforwardLoss,
    rothIraCapitalGainsShielded: Math.round(rothIraGainsShielded * 100) / 100,
    sales: sales.sort((a, b) => b.saleDate - a.saleDate),
  };
}

/**
 * Builds a consolidated US tax summary for the year combining 1099-DIV and 1099-B.
 */
export function buildUsTaxYearSummary(
  realizedEvents: RealizedIncomeEvent[],
  transactions: Transaction[],
  assetMetaMap: Record<string, AssetMetaEntry | undefined> = {},
  taxYear: number = new Date().getFullYear(),
): UsTaxYearSummary {
  const divSummary = computeUs1099Div(realizedEvents, transactions, assetMetaMap, taxYear);
  const bSummary = computeUs1099B(transactions, taxYear);

  const totalRothTaxFreeIncome = Math.round(
    (divSummary.rothIraDividendsShielded + bSummary.rothIraCapitalGainsShielded) * 100,
  ) / 100;

  const totalTaxDeferredIncome = divSummary.traditionalIraDividendsDeferred;

  // Estimated tax savings inside Roth: 15% estimated average tax rate
  const estimatedTaxSavingsRoth = Math.round(Math.max(0, totalRothTaxFreeIncome) * 0.15 * 100) / 100;

  return {
    year: taxYear,
    divSummary,
    bSummary,
    totalRothTaxFreeIncome,
    totalTaxDeferredIncome,
    estimatedTaxSavingsRoth,
  };
}

/**
 * Formats the Form 1099 summary into a structured CSV string for tax reporting.
 */
export function generate1099Csv(summary: UsTaxYearSummary): string {
  const lines: string[] = [];

  // Header & Metadata
  lines.push(`IRS Form 1099 Report (Tax Year ${summary.year})`);
  lines.push(`Generated by Fuente Price Pro`);
  lines.push("");

  // 1099-DIV Section
  lines.push("FORM 1099-DIV: DIVIDENDS AND DISTRIBUTIONS");
  lines.push("Ticker,Payer Name,Account Type,Box 1a Ordinary ($),Box 1b Qualified ($),Box 5 Section 199A ($)");
  for (const it of summary.divSummary.items) {
    lines.push(
      `"${it.ticker}","${it.payerName || it.ticker}","${it.accountType}",${it.ordinaryDividends.toFixed(2)},${it.qualifiedDividends.toFixed(2)},${it.section199aDividends.toFixed(2)}`,
    );
  }
  lines.push("");
  lines.push(`Total Box 1a Ordinary Dividends: $${summary.divSummary.totalOrdinaryDividends.toFixed(2)}`);
  lines.push(`Total Box 1b Qualified Dividends: $${summary.divSummary.totalQualifiedDividends.toFixed(2)}`);
  lines.push(`Total Box 5 Section 199A Dividends: $${summary.divSummary.totalSection199aDividends.toFixed(2)}`);
  lines.push(`Roth IRA Tax-Free Dividends Shielded: $${summary.divSummary.rothIraDividendsShielded.toFixed(2)}`);
  lines.push("");

  // 1099-B Section
  lines.push("FORM 1099-B: PROCEEDS FROM BROKER TRANSACTIONS");
  lines.push("Ticker,Account,Date Acquired,Date Sold,Box 1d Proceeds ($),Box 1e Cost Basis ($),Box 1g Wash Disallowed ($),Gain/Loss ($),Term");
  for (const s of summary.bSummary.sales) {
    const acqStr = new Date(s.acquisitionDate).toISOString().split("T")[0];
    const saleStr = new Date(s.saleDate).toISOString().split("T")[0];
    lines.push(
      `"${s.ticker}","${s.accountType}",${acqStr},${saleStr},${s.proceeds.toFixed(2)},${s.costBasis.toFixed(2)},${s.washSaleLossDisallowed.toFixed(2)},${s.gainOrLoss.toFixed(2)},${s.term}`,
    );
  }
  lines.push("");
  lines.push(`Net Short-Term Capital Gain/Loss: $${summary.bSummary.netShortTerm.toFixed(2)}`);
  lines.push(`Net Long-Term Capital Gain/Loss: $${summary.bSummary.netLongTerm.toFixed(2)}`);
  lines.push(`Total Wash Sale Loss Disallowed: $${summary.bSummary.totalWashSaleDisallowed.toFixed(2)}`);
  lines.push(`Net Taxable Capital Gain/Loss: $${summary.bSummary.netTaxableGainOrLoss.toFixed(2)}`);
  lines.push(`Roth IRA Capital Gains Shielded: $${summary.bSummary.rothIraCapitalGainsShielded.toFixed(2)}`);

  return lines.join("\n");
}
