import { describe, it, expect } from "vitest";
import { resolveReasonText } from "../resolveReasonText";
import { dict } from "@/lib/i18n";

describe("AskEngine: resolveReasonText helper (Prompt 135)", () => {
  it("interpolates single parameter tokens (e.g. {{yield}})", () => {
    const text = resolveReasonText(dict.ptBR, "askEngine.reasons.highestNetYield", {
      yield: 12.4,
    });
    expect(text).toBe("Maior Dividend Yield líquido (12.4%) entre os ativos elegíveis");
  });

  it("interpolates multiple parameters (e.g. {{classType}}, {{margin}})", () => {
    const text = resolveReasonText(dict.ptBR, "askEngine.reasons.farthestBelowTarget", {
      classType: "STOCK_BR",
      margin: 35.2,
    });
    expect(text).toBe("Classe STOCK_BR com maior desvio da meta (margem 35.2%)");
  });

  it("interpolates 3 parameters (e.g. {{price}}, {{ceiling}}, {{margin}})", () => {
    const text = resolveReasonText(dict.ptBR, "askEngine.reasons.excludedAboveCeiling", {
      price: 45.5,
      ceiling: 38.0,
      margin: -16.5,
    });
    expect(text).toBe("Preço R$ 45.5 acima do teto R$ 38 (margem -16.5%)");
  });

  it("handles consequence token interpolation (e.g. {{value}})", () => {
    const text = resolveReasonText(dict.ptBR, "askEngine.consequences.annualIncomeAdded", {
      value: "150,00",
    });
    expect(text).toBe("Renda anual estimada adicionada: R$ 150,00");
  });

  it("works across all locales (ptBR, en, es)", () => {
    const enText = resolveReasonText(dict.en, "askEngine.reasons.reinforcePayer", {
      ticker: "BBAS3",
    });
    expect(enText).toBe("Direct reinvestment into BBAS3 (dividend payer)");

    const esText = resolveReasonText(dict.es, "askEngine.reasons.reinforcePayer", {
      ticker: "BBAS3",
    });
    expect(esText).toBe("Reinversión directa en BBAS3 (generador de dividendos)");
  });

  describe("Edge cases & graceful fallback", () => {
    it("returns empty string when reasonKey is missing or null", () => {
      expect(resolveReasonText(dict.ptBR, null)).toBe("");
      expect(resolveReasonText(dict.ptBR, undefined)).toBe("");
    });

    it("returns template unchanged when reasonParams is missing, empty, or undefined", () => {
      const text = resolveReasonText(dict.ptBR, "askEngine.reasons.excludedYieldTrap");
      expect(text).toBe("Sinal de armadilha de yield detectado nos indicadores");
    });

    it("falls back to reasonKey string if not found in dictionary", () => {
      const text = resolveReasonText(dict.ptBR, "custom.nonexistent.key", { foo: "bar" });
      expect(text).toBe("custom.nonexistent.key");
    });

    it("leaves unprovided tokens intact or gracefully handles null/undefined values", () => {
      const text = resolveReasonText(dict.ptBR, "askEngine.reasons.farthestBelowTarget", {
        classType: "FII",
        margin: null, // should replace with empty string without crashing
      });
      expect(text).toBe("Classe FII com maior desvio da meta (margem %)");
    });
  });
});
