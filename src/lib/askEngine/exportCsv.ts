import { csvEscape } from "@/lib/csv";
import { resolveDisclaimerText } from "@/lib/disclaimer";
import { resolveReasonText } from "./resolveReasonText";
import type { AskResult } from "./types";

export interface AskCsvMeta {
  questionLabel: string;
  strategyLabel: string;
  generatedAt: string;
}

/**
 * Pure function to build a CSV string from an AskEngine AskResult.
 *
 * Adheres strictly to:
 * 1. Regulatory disclaimer included verbatim in header lines starting with "#".
 * 2. Comma separator, standard numeric values, escaped via `csvEscape`.
 * 3. Human-readable calculation reasons resolved via `resolveReasonText`.
 * 4. Pure function with zero I/O.
 */
export function buildAskResultCsv(
  result: AskResult,
  meta: AskCsvMeta,
  t: any,
): string {
  // 1. Regulatory disclaimer header lines (Prompt 132 SSOT)
  const disclaimerText = resolveDisclaimerText(t, "calculation");
  const disclaimerLines = disclaimerText
    .split("\n")
    .map((line) => `# ${line}`);

  // 2. Metadata lines
  const metaLines = [
    `# Pergunta: ${meta.questionLabel}`,
    `# Estratégia: ${meta.strategyLabel}`,
    `# Data de Geração: ${meta.generatedAt}`,
    `# Sobra em Caixa: ${result.leftover.toFixed(2)}`,
    "#",
  ];

  // 3. Column headers (localized via dict.askCsv)
  const headers = [
    t?.askCsv?.colTicker || "Ticker",
    t?.askCsv?.colOperation || "Operação",
    t?.askCsv?.colQuantity || "Quantidade",
    t?.askCsv?.colRefPrice || "Preço de Referência (não é ordem de compra)",
    t?.askCsv?.colAmount || "Valor Estimado",
    t?.askCsv?.colPercent || "Percentual",
    t?.askCsv?.colReason || "Razão do Cálculo",
    t?.askCsv?.colDate || "Data de Geração",
    t?.askCsv?.colStrategy || "Estratégia Utilizada",
  ];

  // 4. Data rows
  const rows = (result.allocations || []).map((alloc) => {
    const refPrice =
      alloc.quantity > 0 ? (alloc.amountBRL / alloc.quantity).toFixed(2) : "0.00";
    const reasonText = resolveReasonText(t, alloc.reasonKey, alloc.reasonParams);
    const operationLabel = t?.askCsv?.buyOperation || "Compra";

    return [
      alloc.ticker,
      operationLabel,
      alloc.quantity,
      refPrice,
      alloc.amountBRL.toFixed(2),
      `${alloc.percentOfTotal}%`,
      reasonText,
      meta.generatedAt,
      meta.strategyLabel,
    ]
      .map(csvEscape)
      .join(",");
  });

  return [
    ...disclaimerLines,
    ...metaLines,
    "",
    headers.map(csvEscape).join(","),
    ...rows,
  ].join("\n");
}
