import { describe, it, expect } from "vitest";
import {
  applyCorporateEvent,
  getHoldingAcquisitionDate,
  type AssetPosition,
  type CorporateEventPayload,
} from "../corporateEvents";

describe("Corporate Events Engine", () => {
  it("should multiply asset quantity by 4 and divide average price by 4 during a 1:4 split", () => {
    const position: AssetPosition = { ticker: "WEGE3", quantity: 100, averagePrice: 40.0 };
    const event: CorporateEventPayload = { type: "split", factor: 4 };

    const result = applyCorporateEvent(position, event);

    expect(result.quantity).toBe(400);
    expect(result.averagePrice).toBe(10.0);
  });

  it("should ensure Total Invested Capital remains exactly equal before and after a split", () => {
    const position: AssetPosition = { ticker: "PETR4", quantity: 250, averagePrice: 32.5 };
    const initialCapital = position.quantity * position.averagePrice; // 8125

    // Simulate an unusual 1:3 split
    const event: CorporateEventPayload = { type: "split", factor: 3 };
    const result = applyCorporateEvent(position, event);

    const finalCapital = result.quantity * result.averagePrice;

    // Allow for small floating point variations
    expect(finalCapital).toBeCloseTo(initialCapital, 4);
    expect(result.quantity).toBe(750);
  });

  it("should correctly handle fractional shares resulting from groupings (Inplit)", () => {
    const position: AssetPosition = { ticker: "OIBR3", quantity: 15, averagePrice: 2.0 }; // Capital: $30

    // 10:1 grouping (1 new share for every 10 old shares)
    // 15 old shares -> 1.5 new shares.
    // Liquidated fraction: 0.5 shares. Whole shares: 1.
    const event: CorporateEventPayload = { type: "grouping", factor: 0.1 };

    // Liquidation defaults to the new average price (which would be $20.00)
    const result = applyCorporateEvent(position, event, true);

    expect(result.quantity).toBe(1); // 1 whole share
    expect(result.averagePrice).toBe(20.0); // 2.00 / 0.1
    expect(result.fractionalCash).toBe(10.0); // 0.5 fractional * $20.00

    // Ensure conservation of value (Value of shares + Cash == Initial Capital)
    const finalCapitalAndCash =
      result.quantity * result.averagePrice + (result.fractionalCash || 0);
    const initialCapital = position.quantity * position.averagePrice;

    expect(finalCapitalAndCash).toBeCloseTo(initialCapital, 4);
  });

  it("should calculate fractional cash using current market price when grouping fractionals", () => {
    const position: AssetPosition = { ticker: "OIBR3", quantity: 15, averagePrice: 2.0 }; // Avg price = 2, Capital = 30
    const event: CorporateEventPayload = { type: "grouping", factor: 0.1 };

    // Let's say market price skyrocketed to $5.00 before grouping (so new market price is $50.00)
    const marketPriceAfterGrouping = 50.0;
    const result = applyCorporateEvent(position, event, true, marketPriceAfterGrouping);

    expect(result.quantity).toBe(1);
    expect(result.averagePrice).toBe(20.0); // Internal accounting average price stays the same mathematically
    expect(result.fractionalCash).toBe(25.0); // 0.5 fractional * $50.00 market price
  });
});

describe("getHoldingAcquisitionDate — Data Canônica de Aquisição do Ativo", () => {
  it("extrai a data da primeira compra no ledger quando há transações para o ticker", () => {
    const transactions = [
      { ticker: "MGLU3", type: "buy", quantity: 100, date: 1735689600000 }, // 2025-01-01
      { ticker: "MGLU3", type: "buy", quantity: 50, date: 1740787200000 },  // 2025-03-01
      { ticker: "PETR4", type: "buy", quantity: 200, date: 1704067200000 }, // 2024-01-01
    ];
    const item = { investingSince: 1740787200000, addedAt: 1740787200000 };

    const acqDate = getHoldingAcquisitionDate(item as any, transactions, "MGLU3");
    expect(acqDate).toBe(1735689600000); // 2025-01-01 (menor data de compra de MGLU3)
  });

  it("retorna investingSince quando não há transações para o ticker", () => {
    const item = { investingSince: 1735689600000, addedAt: 1740787200000 };
    const acqDate = getHoldingAcquisitionDate(item as any, [], "MGLU3");
    expect(acqDate).toBe(1735689600000);
  });

  it("retorna addedAt como fallback quando investingSince não está definido", () => {
    const item = { addedAt: 1735689600000 };
    const acqDate = getHoldingAcquisitionDate(item as any, [], "MGLU3");
    expect(acqDate).toBe(1735689600000);
  });

  it("retorna 0 quando nenhum parâmetro é fornecido", () => {
    expect(getHoldingAcquisitionDate(null, [], "MGLU3")).toBe(0);
  });

  it("descarta evento corporativo ocorrido em 2024 quando o ativo foi adquirido em 2025", () => {
    // Usuário comprou MGLU3 em 15/01/2025
    const acquisitionDate = new Date("2025-01-15T12:00:00Z").getTime();
    const item = {
      ticker: "MGLU3",
      investingSince: acquisitionDate,
      addedAt: acquisitionDate,
    };

    // MGLU3 teve grupamento em 24/05/2024
    const event2024 = {
      eventId: "mglu3_20240524_grouping_0.1",
      ticker: "MGLU3",
      type: "grouping" as const,
      ratio: 0.1,
      date: new Date("2024-05-24T00:00:00Z").getTime(),
    };

    const holdingAcqDate = getHoldingAcquisitionDate(item as any, [], "MGLU3");
    expect(holdingAcqDate).toBe(acquisitionDate);

    // O evento de 2024 aconteceu ANTES da compra em 2025 -> NÃO é elegível
    const isApplicable = holdingAcqDate === 0 || event2024.date >= holdingAcqDate;
    expect(isApplicable).toBe(false);
  });

  it("aceita evento corporativo ocorrido após a data de aquisição do ativo", () => {
    // Usuário comprou WEGE3 em 10/01/2023
    const acquisitionDate = new Date("2023-01-10T12:00:00Z").getTime();
    const item = {
      ticker: "WEGE3",
      investingSince: acquisitionDate,
      addedAt: acquisitionDate,
    };

    // WEGE3 teve desdobramento em 20/06/2024
    const event2024 = {
      eventId: "wege3_20240620_split_2",
      ticker: "WEGE3",
      type: "split" as const,
      ratio: 2,
      date: new Date("2024-06-20T00:00:00Z").getTime(),
    };

    const holdingAcqDate = getHoldingAcquisitionDate(item as any, [], "WEGE3");

    // O evento de 2024 aconteceu DEPOIS da compra de 2023 -> É elegível
    const isApplicable = holdingAcqDate === 0 || event2024.date >= holdingAcqDate;
    expect(isApplicable).toBe(true);
  });
});
