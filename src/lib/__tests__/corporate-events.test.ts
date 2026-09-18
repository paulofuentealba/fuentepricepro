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

import { calculateCorporateEventImpact } from "../corporateEvents";
import type { WatchlistItem } from "../watchlist";
import type { Transaction } from "../transactionsLogic";

describe("calculateCorporateEventImpact — Aplicação Cronológica sobre Cotas Existentes na Data", () => {
  const baseItem: WatchlistItem = {
    id: "stock:VALE3",
    ticker: "VALE3",
    name: "Vale S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 60.0,
    annualDividend: 4.0,
    targetYield: 6.0,
    ceilingPrice: 66.66,
    safetyMargin: 11.1,
    quantity: 150,
    averagePrice: 17.33,
    paymentMonths: [3, 9],
    payoutRatio: 50,
    addedAt: 1672531200000,
    investingSince: 1672531200000,
  };

  it("aplica o desdobramento apenas nas cotas adquiridas até a data do evento (cenário do usuário)", () => {
    // 01/01/2023: Compra de 100 cotas a R$ 20 (Custo: 2000)
    const datePre = new Date("2023-01-01T12:00:00Z").getTime();
    // 25/05/2023: Desdobramento 1:2 (fator 2)
    const dateEvent = new Date("2023-05-25T12:00:00Z").getTime();
    // 30/05/2023: Compra de 50 cotas a R$ 12 (Custo: 600, já pós-desdobramento)
    const datePost = new Date("2023-05-30T12:00:00Z").getTime();

    const transactions: Transaction[] = [
      { id: "tx1", ticker: "VALE3", type: "buy", date: datePre, quantity: 100, pricePerShare: 20 },
      { id: "tx2", ticker: "VALE3", type: "buy", date: datePost, quantity: 50, pricePerShare: 12 },
    ];

    const impact = calculateCorporateEventImpact(
      baseItem,
      { date: dateEvent, type: "split", factor: 2 },
      transactions,
    );

    expect(impact.isApplicable).toBe(true);
    // Na data do evento (25/05), existiam apenas as 100 cotas da tx1
    expect(impact.eligibleQuantity).toBe(100);
    // Quantidade total pré-evento: 100 + 50 = 150 cotas
    expect(impact.currentQuantity).toBe(150);
    // As 100 cotas dobram para 200; as 50 cotas pós-evento permanecem 50 -> Total: 250 cotas
    expect(impact.newQuantity).toBe(250);
    expect(impact.deltaQuantity).toBe(100);
    // Custo total: (100 * 20) + (50 * 12) = 2000 + 600 = 2600. Novo PM: 2600 / 250 = 10.40
    expect(impact.newAveragePrice).toBeCloseTo(10.4, 2);
    expect(impact.preview.quantity).toBe(250);
    expect(impact.preview.averagePrice).toBeCloseTo(10.4, 2);
  });

  it("aplica o grupamento apenas nas cotas adquiridas até a data do evento", () => {
    // 01/01/2023: Compra de 100 cotas a R$ 2 (Custo: 200)
    const datePre = new Date("2023-01-01T12:00:00Z").getTime();
    // 25/05/2023: Grupamento 10:1 (fator 0.1)
    const dateEvent = new Date("2023-05-25T12:00:00Z").getTime();
    // 30/05/2023: Compra de 15 cotas a R$ 22 (Custo: 330)
    const datePost = new Date("2023-05-30T12:00:00Z").getTime();

    const transactions: Transaction[] = [
      { id: "tx1", ticker: "VALE3", type: "buy", date: datePre, quantity: 100, pricePerShare: 2 },
      { id: "tx2", ticker: "VALE3", type: "buy", date: datePost, quantity: 15, pricePerShare: 22 },
    ];

    const impact = calculateCorporateEventImpact(
      baseItem,
      { date: dateEvent, type: "grouping", factor: 0.1 },
      transactions,
    );

    expect(impact.isApplicable).toBe(true);
    expect(impact.eligibleQuantity).toBe(100);
    expect(impact.currentQuantity).toBe(115);
    // 100 cotas agrupadas 10:1 viram 10 cotas. Mais 15 pós-evento = 25 cotas
    expect(impact.newQuantity).toBe(25);
    expect(impact.deltaQuantity).toBe(-90);
    // Custo total: 200 + 330 = 530. Novo PM: 530 / 25 = 21.20
    expect(impact.newAveragePrice).toBeCloseTo(21.2, 2);
  });

  it("retorna isApplicable: false quando todas as cotas foram adquiridas após a data do evento", () => {
    const dateEvent = new Date("2023-05-25T12:00:00Z").getTime();
    const datePost = new Date("2023-05-30T12:00:00Z").getTime();

    const transactions: Transaction[] = [
      { id: "tx1", ticker: "VALE3", type: "buy", date: datePost, quantity: 50, pricePerShare: 12 },
    ];

    const impact = calculateCorporateEventImpact(
      baseItem,
      { date: dateEvent, type: "split", factor: 2 },
      transactions,
    );

    expect(impact.isApplicable).toBe(false);
    expect(impact.eligibleQuantity).toBe(0);
    expect(impact.deltaQuantity).toBe(0);
  });

  it("retorna isApplicable: false se a posição foi totalmente liquidada antes do evento", () => {
    const dateBuy = new Date("2023-01-01T12:00:00Z").getTime();
    const dateSell = new Date("2023-05-10T12:00:00Z").getTime();
    const dateEvent = new Date("2023-05-25T12:00:00Z").getTime();
    const dateRebuy = new Date("2023-05-30T12:00:00Z").getTime();

    const transactions: Transaction[] = [
      { id: "tx1", ticker: "VALE3", type: "buy", date: dateBuy, quantity: 100, pricePerShare: 20 },
      { id: "tx2", ticker: "VALE3", type: "sell", date: dateSell, quantity: 100, pricePerShare: 25 },
      { id: "tx3", ticker: "VALE3", type: "buy", date: dateRebuy, quantity: 50, pricePerShare: 12 },
    ];

    const impact = calculateCorporateEventImpact(
      baseItem,
      { date: dateEvent, type: "split", factor: 2 },
      transactions,
    );

    // Em 25/05/2023, o investidor possuía 0 cotas (tinha vendido tudo em 10/05)
    expect(impact.isApplicable).toBe(false);
    expect(impact.eligibleQuantity).toBe(0);
  });

  it("aplica sobre a quantidade manual quando o ativo não possui ledger de transações", () => {
    const datePre = new Date("2023-01-01T12:00:00Z").getTime();
    const dateEvent = new Date("2023-05-25T12:00:00Z").getTime();

    const manualItem: WatchlistItem = {
      ...baseItem,
      quantity: 100,
      averagePrice: 20,
      investingSince: datePre,
    };

    const impact = calculateCorporateEventImpact(
      manualItem,
      { date: dateEvent, type: "split", factor: 2 },
      [],
    );

    expect(impact.isApplicable).toBe(true);
    expect(impact.newQuantity).toBe(200);
    expect(impact.newAveragePrice).toBe(10);
  });

  it("garante custódia 100% inteira em FIIs (ex: HGLG11) em desdobramento 1:10", () => {
    const datePre = new Date("2023-01-10T12:00:00Z").getTime();
    const dateEvent = new Date("2023-06-01T12:00:00Z").getTime();

    const fiiItem: WatchlistItem = {
      ...baseItem,
      id: "fii:HGLG11",
      ticker: "HGLG11",
      name: "CSHG Logística",
      type: "FII",
      quantity: 15,
      averagePrice: 160.0,
      currentPrice: 160.0,
    };

    const transactions: Transaction[] = [
      { id: "fii-tx1", ticker: "HGLG11", type: "buy", date: datePre, quantity: 15, pricePerShare: 160.0 },
    ];

    const impact = calculateCorporateEventImpact(
      fiiItem,
      { date: dateEvent, type: "split", factor: 10 },
      transactions,
    );

    expect(impact.isApplicable).toBe(true);
    expect(impact.eligibleQuantity).toBe(15);
    // 15 cotas multiplicam por 10 = 150 cotas inteiras
    expect(impact.newQuantity).toBe(150);
    expect(Number.isInteger(impact.newQuantity)).toBe(true);
    // Preço médio divide por 10 = 16.00
    expect(impact.newAveragePrice).toBe(16.0);
    expect(impact.fractionalShares).toBeUndefined();
  });

  it("calcula Leilão de Frações em grupamento na B3 para Ações (232 cotas em grupamento 10:1)", () => {
    const datePre = new Date("2023-01-10T12:00:00Z").getTime();
    const dateEvent = new Date("2023-06-01T12:00:00Z").getTime();

    const item: WatchlistItem = {
      ...baseItem,
      ticker: "MGLU3",
      quantity: 232,
      averagePrice: 2.5,
      currentPrice: 2.5,
    };

    const transactions: Transaction[] = [
      { id: "tx1", ticker: "MGLU3", type: "buy", date: datePre, quantity: 232, pricePerShare: 2.5 },
    ];

    const impact = calculateCorporateEventImpact(
      item,
      { date: dateEvent, type: "grouping", factor: 0.1 },
      transactions,
      25.0, // Preço de mercado pós-grupamento: R$ 25,00
    );

    expect(impact.isApplicable).toBe(true);
    expect(impact.eligibleQuantity).toBe(232);
    // 232 cotas agrupadas 10:1 -> 23 cotas inteiras mantidas
    expect(impact.newQuantity).toBe(23);
    expect(Number.isInteger(impact.newQuantity)).toBe(true);
    // Sobras para Leilão de Frações: 0.2 cota (equivalente a 2 cotas originais)
    expect(impact.fractionalShares).toBe(0.2);
    // Crédito estimado no leilão: 0.2 * R$ 25 = R$ 5,00
    expect(impact.fractionalCashEstimate).toBe(5.0);
    // Preço médio ajustado: 2.5 / 0.1 = 25.0
    expect(impact.newAveragePrice).toBe(25.0);
  });

  it("calcula Leilão de Frações em FIIs na B3 (45 cotas em grupamento 10:1)", () => {
    const datePre = new Date("2023-01-10T12:00:00Z").getTime();
    const dateEvent = new Date("2023-06-01T12:00:00Z").getTime();

    const fiiItem: WatchlistItem = {
      ...baseItem,
      id: "fii:XPCM11",
      ticker: "XPCM11",
      name: "XP Corporate Macaé",
      type: "FII",
      quantity: 45,
      averagePrice: 10.0,
      currentPrice: 10.0,
    };

    const transactions: Transaction[] = [
      { id: "fii-tx1", ticker: "XPCM11", type: "buy", date: datePre, quantity: 45, pricePerShare: 10.0 },
    ];

    const impact = calculateCorporateEventImpact(
      fiiItem,
      { date: dateEvent, type: "grouping", factor: 0.1 },
      transactions,
      100.0,
    );

    expect(impact.isApplicable).toBe(true);
    expect(impact.eligibleQuantity).toBe(45);
    // 45 cotas agrupadas 10:1 -> 4 cotas mantidas
    expect(impact.newQuantity).toBe(4);
    expect(Number.isInteger(impact.newQuantity)).toBe(true);
    // Sobras para leilão: 0.5 cota
    expect(impact.fractionalShares).toBe(0.5);
    // 0.5 * 100 = R$ 50,00 estimado
    expect(impact.fractionalCashEstimate).toBe(50.0);
  });

  it("inclui compras realizadas no mesmo dia da Data-Com mesmo com horários diurnos", () => {
    // Data-Com: 2023-05-25 (evento registrado como 2023-05-25T00:00:00Z)
    const dateEvent = new Date("2023-05-25T00:00:00Z").getTime();
    // Compra realizada às 15:30 da Data-Com (timestamp maior que 00:00:00)
    const dateTradeDataCom = new Date("2023-05-25T15:30:00Z").getTime();
    // Compra realizada no dia seguinte (Data-Ex): 2023-05-26T10:00:00Z
    const dateTradeDataEx = new Date("2023-05-26T10:00:00Z").getTime();

    const transactions: Transaction[] = [
      { id: "tx-com", ticker: "VALE3", type: "buy", date: dateTradeDataCom, quantity: 100, pricePerShare: 20 },
      { id: "tx-ex", ticker: "VALE3", type: "buy", date: dateTradeDataEx, quantity: 50, pricePerShare: 10 },
    ];

    const impact = calculateCorporateEventImpact(
      baseItem,
      { date: dateEvent, type: "split", factor: 2 },
      transactions,
    );

    // As 100 cotas da Data-Com DEVEM ser elegíveis
    expect(impact.eligibleQuantity).toBe(100);
    // 100 dobram para 200, mais as 50 cotas da Data-Ex = 250 cotas
    expect(impact.newQuantity).toBe(250);
  });

  it("saneia ponto flutuante corrompido (ex: 232.60000000000002) para número inteiro", () => {
    const corruptedItem: WatchlistItem = {
      ...baseItem,
      ticker: "VALE3",
      quantity: 232.60000000000002,
      averagePrice: 26.07,
    };

    const impact = calculateCorporateEventImpact(
      corruptedItem,
      { date: Date.now(), type: "split", factor: 2 },
      [],
    );

    // 232.60000000000002 arredondado para inteiro limpo (233) e dobrado para 466
    expect(impact.currentQuantity).toBe(233);
    expect(impact.newQuantity).toBe(466);
    expect(Number.isInteger(impact.newQuantity)).toBe(true);
  });
});
