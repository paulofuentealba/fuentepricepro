import { describe, it, expect, vi } from "vitest";
import {
  type Transaction,
  type ThesisSnapshot,
  recalculateHoldingFromTransactions,
} from "../transactionsLogic";
import { persistTransactionsBatch } from "../transactionPersistence";
import type { ParsedTransaction } from "../dynamicCsvParser";
import type { WatchlistItem } from "../watchlist";

describe("ThesisSnapshot — Imutabilidade e Persistência na Compra", () => {
  it("compra registra snapshot com todos os campos disponíveis", () => {
    const snapshot: ThesisSnapshot = {
      consensusPrice: 40.0,
      bazinPrice: 38.0,
      grahamPrice: 42.0,
      gordonPrice: 39.5,
      purchasePrice: 30.0,
      safetyMarginVsConsensus: 33.33,
      payoutRatio: 0.45,
      dividendYield: 8.5,
      dividendCagr5y: 10.2,
      piotroskiScore: 8,
      isYieldTrap: false,
      valuationVersion: "fuente-v1",
      capturedAt: 1700000000000,
      unavailableReason: null,
    };

    const buyTx: Transaction = {
      id: "tx-buy-1",
      ticker: "BBAS3",
      type: "buy",
      date: 1700000000000,
      quantity: 100,
      pricePerShare: 30.0,
      fees: 5.0,
      thesisSnapshot: snapshot,
    };

    expect(buyTx.thesisSnapshot).toBeDefined();
    expect(buyTx.thesisSnapshot?.consensusPrice).toBe(40.0);
    expect(buyTx.thesisSnapshot?.purchasePrice).toBe(30.0);
    expect(buyTx.thesisSnapshot?.safetyMarginVsConsensus).toBeCloseTo(33.33, 2);
    expect(buyTx.thesisSnapshot?.valuationVersion).toBe("fuente-v1");
    expect(buyTx.thesisSnapshot?.unavailableReason).toBeNull();
  });

  it("fundamentos indisponíveis -> snapshot parcial com null explícito e razão, transação OK", () => {
    const degradedSnapshot: ThesisSnapshot = {
      consensusPrice: null,
      bazinPrice: null,
      grahamPrice: null,
      gordonPrice: null,
      purchasePrice: 25.0,
      safetyMarginVsConsensus: null,
      payoutRatio: null,
      dividendYield: null,
      dividendCagr5y: null,
      piotroskiScore: null,
      isYieldTrap: null,
      valuationVersion: "fuente-v1",
      capturedAt: 1700000000000,
      unavailableReason: "FUNDAMENTALS_UNAVAILABLE",
    };

    const buyTx: Transaction = {
      id: "tx-buy-degraded",
      ticker: "NOVO3",
      type: "buy",
      date: 1700000000000,
      quantity: 50,
      pricePerShare: 25.0,
      thesisSnapshot: degradedSnapshot,
    };

    expect(buyTx.thesisSnapshot?.consensusPrice).toBeNull();
    expect(buyTx.thesisSnapshot?.safetyMarginVsConsensus).toBeNull();
    expect(buyTx.thesisSnapshot?.unavailableReason).toBe("FUNDAMENTALS_UNAVAILABLE");
    expect(buyTx.quantity).toBe(50);
  });

  it("venda (sell) NÃO gera snapshot de tese", () => {
    const sellTx: Transaction = {
      id: "tx-sell-1",
      ticker: "BBAS3",
      type: "sell",
      date: 1700000000000,
      quantity: 50,
      pricePerShare: 35.0,
      thesisSnapshot: null,
    };

    expect(sellTx.thesisSnapshot).toBeNull();
  });

  it("evento corporativo (corporate_action) NÃO gera snapshot de tese", () => {
    const splitTx: Transaction = {
      id: "tx-split-1",
      ticker: "BBAS3",
      type: "corporate_action",
      date: 1700000000000,
      quantity: 0,
      pricePerShare: 0,
      factor: 2,
      thesisSnapshot: null,
    };

    expect(splitTx.thesisSnapshot).toBeNull();
  });

  it("snapshot permanece IMUTÁVEL e não é alterado por recálculos posteriores de holding", () => {
    const initialSnapshot: ThesisSnapshot = {
      consensusPrice: 40.0,
      bazinPrice: 38.0,
      grahamPrice: 42.0,
      gordonPrice: 39.5,
      purchasePrice: 30.0,
      safetyMarginVsConsensus: 33.33,
      payoutRatio: 0.45,
      dividendYield: 8.5,
      dividendCagr5y: 10.2,
      piotroskiScore: 8,
      isYieldTrap: false,
      valuationVersion: "fuente-v1",
      capturedAt: 1700000000000,
    };

    const tx1: Transaction = {
      id: "tx-1",
      ticker: "PETR4",
      type: "buy",
      date: 1000,
      quantity: 100,
      pricePerShare: 30.0,
      thesisSnapshot: initialSnapshot,
    };

    const tx2: Transaction = {
      id: "tx-2",
      ticker: "PETR4",
      type: "buy",
      date: 2000,
      quantity: 100,
      pricePerShare: 40.0,
      thesisSnapshot: {
        ...initialSnapshot,
        purchasePrice: 40.0,
        consensusPrice: 45.0,
        safetyMarginVsConsensus: 12.5,
      },
    };

    // Recalcula holding
    const holding = recalculateHoldingFromTransactions([tx1, tx2]);
    expect(holding.quantity).toBe(200);
    expect(holding.averagePrice).toBe(35.0);

    // Snapshot original da transação 1 permaneceu intocado
    expect(tx1.thesisSnapshot?.purchasePrice).toBe(30.0);
    expect(tx1.thesisSnapshot?.consensusPrice).toBe(40.0);
    expect(tx1.thesisSnapshot?.safetyMarginVsConsensus).toBe(33.33);
  });
});

