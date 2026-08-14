// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImportParser } from "../useImportParser";

describe("useImportParser (Prompt 104)", () => {
  it("initializes with idle state", () => {
    const { result } = renderHook(() => useImportParser());
    expect(result.current.state).toBe("idle");
    expect(result.current.fileName).toBe("");
    expect(result.current.headers).toEqual([]);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("loads a CSV file into mapping state and detects columns", async () => {
    const { result } = renderHook(() => useImportParser());
    const csvContent = "Ticker,Tipo,Quantidade,Preço\nPETR4,Compra,100,34.50\nVALE3,Venda,50,68.20";
    const file = new File([csvContent], "extrato.csv", { type: "text/csv" });

    await act(async () => {
      await result.current.loadFile(file);
    });

    expect(result.current.state).toBe("mapping");
    expect(result.current.fileName).toBe("extrato.csv");
    expect(result.current.headers).toEqual(["Ticker", "Tipo", "Quantidade", "Preço"]);
    expect(result.current.columnMapping?.ticker.confidence).toBe("exact");
    expect(result.current.columnMapping?.quantity.confidence).toBe("exact");
  });

  it("processes mapping and transitions to done with parsed results", async () => {
    const { result } = renderHook(() => useImportParser());
    const csvContent = "Papel,Operação,Qtd,Valor\nWEGE3,Compra,200,38.50";
    const file = new File([csvContent], "carteira.csv", { type: "text/csv" });

    await act(async () => {
      await result.current.loadFile(file);
    });

    expect(result.current.state).toBe("mapping");

    act(() => {
      result.current.confirmMapping();
    });

    expect(result.current.state).toBe("done");
    expect(result.current.result).toBeDefined();
    expect(result.current.result?.transactions.length).toBe(1);
    expect(result.current.result?.transactions[0].ticker).toBe("WEGE3");
  });
});
