// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ValuationAssumptionsModal } from "../ValuationAssumptionsModal";
import type { ValuationResult } from "@/lib/calculations";

// Mock i18n
vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      valuationAssumptions: {
        title: "Premissas de Valuation",
        subtitle: "Parâmetros institucionais",
        simpleMode: "Modo Simples",
        advancedMode: "Modo Avançado",
        viewAssumptions: "Ver premissas",
        confidence: "Confiabilidade dos dados",
        confidenceLevel4: "Máxima (Auditado CVM)",
        confidenceLevel3: "Alta",
        confidenceLevel2: "Moderada",
        confidenceLevel1: "Básica",
        resetDefaults: "Restaurar padrões",
        close: "Fechar",
        consensusLabel: "Fuente Consensus:",
        activeCeilingLabel: "Preço Teto Ativo:",
        safetyMarginLabel: "Margem de Segurança:",
        auditDisclaimer:
          "Cálculos sincronizados com bases auditadas (CVM / SEC EDGAR / BACEN SGS).",
      },
    },
  }),
}));

describe("ValuationAssumptionsModal", () => {
  const mockValuation: ValuationResult = {
    ticker: "BBSE3",
    activeCeiling: 45.0,
    margin: 15.5,
    fuenteConsensus: 45.0,
    methods: {
      bazin: 50.0,
      graham: 40.0,
      gordon: 45.0,
      lynch: null,
    },
    assumptions: [
      {
        key: "targetYield",
        label: "Retorno anual exigido em dividendos",
        helperText: "Yield mínimo anual sobre preço de compra",
        value: 6.0,
        isCustomized: false,
        suggestedRange: { min: 4, max: 12 },
        confidenceBadge: 4,
      },
      {
        key: "discountRate",
        label: "Taxa Selic meta",
        helperText: "Custo de oportunidade soberano",
        value: 10.5,
        isCustomized: false,
        suggestedRange: { min: 8, max: 15 },
        confidenceBadge: 4,
      },
    ],
    investorProfile: "moderate",
    bazin: 50.0,
    graham: 40.0,
    gordon: 45.0,
    lynch: null,
    gordonConfidence: "high",
    consensus: 45.0,
    dividendYield: 7.5,
    positive: true,
    isUnavailable: false,
    yieldTrapWarning: null,
    shareholderYield: null,
  };

  it("renders Simple Mode by default with canonical BRL currency and active ceiling", () => {
    render(
      <ValuationAssumptionsModal
        isOpen={true}
        onClose={() => {}}
        ticker="BBSE3"
        currency="BRL"
        valuation={mockValuation}
      />
    );

    expect(screen.getByText(/Premissas de Valuation — BBSE3/i)).toBeTruthy();
    expect(screen.getByText(/Fuente Consensus:/i)).toBeTruthy();
    expect(screen.getAllByText("R$ 45,00").length).toBeGreaterThan(0);
    expect(screen.getByText("+15,5%")).toBeTruthy();
    expect(
      screen.getByText("Cálculos sincronizados com bases auditadas (CVM / SEC EDGAR / BACEN SGS).")
    ).toBeTruthy();
  });

  it("renders canonical USD currency formatting when currency is USD", () => {
    render(
      <ValuationAssumptionsModal
        isOpen={true}
        onClose={() => {}}
        ticker="KO"
        currency="USD"
        valuation={mockValuation}
      />
    );

    expect(screen.getAllByText("US$ 45.00").length).toBeGreaterThan(0);
  });
});

