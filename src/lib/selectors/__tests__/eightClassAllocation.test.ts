import { describe, it, expect } from "vitest";
import {
  computeEightClassAllocations,
  computeCanonicalClassAllocations,
  classifyPositionToEightClass,
  PROTOTYPE_DEFAULT_TARGETS,
  EIGHT_CLASSES_ORDER,
} from "../eightClassAllocation";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

describe("eightClassAllocation", () => {
  it("classifies position correctly into the 8 classes", () => {
    expect(
      classifyPositionToEightClass({ type: "STOCK_BR", currency: "BRL" } as ValuedWatchlistItem),
    ).toBe("acoes_br");
    expect(
      classifyPositionToEightClass({ type: "FII", currency: "BRL" } as ValuedWatchlistItem),
    ).toBe("fiis");
    expect(
      classifyPositionToEightClass({ type: "FIAGRO", currency: "BRL" } as ValuedWatchlistItem),
    ).toBe("fiagros");
    expect(
      classifyPositionToEightClass({ type: "FII_INFRA", currency: "BRL" } as ValuedWatchlistItem),
    ).toBe("fi_infras");
    expect(
      classifyPositionToEightClass({ type: "REIT", currency: "USD" } as ValuedWatchlistItem),
    ).toBe("reits_us");
    expect(
      classifyPositionToEightClass({ type: "STOCK_US", currency: "USD" } as ValuedWatchlistItem),
    ).toBe("acoes_us");
    expect(
      classifyPositionToEightClass({ type: "ETF", currency: "USD" } as ValuedWatchlistItem),
    ).toBe("etfs_us");
    expect(
      classifyPositionToEightClass({ type: "ETF", currency: "BRL" } as ValuedWatchlistItem),
    ).toBe("etfs_br");
  });

  it("returns exactly 8 classes in prototype order with default benchmark targets when no user targets", () => {
    const allocations = computeEightClassAllocations([]);

    expect(allocations).toHaveLength(8);
    expect(allocations.map((a) => a.key)).toEqual(EIGHT_CLASSES_ORDER);
    expect(allocations[0].targetPct).toBe(PROTOTYPE_DEFAULT_TARGETS.acoes_br);
    expect(allocations[0].currentPct).toBe(0);
    expect(allocations[0].status).toBe("invest");
    expect(allocations[0].priority).toBe("priority");
  });

  it("calculates real current percentages and detects invest, balanced, and above states", () => {
    const positions: ValuedWatchlistItem[] = [
      {
        id: "1",
        ticker: "PETR4",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100,
        currentPrice: 30, // 3,000 BRL
      } as ValuedWatchlistItem,
      {
        id: "2",
        ticker: "HGLG11",
        type: "FII",
        currency: "BRL",
        quantity: 100,
        currentPrice: 70, // 7,000 BRL
      } as ValuedWatchlistItem,
    ];

    // Total = 10,000 BRL
    // Ações BR = 3,000 (30.0%) vs target 25.0% -> +5.0% -> above
    // FIIs = 7,000 (70.0%) vs target 15.0% -> +55.0% -> above
    // Fiagros = 0% vs target 5.0% -> invest
    const allocations = computeEightClassAllocations(positions, undefined, 5.0);

    const acoesBR = allocations.find((a) => a.key === "acoes_br")!;
    expect(acoesBR.currentPct).toBeCloseTo(30.0);
    expect(acoesBR.status).toBe("above");
    expect(acoesBR.priority).toBe("balanced");

    const fiis = allocations.find((a) => a.key === "fiis")!;
    expect(fiis.currentPct).toBeCloseTo(70.0);
    expect(fiis.status).toBe("above");

    const fiagros = allocations.find((a) => a.key === "fiagros")!;
    expect(fiagros.currentPct).toBe(0);
    expect(fiagros.status).toBe("invest");
    expect(fiagros.priority).toBe("priority");
  });

  it("returns exactly 3 US classes for US jurisdiction with default benchmark targets when no user targets", () => {
    const allocations = computeEightClassAllocations([], undefined, undefined, "US");

    expect(allocations).toHaveLength(3);
    expect(allocations.map((a) => a.key)).toEqual(["acoes_us", "reits_us", "etfs_us"]);

    const sumTargets = allocations.reduce((sum, a) => sum + a.targetPct, 0);
    expect(sumTargets).toBe(100);

    const acoesUS = allocations.find((a) => a.key === "acoes_us")!;
    expect(acoesUS.targetPct).toBe(45);
    expect(acoesUS.status).toBe("invest");

    // Zero BR classes in US native allocation
    expect(allocations.find((a) => a.key === "acoes_br")).toBeUndefined();
    expect(allocations.find((a) => a.key === "fiis")).toBeUndefined();
    expect(allocations.find((a) => a.key === "fiagros")).toBeUndefined();
  });

  it("computes US portfolio with user targets correctly", () => {
    const positions: ValuedWatchlistItem[] = [
      {
        id: "1",
        ticker: "KO",
        type: "STOCK_US",
        currency: "USD",
        quantity: 50,
        currentPrice: 60, // $3,000
      } as ValuedWatchlistItem,
      {
        id: "2",
        ticker: "O",
        type: "REIT",
        currency: "USD",
        quantity: 100,
        currentPrice: 50, // $5,000
      } as ValuedWatchlistItem,
      {
        id: "3",
        ticker: "VOO",
        type: "ETF",
        currency: "USD",
        quantity: 4,
        currentPrice: 500, // $2,000
      } as ValuedWatchlistItem,
    ];

    // Total = $10,000
    // KO (Stocks US) = 30%
    // O (REITs US) = 50%
    // VOO (ETFs US) = 20%
    const userTargets = {
      STOCK_US: 40,
      REIT: 30,
      ETF: 30,
    };

    const allocations = computeEightClassAllocations(positions, userTargets, 1.0, "US");

    expect(allocations).toHaveLength(3);

    const stocks = allocations.find((a) => a.key === "acoes_us")!;
    expect(stocks.currentPct).toBeCloseTo(30.0);
    expect(stocks.targetPct).toBeCloseTo(40.0);
    expect(stocks.status).toBe("invest");

    const reits = allocations.find((a) => a.key === "reits_us")!;
    expect(reits.currentPct).toBeCloseTo(50.0);
    expect(reits.targetPct).toBeCloseTo(30.0);
    expect(reits.status).toBe("above");

    const etfs = allocations.find((a) => a.key === "etfs_us")!;
    expect(etfs.currentPct).toBeCloseTo(20.0);
    expect(etfs.targetPct).toBeCloseTo(30.0);
    expect(etfs.status).toBe("invest");
  });

  describe("computeCanonicalClassAllocations", () => {
    it("respects user's real targets without arbitrary subdivisions and calculates subAllocations", () => {
      const positions: ValuedWatchlistItem[] = [
        {
          id: "1",
          ticker: "PETR4",
          type: "STOCK_BR",
          currency: "BRL",
          quantity: 100,
          currentPrice: 21.5, // 2,150 BRL (21.5%)
        } as ValuedWatchlistItem,
        {
          id: "2",
          ticker: "HGLG11",
          type: "FII",
          currency: "BRL",
          quantity: 54.3,
          currentPrice: 100, // 5,430 BRL (54.3%)
        } as ValuedWatchlistItem,
        {
          id: "3",
          ticker: "JURO11",
          type: "FII_INFRA",
          currency: "BRL",
          quantity: 12.2,
          currentPrice: 100, // 1,220 BRL (12.2%)
        } as ValuedWatchlistItem,
        {
          id: "4",
          ticker: "VGIA11",
          type: "FIAGRO",
          currency: "BRL",
          quantity: 76,
          currentPrice: 10, // 760 BRL (7.6%)
        } as ValuedWatchlistItem,
        {
          id: "5",
          ticker: "VOO",
          type: "ETF",
          currency: "USD",
          quantity: 1,
          currentPrice: 78, // 78 USD @ 5.0 = 390 BRL (3.9%)
        } as ValuedWatchlistItem,
        {
          id: "6",
          ticker: "AAPL",
          type: "STOCK_US",
          currency: "USD",
          quantity: 1,
          currentPrice: 10, // 10 USD @ 5.0 = 50 BRL (0.5%)
        } as ValuedWatchlistItem,
      ];

      const userTargets = {
        STOCK_BR: 30,
        FII: 60,
        ETF: 10,
        STOCK_US: 0,
        REIT: 0,
        FIXED_INCOME: 0,
      };

      const result = computeCanonicalClassAllocations(positions, userTargets, 5.0, "BR");

      // Verify FII canonical item
      const fiiItem = result.find((r) => r.type === "FII")!;
      expect(fiiItem).toBeDefined();
      expect(fiiItem.targetPct).toBe(60.0); // Exactly 60%, NOT 25.7%!
      expect(fiiItem.currentPct).toBeCloseTo(74.1, 1);
      expect(fiiItem.status).toBe("above");
      expect(fiiItem.priority).toBe("balanced");

      // Verify sub-allocations
      expect(fiiItem.subAllocations).toHaveLength(3);
      const subFii = fiiItem.subAllocations?.find((s) => s.rawType === "FII")!;
      const subInfra = fiiItem.subAllocations?.find((s) => s.rawType === "FII_INFRA")!;
      const subFiagro = fiiItem.subAllocations?.find((s) => s.rawType === "FIAGRO")!;
      expect(subFii.currentPct * 100).toBeCloseTo(54.3, 1);
      expect(subInfra.currentPct * 100).toBeCloseTo(12.2, 1);
      expect(subFiagro.currentPct * 100).toBeCloseTo(7.6, 1);

      // Verify STOCK_BR
      const stockItem = result.find((r) => r.type === "STOCK_BR")!;
      expect(stockItem).toBeDefined();
      expect(stockItem.targetPct).toBe(30.0);
      expect(stockItem.currentPct).toBeCloseTo(21.5, 1);
      expect(stockItem.status).toBe("invest");
      expect(stockItem.priority).toBe("priority");

      // Verify ETF
      const etfItem = result.find((r) => r.type === "ETF")!;
      expect(etfItem).toBeDefined();
      expect(etfItem.targetPct).toBe(10.0);
      expect(etfItem.currentPct).toBeCloseTo(3.9, 1);
      expect(etfItem.status).toBe("invest");
      expect(etfItem.priority).toBe("priority");
    });
  });
});

