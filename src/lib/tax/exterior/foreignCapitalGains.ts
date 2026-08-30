import { getLocalDateISOString } from "@/lib/formatters";
import type { AssetType, Currency } from "@/lib/domain";
import type { RealizedGainEvent, AnnualForeignCapitalGainsResult } from "../types";
import { getEventAssetType, getEventCurrency } from "../utils";

// =========================================================================================
// REGRA FISCAL DE GANHO DE CAPITAL EM ATIVOS NO EXTERIOR (Fundamentação Legal):
// Lei 14.754/2023, em vigor desde 1º/jan/2024 — regime de "aplicações financeiras no exterior".
// 1. Alíquota única de 15% sobre o ganho de capital líquido do ano — SEM faixas progressivas
//    (diferente da tabela de 15%-22,5% aplicável a bens não-financeiros, como imóvel no exterior).
// 2. SEM isenção de pequeno valor: a antiga isenção de R$ 35.000/mês foi extinta para este tipo
//    de ativo a partir de 1º/jan/2024 (confirmado pela Receita Federal).
// 3. Apuração ANUAL, na Declaração de Ajuste Anual — não mensal como ações listadas na B3.
// 4. Compensação de prejuízo: perdas de aplicações financeiras no exterior compensam ganhos de
//    outras aplicações financeiras no exterior apenas DENTRO DO MESMO ano-calendário; o saldo
//    remanescente NÃO é transportado para anos seguintes (sem carryforward).
// 5. Escopo: STOCK_US, REIT (ações e REITs negociados diretamente no exterior) e ETF cuja
//    moeda de negociação é USD (ETFs listados em bolsas americanas, ex.: QQQ, SCHD) — a lei
//    trata ações, REITs e ETFs no exterior uniformemente como "aplicações financeiras no
//    exterior". Um ETF do tipo "ETF" com moeda BRL (listado na B3) permanece fora deste
//    módulo — segue as regras BR (ver `br/etfCapitalGains.ts`).
//    LIMITE DECLARADO: fundos offshore e entidades controladas no exterior permanecem fora
//    do escopo deste módulo — consulte um contador para esses casos.
// =========================================================================================

const FOREIGN_CAPITAL_GAINS_RATE = 0.15;

function isInScope(resolvedType: AssetType, resolvedCurrency: Currency | undefined): boolean {
  if (resolvedType === "STOCK_US" || resolvedType === "REIT") return true;
  if (resolvedType === "ETF" && resolvedCurrency === "USD") return true;
  return false;
}

/**
 * Pure function to calculate annual capital gains tax on foreign-held stocks, REITs, and
 * USD-denominated ETFs (Lei 14.754/2023 / Item 2.1e — ações no exterior).
 *
 * - Groups realized gain events by calendar year (not month).
 * - STOCK_US and REIT are always in scope. ETF is in scope only when its trading currency
 *   (resolved via `currencyByTicker`) is USD — a BRL-denominated ETF is a BR-listed ETF and
 *   is excluded (handled by `br/etfCapitalGains.ts` instead).
 * - Unclassified tickers (missing/unresolvable assetType) are never assumed to be in scope;
 *   they are excluded from the calculation and reported in `unclassifiedTickers`.
 * - No loss carryforward across years: a net loss in one year does not reduce a future year's
 *   taxable gain.
 *
 * @param events List of realized gain events from sell transactions.
 * @param assetTypeByTicker Optional map/dictionary of asset types to filter STOCK_US/REIT/ETF.
 * @param currencyByTicker Optional map/dictionary of trading currency, used to distinguish
 *   USD-denominated (foreign) ETFs from BRL-denominated (BR-listed) ETFs.
 */
export function simulateForeignCapitalGainsTax(
  events: RealizedGainEvent[],
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
  currencyByTicker?: Record<string, Currency | undefined> | Map<string, Currency>,
): AnnualForeignCapitalGainsResult[] {
  if (!events || events.length === 0) {
    return [];
  }

  const eventsByYear = new Map<string, RealizedGainEvent[]>();
  const unclassifiedByYear = new Map<string, Set<string>>();

  for (const ev of events) {
    const yearKey = getLocalDateISOString(ev.saleDate).slice(0, 4);
    if (!yearKey || yearKey.length < 4) continue;

    const resolvedType = getEventAssetType(ev, assetTypeByTicker);

    if (!resolvedType) {
      const unclassifiedSet = unclassifiedByYear.get(yearKey) || new Set<string>();
      unclassifiedSet.add(ev.ticker);
      unclassifiedByYear.set(yearKey, unclassifiedSet);
      continue;
    }

    const resolvedCurrency = getEventCurrency(ev, currencyByTicker);

    if (isInScope(resolvedType, resolvedCurrency)) {
      const list = eventsByYear.get(yearKey) || [];
      list.push(ev);
      eventsByYear.set(yearKey, list);
    }
    // Note: STOCK_BR, FII, FIAGRO, FII_INFRA, FIXED_INCOME, and BRL-denominated ETF are
    // excluded from this module.
  }

  const allYears = new Set<string>([
    ...Array.from(eventsByYear.keys()),
    ...Array.from(unclassifiedByYear.keys()),
  ]);

  if (allYears.size === 0) {
    return [];
  }

  const sortedYears = Array.from(allYears).sort();

  const results: AnnualForeignCapitalGainsResult[] = [];

  for (const year of sortedYears) {
    const yearEvents = eventsByYear.get(year) || [];
    const unclassifiedSet = unclassifiedByYear.get(year);
    const unclassifiedTickers =
      unclassifiedSet && unclassifiedSet.size > 0
        ? Array.from(unclassifiedSet).sort()
        : undefined;

    let totalSales = 0;
    let totalGain = 0;

    for (const ev of yearEvents) {
      totalSales += ev.proceeds;
      totalGain += ev.gain;
    }

    totalSales = Math.round(totalSales * 100) / 100;
    totalGain = Math.round(totalGain * 100) / 100;

    // No carryforward: each year is netted independently, losses never reduce future years.
    const taxableGain = Math.max(0, totalGain);
    const taxDue = Math.round(taxableGain * FOREIGN_CAPITAL_GAINS_RATE * 100) / 100;

    results.push({
      year,
      totalSales,
      totalGain,
      taxableGain,
      taxDue,
      ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
    });
  }

  return results;
}
