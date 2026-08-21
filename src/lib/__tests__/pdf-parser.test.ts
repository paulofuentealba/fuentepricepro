import { describe, it, expect } from "vitest";
import {
  parseB3Float,
  parseB3BrokerNote,
  normalizeIssuerSpecification,
  extractSinacorTotalFees,
} from "../dataIngestion/b3Parser";
import { ptBR } from "@/lib/i18n/dict.ptBR";
import { en } from "@/lib/i18n/dict.en";
import { es } from "@/lib/i18n/dict.es";
import {
  parseDdMmYyyyToTimestamp,
  consolidateTradesToWatchlistItems,
} from "@/components/ceiling/watchlist/BrokerNoteUploader";
import type { Transaction } from "@/lib/transactionsLogic";

describe("PDF Data Ingestion Resiliency (B3 Parser)", () => {
  describe("normalizeIssuerSpecification", () => {
    it("should strip governance and segment tags (N1, N2, NM, EJ, ED) leaving issuer and stock class", () => {
      expect(normalizeIssuerSpecification("OI ON N1")).toBe("OI ON");
      expect(normalizeIssuerSpecification("PETROBRAS PN ED")).toBe("PETROBRAS PN");
      expect(normalizeIssuerSpecification("KLABIN S/A UNT N2")).toBe("KLABIN S/A UNT");
    });
  });

  describe("parseDdMmYyyyToTimestamp & Transaction Mapping", () => {
    it("should correctly convert DD/MM/YYYY date strings to UTC noon timestamps", () => {
      const ts = parseDdMmYyyyToTimestamp("15/07/2026");
      const expected = Date.UTC(2026, 6, 15, 12, 0, 0);
      expect(ts).toBe(expected);
    });

    it("should return null for empty, whitespace, null, undefined, or malformed date strings without falling back to Date.now()", () => {
      expect(parseDdMmYyyyToTimestamp("")).toBeNull();
      expect(parseDdMmYyyyToTimestamp("   ")).toBeNull();
      expect(parseDdMmYyyyToTimestamp(null)).toBeNull();
      expect(parseDdMmYyyyToTimestamp(undefined)).toBeNull();
      expect(parseDdMmYyyyToTimestamp("invalid-date")).toBeNull();
      expect(parseDdMmYyyyToTimestamp("99/99/2026")).toBeNull();
    });

    it("should generate deterministic Transaction payloads from parsed trades", () => {
      const trade = {
        ticker: "WEGE3",
        quantity: 100,
        price: 45.0,
        date: "15/07/2026",
      };

      const txTimestamp = parseDdMmYyyyToTimestamp(trade.date);
      const expectedId = `tx-pdf-WEGE3-${txTimestamp}-100-45`;

      const transaction: Transaction = {
        id: expectedId,
        ticker: trade.ticker.toUpperCase(),
        type: "buy",
        date: txTimestamp!,
        quantity: trade.quantity,
        pricePerShare: trade.price,
        fees: null,
      };

      expect(transaction.id).toBe("tx-pdf-WEGE3-" + txTimestamp + "-100-45");
      expect(transaction.ticker).toBe("WEGE3");
      expect(transaction.type).toBe("buy");
      expect(transaction.quantity).toBe(100);
      expect(transaction.pricePerShare).toBe(45.0);
      expect(transaction.fees).toBeNull();
    });
  });

  describe("consolidateTradesToWatchlistItems", () => {
    it("should consolidate multiple trades of the same ticker in the same note into a single WatchlistItem with weighted average price", () => {
      const trades = [
        { ticker: "WEGE3", quantity: 100, price: 40.0, date: "15/07/2026" },
        { ticker: "WEGE3", quantity: 50, price: 42.0, date: "15/07/2026" },
      ];

      const newlyCreatedTx: Transaction[] = trades.map((t, idx) => ({
        id: `tx-${idx}`,
        ticker: t.ticker,
        type: "buy",
        date: parseDdMmYyyyToTimestamp(t.date)!,
        quantity: t.quantity,
        pricePerShare: t.price,
      }));

      const items = consolidateTradesToWatchlistItems(trades, [], newlyCreatedTx);

      expect(items).toHaveLength(1);
      expect(items[0].ticker).toBe("WEGE3");
      expect(items[0].quantity).toBe(150);
      // (100 * 40 + 50 * 42) / 150 = 6100 / 150 = 40.666666666666664
      expect(items[0].averagePrice).toBeCloseTo(40.6667, 4);
      expect(items[0].currentPrice).toBe(42.0); // last trade's price
    });

    it("should consolidate new note trades with pre-existing transactions for the same ticker", () => {
      const preExistingTx: Transaction[] = [
        {
          id: "tx-old-1",
          ticker: "WEGE3",
          type: "buy",
          date: parseDdMmYyyyToTimestamp("01/01/2026")!,
          quantity: 100,
          pricePerShare: 30.0,
        },
      ];

      const trades = [{ ticker: "WEGE3", quantity: 100, price: 40.0, date: "15/07/2026" }];

      const newlyCreatedTx: Transaction[] = [
        {
          id: "tx-new-1",
          ticker: "WEGE3",
          type: "buy",
          date: parseDdMmYyyyToTimestamp("15/07/2026")!,
          quantity: 100,
          pricePerShare: 40.0,
        },
      ];

      const items = consolidateTradesToWatchlistItems(trades, preExistingTx, newlyCreatedTx);

      expect(items).toHaveLength(1);
      expect(items[0].ticker).toBe("WEGE3");
      expect(items[0].quantity).toBe(200);
      // (100 * 30 + 100 * 40) / 200 = 7000 / 200 = 35.0
      expect(items[0].averagePrice).toBe(35.0);
    });

    it("should correctly handle single unique tickers without regressions", () => {
      const trades = [
        { ticker: "WEGE3", quantity: 100, price: 40.0, date: "15/07/2026" },
        { ticker: "PETR4", quantity: 200, price: 30.0, date: "15/07/2026" },
      ];

      const newlyCreatedTx: Transaction[] = trades.map((t, idx) => ({
        id: `tx-${idx}`,
        ticker: t.ticker,
        type: "buy",
        date: parseDdMmYyyyToTimestamp(t.date)!,
        quantity: t.quantity,
        pricePerShare: t.price,
      }));

      const items = consolidateTradesToWatchlistItems(trades, [], newlyCreatedTx);

      expect(items).toHaveLength(2);
      const wege = items.find((i) => i.ticker === "WEGE3");
      const petr = items.find((i) => i.ticker === "PETR4");

      expect(wege).toBeDefined();
      expect(wege?.quantity).toBe(100);
      expect(wege?.averagePrice).toBe(40.0);

      expect(petr).toBeDefined();
      expect(petr?.quantity).toBe(200);
      expect(petr?.averagePrice).toBe(30.0);
    });
  });

  describe("parseB3Float (Type Mapping)", () => {
    it('should correctly map a Brazilian formatted string like "1.500,00" to a float of 1500.00', () => {
      expect(parseB3Float("1.500,00")).toBe(1500.0);
      expect(parseB3Float("32,50")).toBe(32.5);
      expect(parseB3Float("10.450.000,99")).toBe(10450000.99);
      expect(parseB3Float("0,50")).toBe(0.5);
    });

    it("should throw an error for completely invalid floats to be caught by the engine", () => {
      expect(() => parseB3Float("invalid")).toThrow();
      expect(() => parseB3Float("")).toThrow();
    });
  });

  describe("parseB3BrokerNote", () => {
    it("should parse valid raw B3 text into structured trades", () => {
      const mockRawText = `
        XP INVESTIMENTOS
        Data pregão 15/07/2026
        ...
        1-BOVESPA C VISTA WEGE3 100 45,00 4.500,00 C
        1-BOVESPA V VISTA PETR4F 15 30,00 450,00 D
      `;

      const result = parseB3BrokerNote(mockRawText);

      expect(result.success).toBe(true);
      expect(result.trades).toBeDefined();
      expect(result.trades?.length).toBe(2);

      // Verify the first trade
      expect(result.trades?.[0]).toEqual({
        ticker: "WEGE3",
        quantity: 100,
        price: 45.0,
        date: "15/07/2026",
        type: "buy",
      });

      // Verify the fractional market (F) is stripped correctly
      expect(result.trades?.[1]).toEqual({
        ticker: "PETR4",
        quantity: 15,
        price: 30.0,
        date: "15/07/2026",
        type: "sell",
      });
    });

    it("should detect all 14 supported SINACOR brokers including Itaú, Bradesco/Ágora, Santander/Toro, BB, and Caixa", () => {
      const brokers = [
        { name: "XP", key: "02.332.886/0001-04" },
        { name: "CLEAR", key: "CLEAR CORRETORA" },
        { name: "RICO", key: "02.332.886/0016-82" },
        { name: "MODAL", key: "05.389.174/0001-01" },
        { name: "BTG", key: "43.815.158/0001-22" },
        { name: "INTER", key: "INTER DTVM" },
        { name: "NUINVEST", key: "62.169.875/0001-79" },
        { name: "ORAMA", key: "13.293.225/0001-25" },
        { name: "GENIAL", key: "27.652.684/0001-62" },
        { name: "ITAU", key: "61.194.353/0001-64 ITAU CORRETORA" },
        { name: "BRADESCO", key: "74.014.747/0001-35 AGORA CTVM" },
        { name: "SANTANDER", key: "29.162.769/0001-98 TORO CORRETORA" },
        { name: "BB", key: "24.933.830/0001-30 BB BANCO DE INVESTIMENTO" },
        { name: "CAIXA", key: "42.040.639/0001-40 CAIXA DTVM" },
      ];

      for (const b of brokers) {
        const text = `${b.key}\nData pregão 15/07/2026\n1-BOVESPA C VISTA ITUB4 200 32,50 6.500,00 C`;
        const result = parseB3BrokerNote(text);
        expect(result.success).toBe(true);
        expect(result.broker).toBe(b.name);
        expect(result.trades).toHaveLength(1);
        expect(result.trades?.[0].ticker).toBe("ITUB4");
      }
    });

    it("should return broker_layout_unsupported with broker name when CNPJ is detected but trades cannot be extracted", () => {
      const banks = [
        { name: "ITAU", key: "61.194.353/0001-64" },
        { name: "BRADESCO", key: "74.014.747/0001-35" },
        { name: "SANTANDER", key: "29.162.769/0001-98" },
        { name: "BB", key: "24.933.830/0001-30" },
        { name: "CAIXA", key: "42.040.639/0001-40" },
      ];

      for (const b of banks) {
        const text = `${b.key}\nRandom non-sinacor layout without trades...`;
        const result = parseB3BrokerNote(text);
        expect(result.success).toBe(false);
        expect(result.error).toBe("broker_layout_unsupported");
        expect(result.broker).toBe(b.name);
      }
    });

    it("should report brokerDivergence when manual hint differs from auto-detected CNPJ header", () => {
      const text = `XP INVESTIMENTOS 02.332.886/0001-04\nData pregão 15/07/2026\n1-BOVESPA C VISTA VALE3 50 60,00 3.000,00 C`;

      // User selected ITAU manually, but PDF has XP CNPJ header
      const result = parseB3BrokerNote(text, "ITAU");

      expect(result.success).toBe(true);
      expect(result.broker).toBe("XP"); // Auto-detected is source of truth
      expect(result.brokerDivergence).toEqual({
        selected: "ITAU",
        detected: "XP",
      });
      expect(result.trades).toHaveLength(1);
      expect(result.trades?.[0].ticker).toBe("VALE3");
    });

    it("should return a graceful error boundary payload for completely malformed input", () => {
      const malformedText =
        "This is a random text file with no B3 indicators at all. Just some 45,00 numbers.";

      const result = parseB3BrokerNote(malformedText);

      expect(result.success).toBe(false);
      expect(result.error).toBe("unknown_broker");
      expect(result.trades).toBeUndefined();
    });

    it("should gracefully handle empty or null inputs", () => {
      expect(parseB3BrokerNote("")).toEqual({ success: false, error: "Empty file" });
      expect(parseB3BrokerNote("   \n  ")).toEqual({ success: false, error: "Empty file" });
    });

    it("should return broker_layout_unsupported if trade line is corrupted and missing fields", () => {
      const corruptedText = `
        XP INVESTIMENTOS
        Data pregão 15/07/2026
        1-BOVESPA C VISTA WEGE3 
      `; // Missing quantity and price entirely

      const result = parseB3BrokerNote(corruptedText);
      expect(result.success).toBe(false);
      expect(result.error).toBe("broker_layout_unsupported");
      expect(result.broker).toBe("XP");
    });

    it("should resolve real Clear note fixture with short issuer name 'OI ON N1' to OIBR3 via B3_SHORT_NAME_MAP", () => {
      const rawText = `
        02.332.886/0011-78 CLEAR CORRETORA
        Data pregão 24/01/2020
        1-BOVESPA C VISTA OI ON N1 500 0,98 490,00 D
      `;

      const result = parseB3BrokerNote(rawText);

      expect(result.success).toBe(true);
      expect(result.broker).toBe("CLEAR");
      expect(result.trades).toHaveLength(1);
      expect(result.trades?.[0]).toEqual({
        ticker: "OIBR3",
        quantity: 500,
        price: 0.98,
        date: "24/01/2020",
        type: "buy",
      });
      expect(result.unresolvedTrades).toHaveLength(0);
    });

    it("should return unresolvedTrades without failing the note when trade line contains an unknown issuer", () => {
      const rawText = `
        02.332.886/0011-78 CLEAR CORRETORA
        Data pregão 24/01/2020
        1-BOVESPA C VISTA UNKNOWN CO ON N1 500 0,98 490,00 D
      `;

      const result = parseB3BrokerNote(rawText);

      expect(result.success).toBe(true);
      expect(result.broker).toBe("CLEAR");
      expect(result.trades).toHaveLength(0);
      expect(result.unresolvedTrades).toHaveLength(1);
      expect(result.unresolvedTrades?.[0]).toMatchObject({
        rawSpecification: "UNKNOWN CO ON N1",
        normalizedKey: "UNKNOWN CO ON",
        quantity: 500,
        price: 0.98,
        date: "24/01/2020",
        type: "buy",
      });
    });

    it("should resolve unknown issuer trade line using userMappings", () => {
      const rawText = `
        02.332.886/0011-78 CLEAR CORRETORA
        Data pregão 24/01/2020
        1-BOVESPA C VISTA UNKNOWN CO ON N1 500 0,98 490,00 D
      `;

      const userMappings = {
        "UNKNOWN CO ON": "UNKN3",
      };

      const result = parseB3BrokerNote(rawText, "AUTO", userMappings);

      expect(result.success).toBe(true);
      expect(result.broker).toBe("CLEAR");
      expect(result.trades).toHaveLength(1);
      expect(result.trades?.[0]).toEqual({
        ticker: "UNKN3",
        quantity: 500,
        price: 0.98,
        date: "24/01/2020",
        type: "buy",
      });
      expect(result.unresolvedTrades).toHaveLength(0);
    });
  });

  describe("BrokerNote i18n Interpolação (Tier 0 / Lote 5 Item 2)", () => {
    it("interpola {{count}} corretamente nos 3 idiomas suportados", () => {
      const count = 5;
      expect(ptBR.brokerNote.successImport.replace("{{count}}", String(count))).toBe(
        "5 ordem(ns) importada(s) com sucesso."
      );
      expect(en.brokerNote.successImport.replace("{{count}}", String(count))).toBe(
        "5 order(s) successfully imported."
      );
      expect(es.brokerNote.successImport.replace("{{count}}", String(count))).toBe(
        "5 orden(es) importada(s) con éxito."
      );
    });
  });

  describe("SINACOR Fee Extraction & Pro-rating (Tier 0 / Lote 5 Item 3)", () => {
    it("extrai taxas do resumo financeiro e rateia proporcionalmente ao volume negociado", () => {
      const rawText = `
        02.332.886/0001-04 XP INVESTIMENTOS
        Data pregão 15/07/2026
        1-BOVESPA C VISTA PETR4 100 40,00 4.000,00 D
        1-BOVESPA C VISTA VALE3 100 60,00 6.000,00 D
        Resumo Financeiro
        Taxa de liquidação 2,50
        Emolumentos 0,50
        Total corretagem / Despesas 3,00
      `;

      // Total Volume = 4.000 + 6.000 = 10.000
      // Total Fees = 2,50 + 0,50 + 3,00 = 6,00 (0,06% do volume <= 2% sanity cap)
      // PETR4 fee = (4.000 / 10.000) * 6,00 = 2,40
      // VALE3 fee = (6.000 / 10.000) * 6,00 = 3,60
      const result = parseB3BrokerNote(rawText);

      expect(result.success).toBe(true);
      expect(result.trades).toHaveLength(2);
      expect(result.trades?.[0]).toMatchObject({
        ticker: "PETR4",
        quantity: 100,
        price: 40,
        fees: 2.4,
      });
      expect(result.trades?.[1]).toMatchObject({
        ticker: "VALE3",
        quantity: 100,
        price: 60,
        fees: 3.6,
      });
    });

    it("mantém fallback seguro (fees undefined) quando o rodapé financeiro não está presente", () => {
      const rawText = `
        02.332.886/0001-04 XP INVESTIMENTOS
        Data pregão 15/07/2026
        1-BOVESPA C VISTA PETR4 100 40,00 4.000,00 D
      `;

      const result = parseB3BrokerNote(rawText);

      expect(result.success).toBe(true);
      expect(result.trades).toHaveLength(1);
      expect(result.trades?.[0].fees).toBeUndefined();
    });

    it("rejeita taxas que excedem a trava de sanidade de 2% do volume financeiro total", () => {
      const rawText = `
        02.332.886/0001-04 XP INVESTIMENTOS
        Data pregão 15/07/2026
        1-BOVESPA C VISTA PETR4 100 40,00 4.000,00 D
        Resumo Financeiro
        Total corretagem / Despesas 150,00
      `;

      // Volume = 4.000. 2% de 4.000 = 80. Taxa de 150 > 80 -> deve ser rejeitada pela trava de sanidade.
      const fees = extractSinacorTotalFees(rawText, 4000);
      expect(fees).toBeNull();

      const result = parseB3BrokerNote(rawText);
      expect(result.success).toBe(true);
      expect(result.trades?.[0].fees).toBeUndefined();
    });
  });
});


