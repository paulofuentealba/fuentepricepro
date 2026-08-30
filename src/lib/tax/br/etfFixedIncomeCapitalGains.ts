import { getLocalDateISOString } from "@/lib/formatters";
import type { Transaction } from "@/lib/transactionsLogic";
import type { AssetType } from "@/lib/domain";
import type { LotSaleSlice, MonthlyEtfFixedIncomeCapitalGainsResult } from "../types";

// =========================================================================================
// REGRA FISCAL DE ETFS DE RENDA FIXA (Fundamentação Legal):
// IN RFB 1.585/2015, art. 31 — tabela regressiva de renda fixa, pela qual a alíquota de IR
// depende do PRAZO decorrido entre aquisição e alienação de cada lote de cotas:
//   até 180 dias:        22,5%
//   181 a 360 dias:       20%
//   361 a 720 dias:     17,5%
//   acima de 720 dias:    15%
//
// Diferente do preço médio ponderado usado em ações/FIIs/ETFs de renda variável (que a
// Receita aceita como método de custo), a tabela regressiva exige saber HÁ QUANTO TEMPO cada
// unidade vendida foi comprada. Este módulo replay as transações como uma fila FIFO (PEPS —
// primeiro que entra, primeiro que sai) por ticker, SEPARADA do motor de preço médio ponderado
// usado pelos demais módulos fiscais (`br/capitalGains.ts` via `applyTransactionToHolding`) —
// aquele motor permanece intocado e continua sendo a fonte de verdade para ganho/prejuízo de
// ações, FIIs e ETFs de renda variável, e para o preço médio exibido na carteira.
//
// Compensação de prejuízo: prejuízos de ETFs de Renda Fixa compensam ganhos futuros de ETFs
// de Renda Fixa (trilha própria, não compensa com ações/FIIs/ETFs de ações). O valor
// compensado é em R$ (não por faixa); a alíquota aplicada ao ganho remanescente de cada fatia
// é a da PRÓPRIA fatia (seu prazo), não a do prejuízo que a compensou.
//
// Escopo: apenas tickers com AssetType "ETF" E explicitamente marcados como
// `isFixedIncomeEtf: true` no WatchlistItem (ver `src/lib/watchlist.ts`). Um ETF "ETF" sem
// essa marcação é tratado como ETF de renda variável (ver `br/etfCapitalGains.ts`).
// =========================================================================================

const REGRESSIVE_BRACKETS: { maxDays: number; rate: number }[] = [
  { maxDays: 180, rate: 0.225 },
  { maxDays: 360, rate: 0.2 },
  { maxDays: 720, rate: 0.175 },
  { maxDays: Infinity, rate: 0.15 },
];

