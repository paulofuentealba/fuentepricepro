import { describe, it, expect, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  buildTransactionsCsv,
  buildWatchlistFullCsv,
  buildWatchlistCsv,
  parseWatchlistCsv,
  parseTransactionTemplateCsv,
} from "../csv";
import { parseFile } from "../dynamicCsvParser";
import { persistTransactionsBatch } from "../transactionPersistence";
import type { Transaction } from "../transactionsLogic";
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

      // 4. Verify parseTransactionTemplateCsv also preserves fees on the same export
      const templateParsed = parseTransactionTemplateCsv(csvString);
      expect(templateParsed.length).toBe(4);
      expect(templateParsed[0].fees).toBe(2.15);
      expect(templateParsed[1].fees).toBe(1.5);
      expect(templateParsed[2].fees).toBe(3.4);
      expect(templateParsed[3].fees).toBe(0);
    });
  });

  describe("Watchlist Full Positions CSV Export & Import Round-Trip (Item 18 Opção A)", () => {
    it("generates detailed positions CSV and re-imports with 100% round-trip fidelity", () => {
      const items: WatchlistItem[] = [
        {
          id: "stock_br:WEGE3",
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
          customTaxRate: 15,
          targetMonthlyIncome: 500,
          sector: "Industrial",
          addedAt: 1700000000000,
          investingSince: new Date("2023-01-10T00:00:00Z").getTime(),
        },
        {
          id: "fii:HGLG11",
          ticker: "HGLG11",
          name: "CSHG Logística",
          type: "FII",
          currency: "BRL",
          currentPrice: 160.0,
          annualDividend: 13.2,
          targetYield: 8.5,
          ceilingPrice: 155.29,
          safetyMargin: -2.94,
          quantity: 50,
          averagePrice: 152.0,
          paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          payoutRatio: 95,
          customTaxRate: null,
          targetMonthlyIncome: null,
          sector: "Imobiliário",
          addedAt: 1700000000000,
          investingSince: new Date("2022-05-15T00:00:00Z").getTime(),
        },
      ];

      // 1. Export full 14-column CSV
      const fullCsv = buildWatchlistFullCsv(items);
      expect(fullCsv).toContain("Ticker,Nome,Tipo,Quantidade,Preço Médio,Preço Teto,Margem de Segurança (%),Yield Alvo (%),Dividendo Anual,Setor,Moeda,Meta Renda Mensal,Alíquota IR (%),Data Início");
      expect(fullCsv).toContain("WEGE3,WEG S.A.,STOCK_BR,200,35,20,-50.00,6,1.2,Industrial,BRL,500,15,2023-01-10");

      // 2. Parse back with parseWatchlistCsv
      const parsedRows = parseWatchlistCsv(fullCsv);
      expect(parsedRows).toHaveLength(2);

      // Item 1: WEGE3
      expect(parsedRows[0].ticker).toBe("WEGE3");
      expect(parsedRows[0].name).toBe("WEG S.A.");
      expect(parsedRows[0].type).toBe("STOCK_BR");
      expect(parsedRows[0].quantity).toBe(200);
      expect(parsedRows[0].averagePrice).toBe(35);
      expect(parsedRows[0].ceilingPrice).toBe(20);
      expect(parsedRows[0].safetyMargin).toBe(-50);
      expect(parsedRows[0].targetYield).toBe(6);
      expect(parsedRows[0].annualDividend).toBe(1.2);
      expect(parsedRows[0].sector).toBe("Industrial");
      expect(parsedRows[0].currency).toBe("BRL");
      expect(parsedRows[0].targetMonthlyIncome).toBe(500);
      expect(parsedRows[0].customTaxRate).toBe(15);
      expect(new Date(parsedRows[0].investingSince!).toISOString().slice(0, 10)).toBe("2023-01-10");

      // Item 2: HGLG11
      expect(parsedRows[1].ticker).toBe("HGLG11");
      expect(parsedRows[1].name).toBe("CSHG Logística");
      expect(parsedRows[1].type).toBe("FII");
      expect(parsedRows[1].quantity).toBe(50);
      expect(parsedRows[1].averagePrice).toBe(152);
      expect(parsedRows[1].targetYield).toBe(8.5);
      expect(parsedRows[1].annualDividend).toBe(13.2);
      expect(parsedRows[1].currency).toBe("BRL");

      // 3. Backward compatibility: legacy 4-column format still parsed seamlessly
      const legacyCsv = buildWatchlistCsv(items);
      expect(legacyCsv).toContain("Ticker,Type,Quantity,AveragePrice");
      const parsedLegacy = parseWatchlistCsv(legacyCsv);
      expect(parsedLegacy).toHaveLength(2);
      expect(parsedLegacy[0].ticker).toBe("WEGE3");
      expect(parsedLegacy[0].type).toBe("STOCK_BR");
      expect(parsedLegacy[0].quantity).toBe(200);
      expect(parsedLegacy[0].averagePrice).toBe(35);
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
