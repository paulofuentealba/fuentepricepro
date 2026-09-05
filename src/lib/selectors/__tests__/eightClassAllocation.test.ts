import { describe, it, expect } from "vitest";
import {
  computeEightClassAllocations,
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
});
