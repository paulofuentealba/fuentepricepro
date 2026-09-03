import {
  calculateMonthlyCapitalGainsTax,
  calculateFiiCapitalGainsTax,
  calculateEtfCapitalGainsTax,
  calculateFiInfraCapitalGainsTax,
  calculateEtfFixedIncomeCapitalGainsTax,
} from "@/lib/tax";
import { csvEscape } from "@/lib/csv";
import type { TaxRealityContext } from "./buildTaxContext";
import type {
  MonthlyCapitalGainsResult,
  MonthlyFiiCapitalGainsResult,
  MonthlyEtfCapitalGainsResult,
  MonthlyFiInfraCapitalGainsResult,
  MonthlyEtfFixedIncomeCapitalGainsResult,
  AnnualForeignCapitalGainsResult,
} from "./types";

export interface TaxRealityRows {
  stockMonthly: MonthlyCapitalGainsResult[];
  fiiMonthly: MonthlyFiiCapitalGainsResult[];
  etfMonthly: MonthlyEtfCapitalGainsResult[];
  fiInfraMonthly: MonthlyFiInfraCapitalGainsResult[];
  foreignAnnual: AnnualForeignCapitalGainsResult[];
  etfFixedIncomeMonthly: MonthlyEtfFixedIncomeCapitalGainsResult[];
}

/**
 * SSOT for the current-year monthly/annual capital-gains breakdown shown on
 * the Tax Reality screen. Extracted from `TaxRealityScreen` so the CSV export
 * (`tax.tsx`) computes the exact same rows the screen renders, instead of a
 * second, independently-maintained calculation.
 */
export function computeTaxRealityRows(context: TaxRealityContext): TaxRealityRows {
  const {
    assetTypeByTicker,
    currencyByTicker,
    isFixedIncomeEtfByTicker,
    transactions,
    realizedGainEvents,
    currentYear,
    foreignCapitalGainsResults,
  } = context;

  const currentYearStr = String(currentYear);

  const stockMonthly = realizedGainEvents.length
    ? calculateMonthlyCapitalGainsTax(realizedGainEvents, 0, assetTypeByTicker).filter((r) =>
        r.month.startsWith(currentYearStr),
      )
    : [];

  const fiiMonthly = realizedGainEvents.length
    ? calculateFiiCapitalGainsTax(realizedGainEvents, 0, assetTypeByTicker).filter((r) =>
        r.month.startsWith(currentYearStr),
      )
    : [];

  const etfMonthly = realizedGainEvents.length
    ? calculateEtfCapitalGainsTax(realizedGainEvents, 0, assetTypeByTicker, currencyByTicker).filter((r) =>
        r.month.startsWith(currentYearStr),
      )
    : [];

  const fiInfraMonthly = realizedGainEvents.length
    ? calculateFiInfraCapitalGainsTax(realizedGainEvents, 0, assetTypeByTicker).filter((r) =>
        r.month.startsWith(currentYearStr),
      )
    : [];

  const foreignAnnual = foreignCapitalGainsResults.filter((r) => r.year === currentYearStr);

  const etfFixedIncomeMonthly = transactions.length
    ? calculateEtfFixedIncomeCapitalGainsTax(
        transactions,
        0,
        assetTypeByTicker,
        isFixedIncomeEtfByTicker,
      ).filter((r) => r.month.startsWith(currentYearStr))
    : [];

  return { stockMonthly, fiiMonthly, etfMonthly, fiInfraMonthly, foreignAnnual, etfFixedIncomeMonthly };
}

const CSV_HEADER = [
  "Seção",
  "Período",
  "Moeda",
  "Vendas",
  "Ganho/Prejuízo",
  "Isento",
  "Ganho Tributável",
  "Imposto Devido",
  "Prejuízo a Compensar",
];

function detailRow(
  section: string,
  period: string,
  currency: string,
  sales: number,
  gain: number,
  isExempt: string,
  taxableGain: number,
  taxDue: number,
  carryforward: string,
): string {
  return [
    section,
    period,
    currency,
    sales.toFixed(2),
    gain.toFixed(2),
    isExempt,
    taxableGain.toFixed(2),
    taxDue.toFixed(2),
    carryforward,
  ]
    .map(csvEscape)
    .join(",");
}

/**
 * Builds the Tax Reality CSV export — one row per month/year per tax track,
 * using the exact same `rows` the screen renders (see `computeTaxRealityRows`),
 * plus a summary row for net dividends/JCP/US withholding.
 */
export function buildTaxRealityCsv(context: TaxRealityContext, rows: TaxRealityRows): string {
  const lines: string[] = [CSV_HEADER.map(csvEscape).join(",")];

  for (const m of rows.stockMonthly) {
    lines.push(
      detailRow("Ações BR", m.month, "BRL", m.totalSales, m.totalGain, m.isExempt ? "Sim" : "Não", m.taxableGain, m.taxDue, m.lossCarryforwardRemaining.toFixed(2)),
    );
  }
  for (const m of rows.fiiMonthly) {
    lines.push(
      detailRow("FII/FIAGRO", m.month, "BRL", m.totalSales, m.totalGain, "-", m.taxableGain, m.taxDue, m.lossCarryforwardRemaining.toFixed(2)),
    );
  }
  for (const m of rows.etfMonthly) {
    lines.push(
      detailRow("ETF", m.month, "BRL", m.totalSales, m.totalGain, "-", m.taxableGain, m.taxDue, m.lossCarryforwardRemaining.toFixed(2)),
    );
  }
  for (const m of rows.fiInfraMonthly) {
    lines.push(
      detailRow("FI-Infra (isento)", m.month, "BRL", m.totalSales, m.totalGain, "Sim", m.taxableGain, m.taxDue, m.lossCarryforwardRemaining.toFixed(2)),
    );
  }
  for (const m of rows.etfFixedIncomeMonthly) {
    lines.push(
      detailRow("ETF Renda Fixa", m.month, "BRL", m.totalSales, m.totalGain, "-", m.taxableGain, m.taxDue, m.lossCarryforwardRemaining.toFixed(2)),
    );
  }
  for (const r of rows.foreignAnnual) {
    lines.push(
      detailRow("Ações/REITs Exterior", r.year, "USD", r.totalSales, r.totalGain, "-", r.taxableGain, r.taxDue, "-"),
    );
  }

  // Summary row for dividends/JCP/US withholding (not part of the monthly capital-gains tracks above)
  lines.push(
    detailRow(
      "Proventos (resumo anual)",
      String(context.currentYear),
      "BRL",
      0,
      context.totalDividendNet,
      "-",
      0,
      context.totalWithheldTax,
      "-",
    ),
  );

  return lines.join("\n");
}
