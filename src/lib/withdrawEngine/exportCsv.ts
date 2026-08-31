import { csvEscape } from "@/lib/csv";
import { resolveDisclaimerText } from "@/lib/disclaimer";
import { resolveReasonText } from "@/lib/askEngine/resolveReasonText";
import type { WithdrawResult } from "./types";

export interface WithdrawCsvMeta {
  questionLabel: string;
  strategyLabel: string;
  generatedAt: string;
}

/**
 * Pure function to build a CSV string from a WithdrawEngine result — the sell-side counterpart
 * of askEngine's `buildAskResultCsv`. Uses the "tax" disclaimer variant (not "calculation"),
 * matching the prototype's Retirar screen wording ("Simulação tributária, não consultoria
 * fiscal").
 */
export function buildWithdrawResultCsv(result: WithdrawResult, meta: WithdrawCsvMeta, t: any): string {
  const disclaimerText = resolveDisclaimerText(t, "tax");
  const disclaimerLines = disclaimerText.split("\n").map((line) => `# ${line}`);

  const metaLines = [
    `# Pergunta: ${meta.questionLabel}`,
    `# Estratégia: ${meta.strategyLabel}`,
    `# Data de Geração: ${meta.generatedAt}`,
    `# Imposto Estimado (BRL): ${result.totalTaxBRL.toFixed(2)}`,
    `# Ainda Necessário (BRL): ${result.leftoverBRL.toFixed(2)}`,
    "#",
  ];

  const headers = [
    t?.askCsv?.colTicker || "Ticker",
    t?.askCsv?.colOperation || "Operação",
    t?.askCsv?.colQuantity || "Quantidade",
    t?.askCsv?.colRefPrice || "Preço de Referência (não é ordem de venda)",
    t?.askCsv?.colAmount || "Valor Estimado",
    t?.askCsv?.colPercent || "Percentual",
    t?.withdrawCsv?.colTax || "Imposto Estimado",
    t?.askCsv?.colReason || "Razão do Cálculo",
    t?.askCsv?.colDate || "Data de Geração",
    t?.askCsv?.colStrategy || "Estratégia Utilizada",
  ];

  const rows = (result.allocations || []).map((alloc) => {
    const refPrice = alloc.quantity > 0 ? (alloc.amountNative / alloc.quantity).toFixed(2) : "0.00";
    const reasonText = resolveReasonText(t, alloc.reasonKey, alloc.reasonParams);
    const operationLabel = t?.withdrawCsv?.sellOperation || "Venda";

    return [
      alloc.ticker,
      operationLabel,
      alloc.quantity,
      refPrice,
      alloc.amountNative.toFixed(2),
      `${alloc.percentOfTotal}%`,
      alloc.taxBRL.toFixed(2),
      reasonText,
      meta.generatedAt,
      meta.strategyLabel,
    ]
      .map(csvEscape)
      .join(",");
  });

  return [...disclaimerLines, ...metaLines, "", headers.map(csvEscape).join(","), ...rows].join("\n");
}
