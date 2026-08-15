import { describe, it, expect } from "vitest";
import { valuateFundoImobiliario, getAssetValuation } from "../calculations";

describe("valuateFundoImobiliario - FIIs, Fi-Infra e Fi-Agro Especializados", () => {
  it("should evaluate FII de Tijolo (HGLG11) with Bazin NTN-B spread and Gordon inflacionário, without Graham", () => {
    const result = valuateFundoImobiliario({
      ticker: "HGLG11",
      type: "FII",
      targetYield: 0, // auto-calibrated from NTN-B + spread
      currentPrice: 160.0,
      avgDividend: 13.2,
      bvps: 155.0,
      selicPct: 10.5,
      terminalGrowthRate: 0.045,
      currency: "BRL",
    });

    // 1. Graham is strictly forbidden and must be null
    expect(result.methods.graham).toBeNull();
    expect(result.graham).toBeNull();

    // 2. Bazin spread should produce positive ceiling
    expect(result.methods.bazin).toBeGreaterThan(120);

    // 3. P/VP asset ceiling = 155.0 * 1.02 = 158.10
    expect(result.assumptions.find((a) => a.key === "pvpMaxFair")?.confidenceBadge).toBe(4);

    // 4. Fuente Consensus must be positive
    expect(result.fuenteConsensus).toBeGreaterThan(0);
    expect(result.assumptions).toHaveLength(4);
  });

  it("should evaluate Fi-Infra (JURO11) with 2.0% spread range and tax exemption", () => {
    const result = valuateFundoImobiliario({
      ticker: "JURO11",
      type: "FII_INFRA",
      targetYield: 0,
      currentPrice: 102.0,
      avgDividend: 11.5,
      bvps: 100.0,
      selicPct: 10.5,
      currency: "BRL",
    });

    expect(result.methods.graham).toBeNull();
    const spreadAssumption = result.assumptions.find((a) => a.key === "ntnBSpread");
    expect(spreadAssumption?.value).toBe(2.0);
    expect(spreadAssumption?.suggestedRange).toEqual({ min: 1.5, max: 2.5 });
  });

  it("should evaluate Fi-Agro (KNCA11) with 3.0% agro-credit spread range", () => {
    const result = valuateFundoImobiliario({
      ticker: "KNCA11",
      type: "FIAGRO",
      targetYield: 0,
      currentPrice: 98.0,
      avgDividend: 12.0,
      bvps: 101.5,
      selicPct: 10.5,
      currency: "BRL",
    });

    expect(result.methods.graham).toBeNull();
    const spreadAssumption = result.assumptions.find((a) => a.key === "ntnBSpread");
    expect(spreadAssumption?.value).toBe(3.0);
    expect(spreadAssumption?.suggestedRange).toEqual({ min: 2.5, max: 4.0 });
  });

  it("should be called via getAssetValuation dispatcher for FII, FII_INFRA and FIAGRO", () => {
    const resFII = getAssetValuation({
      ticker: "KNIP11",
      type: "FII",
      targetYield: 8.5,
      currentPrice: 95.0,
      avgDividend: 9.8,
      bvps: 96.0,
      currency: "BRL",
    });
    expect(resFII.methods.graham).toBeNull();
    expect(resFII.assumptions).toHaveLength(4);

    const resInfra = getAssetValuation({
      ticker: "IFRA11",
      type: "FII_INFRA",
      targetYield: 8.0,
      currentPrice: 100.0,
      avgDividend: 10.0,
      bvps: 100.0,
      currency: "BRL",
    });
    expect(resInfra.methods.graham).toBeNull();
  });
});