describe("ThesisSnapshot — Retrocompatibilidade", () => {
  it("retrocompatibilidade com Firestore: transações legadas sem thesisSnapshot são lidas com segurança", () => {
    const legacyFirestoreRow: Record<string, any> = {
      id: "legacy-tx-1",
      ticker: "VALE3",
      type: "buy",
      date: 1650000000000,
      quantity: 100,
      pricePerShare: 70.0,
      fees: 0,
      notes: "Transação antiga",
      user_id: "user-old-123",
      // Sem thesisSnapshot
    };

    // Função de conversão equivalente a rowToItem
    const item: Transaction = {
      id: legacyFirestoreRow.id,
      ticker: legacyFirestoreRow.ticker,
      type: legacyFirestoreRow.type,
      date: legacyFirestoreRow.date,
      quantity: legacyFirestoreRow.quantity,
      pricePerShare: legacyFirestoreRow.pricePerShare,
      factor: legacyFirestoreRow.factor ?? null,
      fees: legacyFirestoreRow.fees ?? null,
      notes: legacyFirestoreRow.notes ?? null,
      thesisSnapshot: legacyFirestoreRow.thesisSnapshot ?? null,
    };

    expect(item.id).toBe("legacy-tx-1");
    expect(item.thesisSnapshot).toBeNull();
    expect(() => recalculateHoldingFromTransactions([item])).not.toThrow();
  });

  it("retrocompatibilidade com localStorage (Guest Mode): JSON parse de array legado funciona perfeitamente", () => {
    const legacyLocalStorageJson = JSON.stringify([
      {
        id: "local-tx-1",
        ticker: "ITUB4",
        type: "buy",
        date: 1680000000000,
        quantity: 200,
        pricePerShare: 28.5,
      },
    ]);

    const parsed: Transaction[] = JSON.parse(legacyLocalStorageJson);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].thesisSnapshot).toBeUndefined();

    const holding = recalculateHoldingFromTransactions(parsed);
    expect(holding.quantity).toBe(200);
    expect(holding.averagePrice).toBe(28.5);
  });
});

