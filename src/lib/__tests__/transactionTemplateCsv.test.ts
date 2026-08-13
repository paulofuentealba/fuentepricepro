import { describe, it, expect } from "vitest";
import {
  parseTransactionTemplateCsv,
  buildTransactionTemplateCsv,
  parseCurrencyValue,
  decodeCsvBytes,
} from "../csv";

describe("parseTransactionTemplateCsv & buildTransactionTemplateCsv (Item 1.7 Phase 3 Refinement)", () => {
  it("should generate sample CSV with the Tipo column included", () => {
    const csv = buildTransactionTemplateCsv();
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Ticker,Data da Compra,Quantidade,Valor Unitário,Tipo");
    expect(lines[1]).toBe("VALE3,2024-03-15,100,62.50,Compra");
  });

  it("should correctly parse PT-BR values (Compra/Venda) for Tipo column", () => {
    const csv = `Ticker,Data da Compra,Quantidade,Valor Unitário,Tipo
VALE3,2024-03-15,100,62.50,Compra
PETR4,2024-04-10,50,38.00,Venda`;

    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      ticker: "VALE3",
      quantity: 100,
      pricePerShare: 62.5,
      type: "buy",
    });
    expect(rows[1]).toMatchObject({
      ticker: "PETR4",
      quantity: 50,
      pricePerShare: 38.0,
      type: "sell",
    });
  });

  it("should correctly parse EN values (Buy/Sell) for Type column", () => {
    const csv = `Symbol,Date,Qty,Price,Type
AAPL,2024-01-20,10,185.50,Buy
MSFT,2024-02-15,5,400.00,Sell`;

    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      ticker: "AAPL",
      quantity: 10,
      pricePerShare: 185.5,
      type: "buy",
    });
    expect(rows[1]).toMatchObject({
      ticker: "MSFT",
      quantity: 5,
      pricePerShare: 400.0,
      type: "sell",
    });
  });

  it("should correctly parse ES values (Compra/Venta) for Tipo column", () => {
    const csv = `Ticker,Data,Cantidad,Precio,Tipo
BBAS3,2024-05-01,200,27.30,compra
ITUB4,2024-05-15,100,32.10,venta`;

    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      ticker: "BBAS3",
      quantity: 200,
      pricePerShare: 27.3,
      type: "buy",
    });
    expect(rows[1]).toMatchObject({
      ticker: "ITUB4",
      quantity: 100,
      pricePerShare: 32.1,
      type: "sell",
    });
  });

  it("should default to 'buy' when Tipo column is missing or unrecognized (backward compatibility)", () => {
    const csv = `Ticker,Data da Compra,Quantidade,Valor Unitário
WEGE3,2024-06-01,40,39.80
MXRF11,2024-06-10,100,10.20`;

    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe("buy");
    expect(rows[1].type).toBe("buy");
  });
});

describe("parseCurrencyValue (Prompt 81)", () => {
  it("parses USD prefix with dot decimal", () => {
    expect(parseCurrencyValue("US$8.65")).toBeCloseTo(8.65);
  });

  it("parses BRL prefix with comma decimal and NBSP", () => {
    expect(parseCurrencyValue("R$ 105,80")).toBeCloseTo(105.8);
    expect(parseCurrencyValue("R$ 105,80")).toBeCloseTo(105.8);
  });

  it("parses BRL thousand separator", () => {
    expect(parseCurrencyValue("R$ 1.234,56")).toBeCloseTo(1234.56);
  });

  it("parses USD thousand separator", () => {
    expect(parseCurrencyValue("US$1,234.56")).toBeCloseTo(1234.56);
  });

  it("parses plain numbers without a currency prefix", () => {
    expect(parseCurrencyValue("8.65")).toBeCloseTo(8.65);
    expect(parseCurrencyValue("10,00")).toBeCloseTo(10);
  });
});

describe("parseTransactionTemplateCsv date formats (Prompt 81)", () => {
  it("parses DD-MM-AA (2-digit year)", () => {
    const csv = `Ticker,Data,Quantidade,Preco,Tipo\nVALE3,17-06-26,10,62.50,Compra`;
    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(1);
    const d = new Date(rows[0].date);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June, 0-indexed
    expect(d.getDate()).toBe(17);
  });

  it("still parses AAAA-MM-DD and DD/MM/AAAA (regression)", () => {
    const csv = `Ticker,Data,Quantidade,Preco,Tipo
VALE3,2024-03-15,10,62.50,Compra
PETR4,15/03/2024,10,38.00,Venda`;
    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(2);
    expect(new Date(rows[0].date).getFullYear()).toBe(2024);
    expect(new Date(rows[1].date).getFullYear()).toBe(2024);
  });
});

describe("parseTransactionTemplateCsv real-world headers (Prompt 81)", () => {
  it("recognizes Ativo/Data do lançamento/Preço unitário/Tipo de ordem headers", () => {
    const csv = `Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem
SCM,17-06-26,"10,00",US$8.65,Compra
XPML11,08-06-26,"5,00","R$ 105,80",Compra
TLTW,04-06-26,"10,00",US$22.09,Venda`;
    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ ticker: "SCM", quantity: 10, pricePerShare: 8.65, type: "buy" });
    expect(rows[1]).toMatchObject({
      ticker: "XPML11",
      quantity: 5,
      pricePerShare: 105.8,
      type: "buy",
    });
    expect(rows[2]).toMatchObject({ ticker: "TLTW", quantity: 10, pricePerShare: 22.09, type: "sell" });
  });
});

describe("parseTransactionTemplateCsv corporate actions (Prompt 81)", () => {
  it("parses a 'Desdobramento' row as corporate_action with the right factor", () => {
    const csv = `Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem
BBAS3,15-04-24,De 1 para 2,"R$ 0,00",Desdobramento`;
    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("corporate_action");
    expect(rows[0].factor).toBe(2);
  });

  it("parses a 1-para-10 split ratio", () => {
    const csv = `Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem
GGRC11,05-03-24,De 1 para 10,"R$ 0,00",Desdobramento`;
    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].factor).toBe(10);
  });

  it("skips a corporate action row whose ratio text doesn't match 'De X para Y'", () => {
    const csv = `Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem
VALE3,2024-03-15,10,62.50,Compra
BBAS3,15-04-24,formato inesperado,"R$ 0,00",Desdobramento`;
    const rows = parseTransactionTemplateCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].ticker).toBe("VALE3");
  });
});

describe("decodeCsvBytes (Prompt 81)", () => {
  it("decodes UTF-8 bytes as UTF-8", () => {
    const bytes = new TextEncoder().encode("Ativo,Preço\nVALE3,62.50");
    expect(decodeCsvBytes(bytes.buffer)).toContain("Preço");
  });

  it("falls back to Windows-1252 for non-UTF-8 accented bytes", () => {
    // "Preço" encoded as Windows-1252 (ç = 0xE7), which is invalid UTF-8.
    const bytes = new Uint8Array([
      0x50, 0x72, 0x65, 0xe7, 0x6f, // "Pre" + 0xE7 + "o"
    ]);
    expect(decodeCsvBytes(bytes.buffer)).toBe("Preço");
  });
});
