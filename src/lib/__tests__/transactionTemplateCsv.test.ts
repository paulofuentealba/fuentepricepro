import { describe, it, expect } from "vitest";
import {
  parseTransactionTemplateCsv,
  buildTransactionTemplateCsv,
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
