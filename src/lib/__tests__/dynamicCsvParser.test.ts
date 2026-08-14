import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import {
  COLUMN_SEMANTIC_ALIASES,
  normalizeHeader,
  matchColumn,
  parseOperationType,
  parseNumericValue,
  parseDateValue,
  isSupportedAsset,
  parseFile,
} from "../dynamicCsvParser";

describe("dynamicCsvParser (Prompt 103)", () => {
  describe("normalizeHeader", () => {
    it("removes accents, uppercase, spaces and punctuation", () => {
      expect(normalizeHeader("Data Pregão")).toBe("datapregao");
      expect(normalizeHeader("Preço Unitário (R$)")).toBe("precounitario");
      expect(normalizeHeader("C/V")).toBe("cv");
      expect(normalizeHeader("Código do Ativo")).toBe("codigodoativo");
      expect(normalizeHeader("")).toBe("");
    });
  });

  describe("COLUMN_SEMANTIC_ALIASES integrity", () => {
    it("ensures the first element of each category is the canonical export header", () => {
      expect(COLUMN_SEMANTIC_ALIASES.ticker[0]).toBe("Ticker");
      expect(COLUMN_SEMANTIC_ALIASES.operationType[0]).toBe("Tipo");
      expect(COLUMN_SEMANTIC_ALIASES.quantity[0]).toBe("Quantidade");
      expect(COLUMN_SEMANTIC_ALIASES.price[0]).toBe("Preço");
      expect(COLUMN_SEMANTIC_ALIASES.costs[0]).toBe("Taxas");
      expect(COLUMN_SEMANTIC_ALIASES.date[0]).toBe("Data");
    });
  });

  describe("matchColumn", () => {
    it("matches canonical headers with exact confidence (Tier 1)", () => {
      const headers = ["Ticker", "Tipo", "Quantidade", "Preço", "Taxas", "Data"];
      const mapping = matchColumn(headers);

      expect(mapping.ticker.confidence).toBe("exact");
      expect(mapping.ticker.sourceIndex).toBe(0);

      expect(mapping.operationType.confidence).toBe("exact");
      expect(mapping.operationType.sourceIndex).toBe(1);

      expect(mapping.quantity.confidence).toBe("exact");
      expect(mapping.quantity.sourceIndex).toBe(2);

      expect(mapping.price.confidence).toBe("exact");
      expect(mapping.price.sourceIndex).toBe(3);

      expect(mapping.costs.confidence).toBe("exact");
      expect(mapping.costs.sourceIndex).toBe(4);

      expect(mapping.date.confidence).toBe("exact");
      expect(mapping.date.sourceIndex).toBe(5);
    });

    it("matches aliases with alias confidence (Tier 2)", () => {
      const headers = ["Papel", "Operação", "Qtd", "Cotação", "Custos", "Data Pregão"];
      const mapping = matchColumn(headers);

      expect(mapping.ticker.confidence).toBe("alias");
      expect(mapping.ticker.sourceIndex).toBe(0);

      expect(mapping.operationType.confidence).toBe("alias");
      expect(mapping.operationType.sourceIndex).toBe(1);

      expect(mapping.quantity.confidence).toBe("alias");
      expect(mapping.quantity.sourceIndex).toBe(2);

      expect(mapping.price.confidence).toBe("alias");
      expect(mapping.price.sourceIndex).toBe(3);

      expect(mapping.costs.confidence).toBe("alias");
      expect(mapping.costs.sourceIndex).toBe(4);

      expect(mapping.date.confidence).toBe("alias");
      expect(mapping.date.sourceIndex).toBe(5);
    });

    it("matches substrings with substring confidence (Tier 3)", () => {
      const headers = ["Cod Negociação B3", "Preço Pago Total", "Data de Fechamento"];
      const mapping = matchColumn(headers);

      expect(mapping.ticker.confidence).toBe("substring");
      expect(mapping.ticker.sourceIndex).toBe(0);

      expect(mapping.price.confidence).toBe("substring");
      expect(mapping.price.sourceIndex).toBe(1);

      expect(mapping.date.confidence).toBe("substring");
      expect(mapping.date.sourceIndex).toBe(2);
    });
  });

  describe("parseOperationType", () => {
    it("recognizes buy operations", () => {
      expect(parseOperationType("Compra")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("C")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("BUY")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("Aplicação")).toEqual({ type: "BUY", isFallback: false });
    });

    it("recognizes sell operations", () => {
      expect(parseOperationType("Venda")).toEqual({ type: "SELL", isFallback: false });
      expect(parseOperationType("V")).toEqual({ type: "SELL", isFallback: false });
      expect(parseOperationType("SELL")).toEqual({ type: "SELL", isFallback: false });
      expect(parseOperationType("Resgate")).toEqual({ type: "SELL", isFallback: false });
    });

    it("falls back to BUY when unrecognized", () => {
      expect(parseOperationType("")).toEqual({ type: "BUY", isFallback: true });
      expect(parseOperationType(undefined)).toEqual({ type: "BUY", isFallback: true });
      expect(parseOperationType("Desconhecido")).toEqual({ type: "BUY", isFallback: true });
    });
  });

  describe("parseNumericValue", () => {
    it("parses BR format numbers with thousand separators and decimals", () => {
      expect(parseNumericValue("1.250,50")).toBe(1250.5);
      expect(parseNumericValue("25,30")).toBe(25.3);
      expect(parseNumericValue("R$ 45,90")).toBe(45.9);
      expect(parseNumericValue(" 10.500,00 ")).toBe(10500);
    });

    it("parses US format numbers", () => {
      expect(parseNumericValue("1,250.50")).toBe(1250.5);
      expect(parseNumericValue("25.30")).toBe(25.3);
      expect(parseNumericValue("$ 185.50")).toBe(185.5);
    });

    it("handles native numbers and invalid values gracefully", () => {
      expect(parseNumericValue(100.5)).toBe(100.5);
      expect(parseNumericValue(null)).toBeNull();
      expect(parseNumericValue("abc")).toBeNull();
    });
  });

  describe("parseDateValue", () => {
    it("parses BR format DD/MM/YYYY", () => {
      const date = parseDateValue("15/01/2024");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0); // Jan
      expect(date?.getDate()).toBe(15);
    });

    it("parses ISO format YYYY-MM-DD", () => {
      const date = parseDateValue("2024-02-20");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(1); // Feb
      expect(date?.getDate()).toBe(20);
    });

    it("parses Excel serial date numbers", () => {
      // 45306 is 2024-01-15 in Excel serial date format
      const date = parseDateValue(45306);
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it("returns null on invalid date", () => {
      expect(parseDateValue("data_invalida")).toBeNull();
      expect(parseDateValue(null)).toBeNull();
    });
  });

  describe("isSupportedAsset", () => {
    it("supports B3 stocks, units, FIIs, BDRs, ETFs", () => {
      expect(isSupportedAsset("PETR4").isSupported).toBe(true);
      expect(isSupportedAsset("HGLG11").isSupported).toBe(true);
      expect(isSupportedAsset("AAPL34").isSupported).toBe(true);
      expect(isSupportedAsset("BIVB39").isSupported).toBe(true);
      expect(isSupportedAsset("TAEE11").isSupported).toBe(true);
    });

    it("supports US stocks, REITs, ETFs", () => {
      expect(isSupportedAsset("AAPL").isSupported).toBe(true);
      expect(isSupportedAsset("MSFT").isSupported).toBe(true);
      expect(isSupportedAsset("O").isSupported).toBe(true);
      expect(isSupportedAsset("VNQ").isSupported).toBe(true);
      expect(isSupportedAsset("BRK.B").isSupported).toBe(true);
    });

    it("rejects B3 options (e.g. PETRL300, VALEA60)", () => {
      const res = isSupportedAsset("PETRL300");
      expect(res.isSupported).toBe(false);
      expect(res.reason).toContain("Derivativo/Opção não suportado");
    });

    it("rejects B3 futures (e.g. WINJ24, WDOQ24)", () => {
      const res = isSupportedAsset("WINJ24");
      expect(res.isSupported).toBe(false);
      expect(res.reason).toContain("Contrato futuro não suportado");
    });

    it("rejects standalone crypto (e.g. BTC, ETH)", () => {
      const res = isSupportedAsset("BTC");
      expect(res.isSupported).toBe(false);
      expect(res.reason).toContain("Criptoativo avulso não suportado");
    });
  });

  describe("Integration with Real Fixtures", () => {
    function loadFixture(filename: string): { headers: string[]; rows: unknown[][] } {
      const filePath = path.join(__dirname, "fixtures", filename);
      const content = fs.readFileSync(filePath, "utf8");
      const workbook = XLSX.read(content, { type: "string", raw: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: true,
      });
      const rawHeaders = (rawData[0] as unknown[]) || [];
      const headers = rawHeaders.map((h) => String(h || "").trim());
      const rows = rawData.slice(1);
      return { headers, rows };
    }

    it("parses corretora_br_semicolon.csv fixture correctly", () => {
      const { headers, rows } = loadFixture("corretora_br_semicolon.csv");
      const result = parseFile(rows, headers);

      // Total rows: 5 (PETR4, HGLG11, VALE3, PETRL300, AAPL34)
      expect(result.transactions.length).toBe(4);
      expect(result.ignored.length).toBe(1);

      // Ignored row should be the option PETRL300
      expect(result.ignored[0].lineIndex).toBe(5);
      expect(result.ignored[0].reason).toContain("PETRL300");

      // Valid transactions
      expect(result.transactions[0].ticker).toBe("PETR4");
      expect(result.transactions[0].quantity).toBe(100);
      expect(result.transactions[0].price).toBe(34.5);
      expect(result.transactions[0].costs).toBe(2.15);

      expect(result.transactions[1].ticker).toBe("HGLG11");
      expect(result.transactions[1].quantity).toBe(10);
      expect(result.transactions[1].price).toBe(165.8);

      expect(result.transactions[2].ticker).toBe("VALE3");
      expect(result.transactions[2].type).toBe("SELL");

      expect(result.transactions[3].ticker).toBe("AAPL34");
      expect(result.transactions[3].quantity).toBe(25);
    });

    it("parses corretora_us_comma.csv fixture correctly", () => {
      const { headers, rows } = loadFixture("corretora_us_comma.csv");
      const result = parseFile(rows, headers);

      // Total rows: 5 (AAPL, MSFT, O, BTC, VNQ)
      expect(result.transactions.length).toBe(4);
      expect(result.ignored.length).toBe(1);

      // Ignored row should be crypto BTC
      expect(result.ignored[0].lineIndex).toBe(5);
      expect(result.ignored[0].reason).toContain("BTC");

      // Valid transactions
      expect(result.transactions[0].ticker).toBe("AAPL");
      expect(result.transactions[0].price).toBe(185.5);

      expect(result.transactions[1].ticker).toBe("MSFT");
      expect(result.transactions[1].price).toBe(402.1);

      expect(result.transactions[2].ticker).toBe("O");
      expect(result.transactions[2].type).toBe("SELL");

      expect(result.transactions[3].ticker).toBe("VNQ");
      expect(result.transactions[3].quantity).toBe(15);
    });

    it("parses planilha_caseira_pt.csv fixture correctly", () => {
      const { headers, rows } = loadFixture("planilha_caseira_pt.csv");
      const result = parseFile(rows, headers);

      // Total rows: 5 (WEGE3, BBAS3, KNIP11, WINJ24, TAEE11)
      expect(result.transactions.length).toBe(4);
      expect(result.ignored.length).toBe(1);

      // Ignored row should be future WINJ24
      expect(result.ignored[0].lineIndex).toBe(5);
      expect(result.ignored[0].reason).toContain("WINJ24");

      // Valid transactions
      expect(result.transactions[0].ticker).toBe("WEGE3");
      expect(result.transactions[0].quantity).toBe(200);
      expect(result.transactions[0].price).toBe(38.5);

      expect(result.transactions[1].ticker).toBe("BBAS3");
      expect(result.transactions[1].quantity).toBe(150);

      expect(result.transactions[2].ticker).toBe("KNIP11");
      expect(result.transactions[2].quantity).toBe(50);

      expect(result.transactions[3].ticker).toBe("TAEE11");
      expect(result.transactions[3].quantity).toBe(100);
    });
  });
});
