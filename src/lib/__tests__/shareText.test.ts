import { describe, it, expect } from "vitest";
import { buildResultShareText } from "../resultCard";
import { buildAssetShareText } from "@/components/ceiling/watchlist/assetCard/useAssetCardDerived";
import type { WatchlistItem } from "../watchlist";

describe("buildResultShareText i18n", () => {
  it("formats share text in Portuguese (ptBR)", () => {
    const text = buildResultShareText("PETR4", 45.5, "BRL", 12.5, "ptBR");
    expect(text).toContain("Acabei de analisar PETR4 no Fuente Price Pro! 🚀");
    expect(text).toContain("Preço Teto: R$ 45,50");
    expect(text).toContain("YoC Projetado: 12,50%");
    expect(text).toContain("https://fuentepricepro.com");
  });

  it("formats share text in English (en)", () => {
    const text = buildResultShareText("AAPL", 220.0, "USD", 3.25, "en");
    expect(text).toContain("Just analyzed AAPL on Fuente Price Pro! 🚀");
    expect(text).toContain("Ceiling Price: US$ 220.00");
    expect(text).toContain("Projected YoC: 3.25%");
    expect(text).toContain("https://fuentepricepro.com");
  });

  it("formats share text in Spanish (es)", () => {
    const text = buildResultShareText("SAN", 5.0, "USD", 6.8, "es");
    expect(text).toContain("¡Acabo de analizar SAN en Fuente Price Pro! 🚀");
    expect(text).toContain("Precio Techo: US$ 5.00");
    expect(text).toMatch(/YoC Proyectado:\s*6,80\s*%/);
    expect(text).toContain("https://fuentepricepro.com");
  });

  it("handles null yoc gracefully", () => {
    const text = buildResultShareText("VALE3", 60.0, "BRL", null, "ptBR");
    expect(text).toContain("YoC Projetado: —");
  });
});

describe("buildAssetShareText i18n", () => {
  const mockItem = {
    id: "stock_br:bbas3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 28.0,
    ceilingPrice: 35.0,
    safetyMargin: 25.0,
    targetYield: 8.0,
    annualDividend: 2.8,
    quantity: 100,
    averagePrice: 25.0,
    paymentMonths: [],
    payoutRatio: 40,
    addedAt: 123456789,
    investingSince: 1704067200000,
  } as WatchlistItem;

  it("formats asset share text for ptBR", () => {
    const text = buildAssetShareText(mockItem, 10.0, "ptBR");
    expect(text).toContain("Acabei de analisar BBAS3 no Fuente Price Pro! 🚀");
    expect(text).toContain("Preço Teto: R$ 35,00");
    expect(text).toContain("YoC Projetado: 10,00%");
  });

  it("formats asset share text for en", () => {
    const text = buildAssetShareText(mockItem, 10.0, "en");
    expect(text).toContain("Just analyzed BBAS3 on Fuente Price Pro! 🚀");
    expect(text).toContain("Ceiling Price: R$ 35,00");
    expect(text).toContain("Projected YoC: 10.00%");
  });

  it("formats asset share text for es", () => {
    const text = buildAssetShareText(mockItem, 10.0, "es");
    expect(text).toContain("¡Acabo de analizar BBAS3 en Fuente Price Pro! 🚀");
    expect(text).toContain("Precio Techo: R$ 35,00");
    expect(text).toMatch(/YoC Proyectado:\s*10,00\s*%/);
  });
});
