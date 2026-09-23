// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssetClassFilter } from "../useAssetClassFilter";
import type { EightClassKey } from "../eightClassAllocation";

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => ({
    taxJurisdiction: "BR",
    isUSNative: false,
    visibleAllocationClasses: [
      "acoes_br",
      "fiis",
      "fiagros",
      "fi_infras",
      "reits_us",
      "etfs_us",
      "etfs_br",
      "acoes_us",
    ] as EightClassKey[],
  }),
}));

describe("useAssetClassFilter", () => {
  const mockItems = [
    { id: "1", ticker: "BBAS3", type: "STOCK_BR", currency: "BRL", isClosedPosition: false, quantity: 100 },
    { id: "2", ticker: "VALE3", type: "STOCK_BR", currency: "BRL", isClosedPosition: false, quantity: 50 },
    { id: "3", ticker: "HGLG11", type: "FII", currency: "BRL", isClosedPosition: false, quantity: 10 },
    { id: "4", ticker: "AAPL", type: "STOCK_US", currency: "USD", isClosedPosition: false, quantity: 5 },
    { id: "5", ticker: "CLOSED", type: "STOCK_BR", currency: "BRL", isClosedPosition: true, quantity: 0 },
  ];

  it("returns all items when activeFilter is 'ALL'", () => {
    const { result } = renderHook(() => useAssetClassFilter(mockItems));

    expect(result.current.activeFilter).toBe("ALL");
    expect(result.current.filteredItems).toHaveLength(5);
    expect(result.current.totalCount).toBe(5);
    expect(result.current.countsByClass.ALL).toBe(5);
    expect(result.current.countsByClass.acoes_br).toBe(3);
    expect(result.current.countsByClass.fiis).toBe(1);
    expect(result.current.countsByClass.acoes_us).toBe(1);
  });

  it("filters items correctly when activeFilter is changed to a specific class", () => {
    const { result } = renderHook(() => useAssetClassFilter(mockItems));

    act(() => {
      result.current.setActiveFilter("acoes_br");
    });

    expect(result.current.activeFilter).toBe("acoes_br");
    expect(result.current.filteredItems).toHaveLength(3);
    expect(result.current.filteredItems.every((i) => i.type === "STOCK_BR")).toBe(true);

    act(() => {
      result.current.setActiveFilter("fiis");
    });

    expect(result.current.activeFilter).toBe("fiis");
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].ticker).toBe("HGLG11");
  });

  it("respects filterPredicate to ignore closed positions", () => {
    const { result } = renderHook(() =>
      useAssetClassFilter(mockItems, {
        filterPredicate: (i) => !i.isClosedPosition && (i.quantity ?? 0) > 0,
      }),
    );

    expect(result.current.totalCount).toBe(4);
    expect(result.current.countsByClass.ALL).toBe(4);
    expect(result.current.countsByClass.acoes_br).toBe(2);
    expect(result.current.filteredItems).toHaveLength(4);
    expect(result.current.filteredItems.find((i) => i.ticker === "CLOSED")).toBeUndefined();
  });

  it("only includes existing classes when onlyExisting is true", () => {
    const { result } = renderHook(() =>
      useAssetClassFilter(mockItems, {
        filterPredicate: (i) => !i.isClosedPosition && (i.quantity ?? 0) > 0,
        onlyExisting: true,
      }),
    );

    // Mock dataset has only STOCK_BR, FII, and STOCK_US (active)
    expect(result.current.availableClasses).toEqual(["acoes_br", "fiis", "acoes_us"]);
  });

  it("includes all visible allocation classes when onlyExisting is false", () => {
    const { result } = renderHook(() =>
      useAssetClassFilter(mockItems, {
        onlyExisting: false,
      }),
    );

    expect(result.current.availableClasses).toHaveLength(8);
    expect(result.current.availableClasses).toContain("fiagros");
    expect(result.current.availableClasses).toContain("reits_us");
  });
});
