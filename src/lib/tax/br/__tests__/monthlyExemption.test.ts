import { describe, it, expect } from "vitest";
import { calculateMonthlyCapitalGainsTax } from "../monthlyExemption";
import type { RealizedGainEvent } from "../../types";

describe("calculateMonthlyCapitalGainsTax (Prompt 140 / Item 2.1c)", () => {
  const tsJan = new Date(2026, 0, 15).getTime();
  const tsFeb = new Date(2026, 1, 15).getTime();
  const tsMar = new Date(2026, 2, 15).getTime();
  const tsApr = new Date(2026, 3, 15).getTime();

  it("identifies month as exempt when total sales <= R$ 20k, even with high relative gain", () => {
    // Sales = R$ 15,000, Gain = R$ 8,000
    const events: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: tsJan,
        quantity: 500,
        salePrice: 30,
        proceeds: 15000,
        costBasis: 7000,
        gain: 8000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 15000,
      totalGain: 8000,
      isExempt: true,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 0,
      taxDue: 0,
    });
  });

  it("does NOT add loss to carryforward when month is exempt (sales <= R$ 20k)", () => {
    // Jan: sales R$ 10,000, loss R$ -3,000 (exempt month)
    // Feb: sales R$ 25,000, gain R$ 5,000 (non-exempt month)
    const events: RealizedGainEvent[] = [
      {
        ticker: "VALE3",
        saleDate: tsJan,
        quantity: 200,
        salePrice: 50,
        proceeds: 10000,
        costBasis: 13000,
        gain: -3000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "VALE3",
        saleDate: tsFeb,
        quantity: 500,
        salePrice: 50,
        proceeds: 25000,
        costBasis: 20000,
        gain: 5000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    expect(results).toHaveLength(2);

    // Jan is exempt -> loss carryforward remains 0
    expect(results[0].month).toBe("2026-01");
    expect(results[0].isExempt).toBe(true);
    expect(results[0].lossCarryforwardRemaining).toBe(0);

    // Feb is non-exempt -> cannot offset the exempt Jan loss, taxes full 5000 at 15% (750)
    expect(results[1].month).toBe("2026-02");
    expect(results[1].isExempt).toBe(false);
    expect(results[1].lossCarryforwardUsed).toBe(0);
    expect(results[1].taxableGain).toBe(5000);
    expect(results[1].taxDue).toBe(750);
  });

  it("accumulates loss into carryforward when month is non-exempt (sales > R$ 20k)", () => {
    // Jan: sales R$ 25,000, loss R$ -4,000
    const events: RealizedGainEvent[] = [
      {
        ticker: "BBAS3",
        saleDate: tsJan,
        quantity: 500,
        salePrice: 50,
        proceeds: 25000,
        costBasis: 29000,
        gain: -4000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 25000,
      totalGain: -4000,
      isExempt: false,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 4000,
      taxableGain: 0,
      taxDue: 0,
    });
  });

  it("taxes 15% on full gain when sales > R$ 20k and no loss carryforward exists", () => {
    // Jan: sales R$ 30,000, gain R$ 10,000
    const events: RealizedGainEvent[] = [
      {
        ticker: "WEGE3",
        saleDate: tsJan,
        quantity: 1000,
        salePrice: 30,
        proceeds: 30000,
        costBasis: 20000,
        gain: 10000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 30000,
      totalGain: 10000,
      isExempt: false,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 10000,
      taxDue: 1500, // 10000 * 0.15
    });
  });

  it("fully offsets taxable gain when prior loss carryforward exceeds monthly gain", () => {
    // Jan: sales R$ 30,000, gain R$ 6,000
    // priorLossCarryforward = R$ 10,000
    const events: RealizedGainEvent[] = [
      {
        ticker: "ITUB4",
        saleDate: tsJan,
        quantity: 1000,
        salePrice: 30,
        proceeds: 30000,
        costBasis: 24000,
        gain: 6000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events, 10000);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 30000,
      totalGain: 6000,
      isExempt: false,
      lossCarryforwardUsed: 6000,
      lossCarryforwardRemaining: 4000, // 10000 - 6000
      taxableGain: 0,
      taxDue: 0,
    });
  });

  it("partially offsets taxable gain and taxes remainder at 15%", () => {
    // Jan: sales R$ 30,000, gain R$ 10,000
    // priorLossCarryforward = R$ 4,000
    const events: RealizedGainEvent[] = [
      {
        ticker: "BBDC4",
        saleDate: tsJan,
        quantity: 1000,
        salePrice: 30,
        proceeds: 30000,
        costBasis: 20000,
        gain: 10000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events, 4000);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 30000,
      totalGain: 10000,
      isExempt: false,
      lossCarryforwardUsed: 4000,
      lossCarryforwardRemaining: 0,
      taxableGain: 6000, // 10000 - 4000
      taxDue: 900,       // 6000 * 0.15
    });
  });

  it("propagates carryforward correctly across 3+ intercalated months (loss -> exempt -> gain)", () => {
    // Jan (M1): Sales R$ 25,000, Loss -R$ 5,000 (non-exempt -> carryforward becomes 5000)
    // Feb (M2): Sales R$ 15,000, Gain R$ 3,000  (exempt -> taxDue 0, carryforward remains 5000)
    // Mar (M3): Sales R$ 30,000, Gain R$ 8,000  (non-exempt -> uses 5000 carryforward, taxableGain = 3000, taxDue = 450)
    // Apr (M4): Sales R$ 22,000, Gain R$ 4,000  (non-exempt -> no carryforward remaining, taxableGain = 4000, taxDue = 600)
    const events: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: tsJan,
        quantity: 1000,
        salePrice: 25,
        proceeds: 25000,
        costBasis: 30000,
        gain: -5000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "VALE3",
        saleDate: tsFeb,
        quantity: 300,
        salePrice: 50,
        proceeds: 15000,
        costBasis: 12000,
        gain: 3000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "ITUB4",
        saleDate: tsMar,
        quantity: 1000,
        salePrice: 30,
        proceeds: 30000,
        costBasis: 22000,
        gain: 8000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "BBDC4",
        saleDate: tsApr,
        quantity: 1000,
        salePrice: 22,
        proceeds: 22000,
        costBasis: 18000,
        gain: 4000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    expect(results).toHaveLength(4);

    // M1 - Jan
    expect(results[0].month).toBe("2026-01");
    expect(results[0].isExempt).toBe(false);
    expect(results[0].lossCarryforwardRemaining).toBe(5000);
    expect(results[0].taxDue).toBe(0);

    // M2 - Feb
    expect(results[1].month).toBe("2026-02");
    expect(results[1].isExempt).toBe(true);
    expect(results[1].lossCarryforwardUsed).toBe(0);
    expect(results[1].lossCarryforwardRemaining).toBe(5000); // Intact!
    expect(results[1].taxDue).toBe(0);

    // M3 - Mar
    expect(results[2].month).toBe("2026-03");
    expect(results[2].isExempt).toBe(false);
    expect(results[2].lossCarryforwardUsed).toBe(5000);
    expect(results[2].lossCarryforwardRemaining).toBe(0);
    expect(results[2].taxableGain).toBe(3000);
    expect(results[2].taxDue).toBe(450); // 3000 * 0.15

    // M4 - Apr
    expect(results[3].month).toBe("2026-04");
    expect(results[3].isExempt).toBe(false);
    expect(results[3].lossCarryforwardUsed).toBe(0);
    expect(results[3].lossCarryforwardRemaining).toBe(0);
    expect(results[3].taxableGain).toBe(4000);
    expect(results[3].taxDue).toBe(600); // 4000 * 0.15
  });

  it("excludes FIIs and ETFs from the Brazilian stock 20k exemption calculation", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 160,
        proceeds: 16000,
        costBasis: 15000,
        gain: 1000,
        assetType: "FII",
      },
      {
        ticker: "BOVA11",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 120,
        proceeds: 12000,
        costBasis: 10000,
        gain: 2000,
        assetType: "ETF",
      },
      {
        ticker: "PETR4",
        saleDate: tsJan,
        quantity: 300,
        salePrice: 30,
        proceeds: 9000,
        costBasis: 8000,
        gain: 1000,
        assetType: "STOCK_BR",
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    // Only PETR4 should be calculated here (total sales = 9000 <= 20k -> exempt)
    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(9000);
    expect(results[0].totalGain).toBe(1000);
    expect(results[0].isExempt).toBe(true);
  });

  it("resolves assetType from assetTypeByTicker parameter when not attached to event", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "BBAS3",
        saleDate: tsJan,
        quantity: 500,
        salePrice: 50,
        proceeds: 25000,
        costBasis: 20000,
        gain: 5000,
      },
      {
        ticker: "KNRI11",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 150,
        proceeds: 15000,
        costBasis: 14000,
        gain: 1000,
      },
    ];

    const assetTypeMap = new Map([
      ["BBAS3", "STOCK_BR" as const],
      ["KNRI11", "FII" as const],
    ]);

    const results = calculateMonthlyCapitalGainsTax(events, 0, assetTypeMap);
    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(25000); // KNRI11 excluded
    expect(results[0].totalGain).toBe(5000);
    expect(results[0].isExempt).toBe(false);
    expect(results[0].taxDue).toBe(750);
  });

  it("excludes unclassified tickers from totalSales/totalGain and reports them in unclassifiedTickers", () => {
    // PETR4: R$ 15,000 sales, R$ 2,000 gain (STOCK_BR)
    // UNKNOWN1: R$ 10,000 sales, R$ 3,000 gain (no assetType, not in map)
    // If UNKNOWN1 were wrongly included, totalSales = 25,000 (>20k -> non-exempt, tax = 750).
    // Correct behavior: UNKNOWN1 excluded, totalSales = 15,000 (<=20k -> exempt, tax = 0), and unclassifiedTickers = ["UNKNOWN1"].
    const events: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: tsJan,
        quantity: 500,
        salePrice: 30,
        proceeds: 15000,
        costBasis: 13000,
        gain: 2000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "UNKNOWN1",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 100,
        proceeds: 10000,
        costBasis: 7000,
        gain: 3000,
        // assetType is undefined
      },
    ];

    const results = calculateMonthlyCapitalGainsTax(events);
    expect(results).toHaveLength(1);

    const jan = results[0];
    expect(jan.month).toBe("2026-01");
    expect(jan.totalSales).toBe(15000); // Only PETR4, NOT 25000!
    expect(jan.totalGain).toBe(2000);   // Only PETR4, NOT 5000!
    expect(jan.isExempt).toBe(true);    // 15k <= 20k -> exempt!
    expect(jan.taxDue).toBe(0);
    expect(jan.unclassifiedTickers).toEqual(["UNKNOWN1"]);
  });

  it("returns an empty array when no events are provided", () => {
    expect(calculateMonthlyCapitalGainsTax([])).toEqual([]);
  });

  it("is pure and idempotent across consecutive executions", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: tsJan,
        quantity: 1000,
        salePrice: 30,
        proceeds: 30000,
        costBasis: 20000,
        gain: 10000,
        assetType: "STOCK_BR",
      },
    ];

    const res1 = calculateMonthlyCapitalGainsTax(events, 2000);
    const res2 = calculateMonthlyCapitalGainsTax(events, 2000);

    expect(res1).toEqual(res2);
  });
});