describe("ThesisSnapshot — Importação em Lote (persistTransactionsBatch)", () => {
  it("executa fetch/valuation 1x por ticker e instancia snapshot para cada compra com seu preço pago", async () => {
    const parsedList: ParsedTransaction[] = [
      {
        lineIndex: 1,
        ticker: "PETR4",
        type: "BUY",
        date: new Date(2026, 0, 10),
        rawDate: "10/01/2026",
        isFallbackType: false,
        quantity: 100,
        price: 30.0,
        costs: 0,
      },
      {
        lineIndex: 2,
        ticker: "PETR4",
        type: "BUY",
        date: new Date(2026, 0, 15),
        rawDate: "15/01/2026",
        isFallbackType: false,
        quantity: 50,
        price: 35.0,
        costs: 0,
      },
      {
        lineIndex: 3,
        ticker: "PETR4",
        type: "SELL",
        date: new Date(2026, 0, 20),
        rawDate: "20/01/2026",
        isFallbackType: false,
        quantity: 20,
        price: 38.0,
        costs: 0,
      },
    ];

    const mockFetchAssetData = vi.fn().mockResolvedValue({
      ticker: "PETR4",
      name: "Petrobras PN",
      type: "STOCK_BR",
      currentPrice: 36.0,
      annualDividend: 4.0,
      metrics: {
        eps: 8.0,
        bvps: 30.0,
        dividendCagr5y: 15.0,
        payoutRatio: 0.5,
        piotroskiScore: 7,
      },
    });

    const persistedTxs: Transaction[] = [];
    const upsertTransaction = vi.fn().mockImplementation((tx: Transaction) => {
      persistedTxs.push(tx);
      return Promise.resolve();
    });
    const upsertWatchlistItem = vi.fn().mockResolvedValue(undefined);

    const result = await persistTransactionsBatch(
      parsedList,
      [],
      [],
      upsertTransaction,
      upsertWatchlistItem,
      mockFetchAssetData,
    );

    expect(result.persistedCount).toBe(3);
    // Deve chamar fetchAssetData exatamente 1 vez para PETR4, não 3 vezes
    expect(mockFetchAssetData).toHaveBeenCalledTimes(1);
    expect(mockFetchAssetData).toHaveBeenCalledWith("PETR4");

    // Compra 1 (preço R$ 30)
    const tx1 = persistedTxs.find((t) => t.pricePerShare === 30.0);
    expect(tx1?.thesisSnapshot).toBeDefined();
    expect(tx1?.thesisSnapshot?.purchasePrice).toBe(30.0);
    expect(tx1?.thesisSnapshot?.consensusPrice).toBeGreaterThan(0);
    expect(tx1?.thesisSnapshot?.valuationVersion).toBe("fuente-v1");

    // Compra 2 (preço R$ 35)
    const tx2 = persistedTxs.find((t) => t.pricePerShare === 35.0);
    expect(tx2?.thesisSnapshot).toBeDefined();
    expect(tx2?.thesisSnapshot?.purchasePrice).toBe(35.0);
    expect(tx2?.thesisSnapshot?.consensusPrice).toBe(tx1?.thesisSnapshot?.consensusPrice);
    // Margem vs consenso varia de acordo com o preço pago
    expect(tx2?.thesisSnapshot?.safetyMarginVsConsensus).toBeLessThan(
      tx1?.thesisSnapshot?.safetyMarginVsConsensus!,
    );

    // Venda (SELL) não tem snapshot
    const txSell = persistedTxs.find((t) => t.type === "sell");
    expect(txSell?.thesisSnapshot).toBeNull();
  });

  it("falha no fetch de um ticker não trava os demais tickers do lote", async () => {
    const parsedList: ParsedTransaction[] = [
      {
        lineIndex: 1,
        ticker: "FAIL3",
        type: "BUY",
        date: new Date(2026, 0, 10),
        rawDate: "10/01/2026",
        isFallbackType: false,
        quantity: 100,
        price: 20.0,
        costs: 0,
      },
      {
        lineIndex: 2,
        ticker: "OK3",
        type: "BUY",
        date: new Date(2026, 0, 12),
        rawDate: "12/01/2026",
        isFallbackType: false,
        quantity: 100,
        price: 50.0,
        costs: 0,
      },
    ];

    const mockFetchAssetData = vi.fn().mockImplementation((ticker: string) => {
      if (ticker === "FAIL3") {
        return Promise.reject(new Error("Network timeout"));
      }
      return Promise.resolve({
        ticker: "OK3",
        type: "STOCK_BR",
        currentPrice: 50.0,
        annualDividend: 3.0,
      });
    });

    const persistedTxs: Transaction[] = [];
    const upsertTransaction = vi.fn().mockImplementation((tx: Transaction) => {
      persistedTxs.push(tx);
      return Promise.resolve();
    });

    const result = await persistTransactionsBatch(
      parsedList,
      [],
      [],
      upsertTransaction,
      vi.fn().mockResolvedValue(undefined),
      mockFetchAssetData,
    );

    expect(result.persistedCount).toBe(2);

    const failTx = persistedTxs.find((t) => t.ticker === "FAIL3");
    expect(failTx).toBeDefined();
    expect(failTx?.thesisSnapshot?.unavailableReason).toBe("FETCH_ASSET_DATA_FAILED");

    const okTx = persistedTxs.find((t) => t.ticker === "OK3");
    expect(okTx).toBeDefined();
    expect(okTx?.thesisSnapshot?.consensusPrice).toBeGreaterThan(0);
  });
});
