import { describe, it, expect } from "vitest";
import { detectCsvFormat } from "../csv";

describe("detectCsvFormat (prompt 83 — SSOT format detection)", () => {
  it("detects the real header that caused the bug (PT-BR broker export) as advanced", () => {
    const header = "Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem";
    expect(detectCsvFormat(header)).toBe("advanced");
  });

  it("detects the Phase 1 simple watchlist header as simple", () => {
    const header = "Ticker,Type,Quantity,AveragePrice";
    expect(detectCsvFormat(header)).toBe("simple");
  });

  it("detects our own advanced template header as advanced (regression)", () => {
    const header = "Ticker,Data da Compra,Quantidade,Valor Unitário,Tipo";
    expect(detectCsvFormat(header)).toBe("advanced");
  });

  it("returns simple for an empty string", () => {
    expect(detectCsvFormat("")).toBe("simple");
  });
});
