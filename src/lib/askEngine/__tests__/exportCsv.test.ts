import { describe, it, expect } from "vitest";
import { buildAskResultCsv } from "../exportCsv";
import { dict } from "@/lib/i18n";
import type { AskResult } from "../types";

describe("AskEngine: exportCsv (Prompt 136 / Item 1.5)", () => {
  const mockResult: AskResult = {
    state: "success",
    allocations: [
      {
        ticker: "BBAS3",
        quantity: 10,
        amountBRL: 285.0,
        percentOfTotal: 70,
        reasonKey: "askEngine.reasons.highestNetYield",
        reasonParams: { yield: 10.5 },
      },
      {
        ticker: "TAEE11",
        quantity: 3,
        amountBRL: 120.0,
        percentOfTotal: 30,
        reasonKey: "askEngine.reasons.farthestBelowTarget",
        reasonParams: { classType: "STOCK_BR", margin: 25.0 },
      },
    ],
    leftover: 15.0,
    excluded: [],
    consequences: [],
  };

  const mockMeta = {
    questionLabel: "Onde alocar seus proventos para acelerar a colheita de dividendos?",
    strategyLabel: "Acelerar Bola de Neve",
    generatedAt: "2026-08-26",
  };

  it("includes the verbatim regulatory disclaimer in header comment lines starting with #", () => {
    const csv = buildAskResultCsv(mockResult, mockMeta, dict.ptBR);
    const lines = csv.split("\n");

    const disclaimerLine = lines.find((l) =>
      l.includes("Sugestão de cálculo, não recomendação de investimento"),
    );
    expect(disclaimerLine).toBeDefined();
    expect(disclaimerLine?.startsWith("# ")).toBe(true);

    // Exact string comparison with dict SSOT
    expect(disclaimerLine?.replace("# ", "")).toBe(
      dict.ptBR.regulatoryDisclaimer.calculation,
    );
  });

  it("contains metadata comments and the exact column headers in order", () => {
    const csv = buildAskResultCsv(mockResult, mockMeta, dict.ptBR);
    const lines = csv.split("\n");

    expect(lines).toContain(`# Pergunta: ${mockMeta.questionLabel}`);
    expect(lines).toContain(`# Estratégia: ${mockMeta.strategyLabel}`);
    expect(lines).toContain(`# Data de Geração: 2026-08-26`);
    expect(lines).toContain(`# Sobra em Caixa: 15.00`);

    const headerLine = lines.find((l) =>
      l.startsWith("Ticker,Operação,Quantidade"),
    );
    expect(headerLine).toBe(
      "Ticker,Operação,Quantidade,Preço de Referência (não é ordem de compra),Valor Estimado,Percentual,Razão do Cálculo,Data de Geração,Estratégia Utilizada",
    );
  });

  it("formats allocations as comma-separated rows with human-readable reason text", () => {
    const csv = buildAskResultCsv(mockResult, mockMeta, dict.ptBR);
    const lines = csv.split("\n");

    const bbasLine = lines.find((l) => l.startsWith("BBAS3,"));
    expect(bbasLine).toBeDefined();
    expect(bbasLine).toBe(
      "BBAS3,Compra,10,28.50,285.00,70%,Maior Dividend Yield líquido (10.5%) entre os ativos elegíveis,2026-08-26,Acelerar Bola de Neve",
    );

    const taeeLine = lines.find((l) => l.startsWith("TAEE11,"));
    expect(taeeLine).toBeDefined();
    expect(taeeLine).toBe(
      "TAEE11,Compra,3,40.00,120.00,30%,Classe STOCK_BR com maior desvio da meta (margem 25%),2026-08-26,Acelerar Bola de Neve",
    );
  });

  it("escapes fields containing commas or quotes correctly via csvEscape", () => {
    const resultWithSpecialChars: AskResult = {
      state: "success",
      allocations: [
        {
          ticker: "SPECIAL,3",
          quantity: 5,
          amountBRL: 100.0,
          percentOfTotal: 100,
          reasonKey: "askEngine.reasons.reinforcePayer",
          reasonParams: { ticker: 'ATV "A"' },
        },
      ],
      leftover: 0,
      excluded: [],
      consequences: [],
    };

    const csv = buildAskResultCsv(resultWithSpecialChars, mockMeta, dict.ptBR);
    const lines = csv.split("\n");
    const row = lines.find((l) => l.includes("SPECIAL,3"));

    expect(row).toBe(
      `"SPECIAL,3",Compra,5,20.00,100.00,100%,"Reinvestimento direto em ATV ""A"" (gerador dos proventos)",2026-08-26,Acelerar Bola de Neve`,
    );
  });

  it("handles empty allocations gracefully without crashing", () => {
    const emptyResult: AskResult = {
      state: "insufficient_funds",
      allocations: [],
      leftover: 50.0,
      excluded: [],
      consequences: [],
    };

    const csv = buildAskResultCsv(emptyResult, mockMeta, dict.ptBR);
    expect(csv).toContain("# Sobra em Caixa: 50.00");
    expect(csv).toContain("Ticker,Operação,Quantidade");
  });
});