function bracketRateForHoldingDays(holdingDays: number): number {
  const bracket = REGRESSIVE_BRACKETS.find((b) => holdingDays <= b.maxDays);
  return bracket ? bracket.rate : REGRESSIVE_BRACKETS[REGRESSIVE_BRACKETS.length - 1].rate;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Lot {
  date: number;
  quantity: number;
  pricePerShare: number;
}

/**
 * Pure function to replay buy/sell transactions as a per-ticker FIFO (PEPS) lot queue,
 * producing one `LotSaleSlice` per (sell transaction × buy lot) match, oldest lot first.
 *
 * Independent from the weighted-average engine (`applyTransactionToHolding`): this exists
 * solely to recover each sold unit's holding period, required by the regressive tax table.
 * `corporate_action` transactions apply their split/grouping `factor` to all open lots for
 * that ticker, preserving each lot's original acquisition date.
 */
export function computeFifoLotSaleSlices(transactions: Transaction[]): LotSaleSlice[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  const lotsByTicker = new Map<string, Lot[]>();
  const slices: LotSaleSlice[] = [];

  for (const tx of sorted) {
    if (tx.type === "buy") {
      const lots = lotsByTicker.get(tx.ticker) || [];
      lots.push({ date: tx.date, quantity: tx.quantity, pricePerShare: tx.pricePerShare });
      lotsByTicker.set(tx.ticker, lots);
    } else if (tx.type === "corporate_action") {
      const lots = lotsByTicker.get(tx.ticker);
      const factor = tx.factor;
      if (lots && typeof factor === "number" && factor > 0) {
        for (const lot of lots) {
          lot.quantity = lot.quantity * factor;
          lot.pricePerShare = lot.pricePerShare / factor;
        }
      }
    } else if (tx.type === "sell") {
      const lots = lotsByTicker.get(tx.ticker) || [];
      const fees = tx.fees || 0;
      const totalProceeds = tx.pricePerShare * tx.quantity - fees;
      let remaining = tx.quantity;

      while (remaining > 1e-9 && lots.length > 0) {
        const lot = lots[0];
        const consumedQty = Math.min(lot.quantity, remaining);
        const proceedsSlice = tx.quantity > 0 ? (consumedQty / tx.quantity) * totalProceeds : 0;
        const costBasisSlice = lot.pricePerShare * consumedQty;
        const gainSlice = proceedsSlice - costBasisSlice;
        const holdingDays = Math.max(0, Math.floor((tx.date - lot.date) / MS_PER_DAY));

        slices.push({
          ticker: tx.ticker,
          saleDate: tx.date,
          acquisitionDate: lot.date,
          quantity: consumedQty,
          proceeds: proceedsSlice,
          costBasis: costBasisSlice,
          gain: gainSlice,
          holdingDays,
        });

        lot.quantity -= consumedQty;
        remaining -= consumedQty;
        if (lot.quantity <= 1e-9) {
          lots.shift();
        }
      }
      lotsByTicker.set(tx.ticker, lots);
    }
  }

  return slices;
}

function resolveInScope(
  ticker: string,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
  isFixedIncomeEtfByTicker?: Record<string, boolean | undefined> | Map<string, boolean>,
): "in-scope" | "unclassified" | "out-of-scope" {
  const resolvedType =
    assetTypeByTicker instanceof Map
      ? assetTypeByTicker.get(ticker)
      : assetTypeByTicker?.[ticker];

  if (!resolvedType) {
    return "unclassified";
  }
  if (resolvedType !== "ETF") {
    return "out-of-scope";
  }

  const isFixedIncome =
    isFixedIncomeEtfByTicker instanceof Map
      ? isFixedIncomeEtfByTicker.get(ticker)
      : isFixedIncomeEtfByTicker?.[ticker];

  return isFixedIncome ? "in-scope" : "out-of-scope";
}

/**
 * Pure function to calculate monthly capital gains tax on Fixed Income ETF sales
 * (IN RFB 1.585/2015, art. 31 — tabela regressiva).
 *
 * - Replays transactions via `computeFifoLotSaleSlices` to recover each sold unit's holding
 *   period, then filters to tickers classified as ETF + `isFixedIncomeEtfByTicker === true`.
 * - Each lot-sale slice is taxed at the bracket rate matching ITS OWN holding period —
 *   `taxDue` is a blended sum, not `taxableGain * one flat rate`.
 * - A single R$ loss carryforward (not bracket-specific) is applied to each slice's gain
 *   before that slice's own rate is applied to the remainder; a slice's own bracket rate is
 *   used regardless of which prior loss financed the offset.
 * - Unclassified tickers (missing/unresolvable assetType) are excluded and reported in
 *   `unclassifiedTickers`. An ETF without `isFixedIncomeEtfByTicker === true` is treated as
 *   equity (out of scope here, not unclassified) — see `br/etfCapitalGains.ts`.
 *
 * @param transactions Raw buy/sell/corporate_action transactions (all tickers).
 * @param priorLossCarryforward Initial accumulated R$ loss carryforward from prior periods.
 * @param assetTypeByTicker Optional map/dictionary of asset types to filter ETFs.
 * @param isFixedIncomeEtfByTicker Optional map/dictionary marking which ETFs are fixed-income.
 */
export function calculateEtfFixedIncomeCapitalGainsTax(
  transactions: Transaction[],
  priorLossCarryforward: number = 0,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
  isFixedIncomeEtfByTicker?: Record<string, boolean | undefined> | Map<string, boolean>,
): MonthlyEtfFixedIncomeCapitalGainsResult[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const allSlices = computeFifoLotSaleSlices(transactions);
  if (allSlices.length === 0) {
    return [];
  }

  const slicesByMonth = new Map<string, LotSaleSlice[]>();
  const unclassifiedByMonth = new Map<string, Set<string>>();

  // Track ticker-level scope resolution once per ticker (stable across slices/months).
  const scopeCache = new Map<string, "in-scope" | "unclassified" | "out-of-scope">();

  for (const slice of allSlices) {
    const monthKey = getLocalDateISOString(slice.saleDate).slice(0, 7);
    if (!monthKey || monthKey.length < 7) continue;

    let scope = scopeCache.get(slice.ticker);
    if (!scope) {
      scope = resolveInScope(slice.ticker, assetTypeByTicker, isFixedIncomeEtfByTicker);
      scopeCache.set(slice.ticker, scope);
    }

    if (scope === "unclassified") {
      const unclassifiedSet = unclassifiedByMonth.get(monthKey) || new Set<string>();
      unclassifiedSet.add(slice.ticker);
      unclassifiedByMonth.set(monthKey, unclassifiedSet);
      continue;
    }

    if (scope === "in-scope") {
      const list = slicesByMonth.get(monthKey) || [];
      list.push(slice);
      slicesByMonth.set(monthKey, list);
    }
    // "out-of-scope": non-ETF or equity ETF — silently excluded (handled by other modules).
  }

  const allMonths = new Set<string>([
    ...Array.from(slicesByMonth.keys()),
    ...Array.from(unclassifiedByMonth.keys()),
  ]);

  if (allMonths.size === 0) {
    return [];
  }

  const sortedMonths = Array.from(allMonths).sort();

  const results: MonthlyEtfFixedIncomeCapitalGainsResult[] = [];
  let currentCarryforward = Math.max(0, priorLossCarryforward);

  for (const month of sortedMonths) {
    const monthSlices = (slicesByMonth.get(month) || []).sort((a, b) => a.saleDate - b.saleDate);
    const unclassifiedSet = unclassifiedByMonth.get(month);
    const unclassifiedTickers =
      unclassifiedSet && unclassifiedSet.size > 0
        ? Array.from(unclassifiedSet).sort()
        : undefined;

    let totalSales = 0;
    let totalGain = 0;
    let taxableGain = 0;
    let taxDue = 0;
    let lossCarryforwardUsed = 0;

    for (const slice of monthSlices) {
      totalSales += slice.proceeds;
      totalGain += slice.gain;

      if (slice.gain <= 0) {
        // Loss: accumulates into the single R$ carryforward, no rate attached.
        currentCarryforward += Math.abs(slice.gain);
        continue;
      }

      let sliceTaxable = slice.gain;
      if (currentCarryforward > 0) {
        const used = Math.min(currentCarryforward, sliceTaxable);
        currentCarryforward -= used;
        sliceTaxable -= used;
        lossCarryforwardUsed += used;
      }

      taxableGain += sliceTaxable;
      taxDue += sliceTaxable * bracketRateForHoldingDays(slice.holdingDays);
    }

    totalSales = Math.round(totalSales * 100) / 100;
    totalGain = Math.round(totalGain * 100) / 100;
    taxableGain = Math.round(taxableGain * 100) / 100;
    taxDue = Math.round(taxDue * 100) / 100;
    lossCarryforwardUsed = Math.round(lossCarryforwardUsed * 100) / 100;
    currentCarryforward = Math.round(currentCarryforward * 100) / 100;

    results.push({
      month,
      totalSales,
      totalGain,
      lossCarryforwardUsed,
      lossCarryforwardRemaining: currentCarryforward,
      taxableGain,
      taxDue,
      ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
    });
  }

  return results;
}
