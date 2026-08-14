import { describe, it, expect, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  buildTransactionsCsv,
  buildWatchlistFullCsv,
  buildWatchlistCsv,
} from "../csv";
import { parseFile } from "../dynamicCsvParser";
import { persistTransactionsBatch } from "../transactionPersistence";
import type { Transaction } from "../transactions";
import type { WatchlistItem } from "../watchlist";

describe("csvRoundTrip & Persistence Resilience (Prompt 105)", () => {
  describe("Transactions CSV Round-Trip", () => {
    it("exports transactions and re-imports them with 100% fidelity", () => {
      const originalTxs: Transaction[] = [
        {
          id: "tx-1",
          ticker: "PETR4",
          type: "buy",
          date: new Date("2024-01-15T12:00:00Z").getTime(),
          quantity: 100,
          pricePerShare: 34.5,
          fees: 2.15,
          notes: "Aporte mensal",
        },
        {
          id: "tx-2",
          ticker: "HGLG11",
          type: "buy",
          date: new Date("2024-02-20T12:00:00Z").getTime(),
          quantity: 10,
          pricePerShare: 165.8,
          fees: 1.5,
          notes: null,
        },
        {
          id: "tx-3",
          ticker: "VALE3",
          type: "sell",
          date: new Date("2024-03-10T12:00:00Z").getTime(),
          quantity: 50,
          pricePerShare: 68.2,
          fees: 3.4,
          notes: "Rebalanceamento",
        },
        {
          id: "tx-4",
          ticker: "AAPL",
          type: "buy",
          date: new Date("2024-04-05T12:00:00Z").getTime(),
          quantity: 15,
          pricePerShare: 182.5,
          fees: 0.0,
          notes: "US Stock",
        },
      ];

      // 1. Generate CSV export using buildTransactionsCsv
      const csvString = buildTransactionsCsv(originalTxs);
      expect(csvString).toContain("Ticker,Tipo,Quantidade,Preço,Taxas,Data,Notas");

      // 2. Parse the CSV back using XLSX & parseFile
      const workbook = XLSX.read(csvString, { type: "string", raw: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: true,
      });

      const headers = (rawData[0] as unknown[]).map((h) => String(h || "").trim());
      const rows = rawData.slice(1);

      const parsedResult = parseFile(rows, headers);

      // 3. Verify 100% round-trip fidelity
      expect(parsedResult.ignored.length).toBe(0);
      expect(parsedResult.transactions.length).toBe(4);

      // Transaction 1: PETR4
      expect(parsedResult.transactions[0].ticker).toBe("PETR4");
      expect(parsedResult.transactions[0].type).toBe("BUY");
      expect(parsedResult.transactions[0].quantity).toBe(100);
      expect(parsedResult.transactions[0].price).toBe(34.5);
      expect(parsedResult.transactions[0].costs).toBe(2.15);

      // Transaction 2: HGLG11
      expect(parsedResult.transactions[1].ticker).toBe("HGLG11");
      expect(parsedResult.transactions[1].type).toBe("BUY");
      expect(parsedResult.transactions[1].quantity).toBe(10);
      expect(parsedResult.transactions[1].price).toBe(165.8);

      // Transaction 3: VALE3
      expect(parsedResult.transactions[2].ticker).toBe("VALE3");
      expect(parsedResult.transactions[2].type).toBe("SELL");
      expect(parsedResult.transactions[2].quantity).toBe(50);
      expect(parsedResult.transactions[2].price).toBe(68.2);

      // Transaction 4: AAPL
      expect(parsedResult.transactions[3].ticker).toBe("AAPL");
      expect(parsedResult.transactions[3].type).toBe("BUY");
      expect(parsedResult.transactions[3].quantity).toBe(15);
      expect(parsedResult.transactions[3].price).toBe(182.5);
    });
  });

  describe("Watchlist Full Positions CSV Export", () => {
    it("generates detailed positions CSV without affecting legacy buildWatchlistCsv", () => {
      const items: WatchlistItem[] = [
        {
          id: "item-1",
          ticker: "WEGE3",
          name: "WEG S.A.",
          type: "STOCK_BR",
          currency: "BRL",
          currentPrice: 40.0,
          annualDividend: 1.2,
          targetYield: 6,
          ceilingPrice: 20.0,
          safetyMargin: -50.0,
          quantity: 200,
          averagePrice: 35.0,
          paymentMonths: [3, 8],
          payoutRatio: 55,
          customTaxRate: null,
          sector: "Industrial",
          addedAt: Date.now(),
          investingSince: new Date("2023-01-10").getTime(),
        },
      ];

      const fullCsv = buildWatchlistFullCsv(items);
      expect(fullCsv).toContain("Ticker,Nome,Tipo,Quantidade,Preço Médio,Preço Teto");
      expect(fullCsv).toContain("WEGE3,WEG S.A.,STOCK_BR,200,35,20");

      const legacyCsv = buildWatchlistCsv(items);
      expect(legacyCsv).toContain("Ticker,Type,Quantity,AveragePrice");
      expect(legacyCsv).toContain("WEGE3,STOCK_BR,200,35");
    });
  });

  describe("persistTransactionsBatch Partial Failure Resilience", () => {
    it("tracks individual transaction failures and persists succeeding ones", async () => {
      const parsedList = [
        {
          lineIndex: 2,
          ticker: "PETR4",
          type: "BUY" as const,
          isFallbackType: false,
          quantity: 100,
          price: 35.0,
          costs: 0,
          date: new Date("2024-01-10"),
          rawDate: "10/01/2024",
        },
        {
          lineIndex: 3,
          ticker: "PETR4",
          type: "BUY" as const,
          isFallbackType: false,
          quantity: 50,
          price: 36.0,
          costs: 0,
          date: new Date("2024-02-10"),
          rawDate: "10/02/2024",
        },
        {
          lineIndex: 4,
          ticker: "VALE3",
          type: "BUY" as const,
          isFallbackType: false,
          quantity: 80,
          price: 70.0,
          costs: 0,
          date: new Date("2024-03-10"),
          rawDate: "10/03/2024",
        },
      ];

      const existingItems: WatchlistItem[] = [];
      const existingTxs: Transaction[] = [];

      const persistedTxCalls: Transaction[] = [];
      const updatedHoldingCalls: WatchlistItem[] = [];

      const upsertTxMock = vi.fn().mockImplementation(async (tx: Transaction) => {
        if (tx.ticker === "VALE3") {
          throw new Error("Simulated Firestore timeout error for VALE3");
        }
        persistedTxCalls.push(tx);
        return tx;
      });

      const upsertItemMock = vi.fn().mockImplementation(async (item: WatchlistItem) => {
        updatedHoldingCalls.push(item);
        return item;
      });

      const result = await persistTransactionsBatch(
        parsedList,
        existingItems,
        existingTxs,
        upsertTxMock,
        upsertItemMock,
      );

      // Verify partial failure results
      expect(result.persistedCount).toBe(2);
      expect(result.persistedTransactions.length).toBe(2);
      expect(result.failedTransactions.length).toBe(1);
      expect(result.failedTransactions[0].tx.ticker).toBe("VALE3");
      expect(result.failedTransactions[0].lineIndex).toBe(4);
      expect(result.failedTransactions[0].error).toContain("Simulated Firestore timeout");

      // Verify PETR4 holding was correctly updated (100 @ 35 + 50 @ 36 = 150 @ 35.33)
      expect(updatedHoldingCalls.length).toBe(1);
      expect(updatedHoldingCalls[0].ticker).toBe("PETR4");
      expect(updatedHoldingCalls[0].quantity).toBe(150);
      expect(updatedHoldingCalls[0].averagePrice).toBeCloseTo(35.33, 2);
    });
  });
});
