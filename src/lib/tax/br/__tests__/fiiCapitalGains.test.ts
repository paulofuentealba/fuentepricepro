import { describe, it, expect } from "vitest";
import { calculateFiiCapitalGainsTax, BR_FII_CAPITAL_GAINS_RATE } from "../fiiCapitalGains";
import { calculateMonthlyCapitalGainsTax } from "../monthlyExemption";
import type { RealizedGainEvent } from "../../types";

describe("calculateFiiCapitalGainsTax (Prompt 141 / Item 2.1d)", () => {
  const tsJan = new Date(2026, 0, 15).getTime();
  const tsFeb = new Date(2026, 1, 15).getTime();
  const tsMar = new Date(2026, 2, 15).getTime();

  it("exports BR_FII_CAPITAL_GAINS_RATE as 0.20", () => {
    expect(BR_FII_CAPITAL_GAINS_RATE).toBe(0.2);
  });

  it("taxes 20% on FII capital gain even for low sales volume (NO R$ 20k exemption)", () => {
    // Sales = R$ 1,600, Gain = R$ 200 (well below 20k, but FII has NO exemption)
    const events: RealizedGainEvent[] = [
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 10,
        salePrice: 160,
        proceeds: 1600,
        costBasis: 1400,
        gain: 200,
        assetType: "FII",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 1600,
      totalGain: 200,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 200,
      taxDue: 40, // 200 * 0.20 = 40
    });
  });

  it("accumulates FII net loss into carryforward and results in taxDue = 0", () => {
    // Jan: Sales = R$ 3,000, Loss = -R$ 500
    const events: RealizedGainEvent[] = [
      {
        ticker: "KNRI11",
        saleDate: tsJan,
        quantity: 20,
        salePrice: 150,
        proceeds: 3000,
        costBasis: 3500,
        gain: -500,
        assetType: "FII",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 3000,
      totalGain: -500,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 500,
      taxableGain: 0,
      taxDue: 0,
    });
  });

  it("offsets FII carryforward first and taxes remaining gain at 20%", () => {
    // Jan: Sales = R$ 5,000, Gain = R$ 1,000
    // priorLossCarryforward = R$ 400
    const events: RealizedGainEvent[] = [
      {
        ticker: "XPLG11",
        saleDate: tsJan,
        quantity: 50,
        salePrice: 100,
        proceeds: 5000,
        costBasis: 4000,
        gain: 1000,
        assetType: "FII",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events, 400);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 5000,
      totalGain: 1000,
      lossCarryforwardUsed: 400,
      lossCarryforwardRemaining: 0,
      taxableGain: 600, // 1000 - 400
      taxDue: 120,      // 600 * 0.20
    });
  });

  it("propagates FII carryforward correctly across consecutive months (loss -> offset gain -> new gain)", () => {
    // Jan (M1): Sales R$ 4,000, Loss -R$ 800 -> carryforward becomes 800
    // Feb (M2): Sales R$ 6,000, Gain R$ 500 -> uses 500 carryforward, remaining 300, taxDue = 0
    // Mar (M3): Sales R$ 8,000, Gain R$ 1,000 -> uses 300 carryforward, remaining 0, taxableGain = 700, taxDue = 140
    const events: RealizedGainEvent[] = [
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 25,
        salePrice: 160,
        proceeds: 4000,
        costBasis: 4800,
        gain: -800,
        assetType: "FII",
      },
      {
        ticker: "KNRI11",
        saleDate: tsFeb,
        quantity: 40,
        salePrice: 150,
        proceeds: 6000,
        costBasis: 5500,
        gain: 500,
        assetType: "FII",
      },
      {
        ticker: "VISC11",
        saleDate: tsMar,
        quantity: 80,
        salePrice: 100,
        proceeds: 8000,
        costBasis: 7000,
        gain: 1000,
        assetType: "FII",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(3);

    // M1 - Jan
    expect(results[0].month).toBe("2026-01");
    expect(results[0].lossCarryforwardRemaining).toBe(800);
    expect(results[0].taxDue).toBe(0);

    // M2 - Feb
    expect(results[1].month).toBe("2026-02");
    expect(results[1].lossCarryforwardUsed).toBe(500);
    expect(results[1].lossCarryforwardRemaining).toBe(300);
    expect(results[1].taxableGain).toBe(0);
    expect(results[1].taxDue).toBe(0);

    // M3 - Mar
    expect(results[2].month).toBe("2026-03");
    expect(results[2].lossCarryforwardUsed).toBe(300);
    expect(results[2].lossCarryforwardRemaining).toBe(0);
    expect(results[2].taxableGain).toBe(700);
    expect(results[2].taxDue).toBe(140); // 700 * 0.20
  });

  it("strictly isolates FII calculations and carryforwards from stock calculations (Cross Isolation Test)", () => {
    // Mixed event list in January:
    // 1. Stock sale: PETR4, proceeds R$ 15,000, gain R$ 3,000 (STOCK_BR)
    // 2. Stock sale: VALE3, proceeds R$ 30,000, loss -R$ 4,000 (STOCK_BR)
    // 3. FII sale: HGLG11, proceeds R$ 5,000, gain R$ 1,000 (FII)
    const mixedEvents: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: tsJan,
        quantity: 500,
        salePrice: 30,
        proceeds: 15000,
        costBasis: 12000,
        gain: 3000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "VALE3",
        saleDate: tsJan,
        quantity: 600,
        salePrice: 50,
        proceeds: 30000,
        costBasis: 34000,
        gain: -4000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 30,
        salePrice: 166.67,
        proceeds: 5000,
        costBasis: 4000,
        gain: 1000,
        assetType: "FII",
      },
    ];

    // 1. Calculate FII tax: only HGLG11 is processed
    const fiiResults = calculateFiiCapitalGainsTax(mixedEvents);
    expect(fiiResults).toHaveLength(1);
    expect(fiiResults[0].totalSales).toBe(5000);
    expect(fiiResults[0].totalGain).toBe(1000);
    expect(fiiResults[0].taxableGain).toBe(1000);
    expect(fiiResults[0].taxDue).toBe(200); // 1000 * 0.20 (FII loss carryforward was 0, stock loss did NOT offset it)

    // 2. Calculate Stock tax: only PETR4 + VALE3 are processed
    const stockResults = calculateMonthlyCapitalGainsTax(mixedEvents);
    expect(stockResults).toHaveLength(1);
    expect(stockResults[0].totalSales).toBe(45000); // 15000 + 30000 (HGLG11 excluded)
    expect(stockResults[0].totalGain).toBe(-1000);  // 3000 - 4000 (HGLG11 gain did NOT offset stock loss)
    expect(stockResults[0].isExempt).toBe(false);
    expect(stockResults[0].lossCarryforwardRemaining).toBe(1000);
    expect(stockResults[0].taxDue).toBe(0);
  });

  it("excludes unclassified tickers from totalSales/totalGain and reports them in unclassifiedTickers", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 10,
        salePrice: 160,
        proceeds: 1600,
        costBasis: 1400,
        gain: 200,
        assetType: "FII",
      },
      {
        ticker: "UNKNOWN_TICKER",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 50,
        proceeds: 5000,
        costBasis: 4000,
        gain: 1000,
        // assetType undefined
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(1600); // UNKNOWN_TICKER excluded
    expect(results[0].totalGain).toBe(200);
    expect(results[0].taxDue).toBe(40);
    expect(results[0].unclassifiedTickers).toEqual(["UNKNOWN_TICKER"]);
  });

  it("includes FIAGRO and taxes 20% flat without volume exemption (Lei 14.130/2021)", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "KNCA11",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 105,
        proceeds: 10500,
        costBasis: 10000,
        gain: 500,
        assetType: "FIAGRO",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 10500,
      totalGain: 500,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 500,
      taxDue: 100, // 20% of 500 = 100
    });
  });

  it("proves mutual carryforward sharing between FII and FIAGRO in the same track", () => {
    // Month 1: FII loss of R$ 5,000
    // Month 2: FIAGRO gain of R$ 8,000
    // Expected: FIAGRO gain consumes R$ 5,000 FII loss carryforward, taxes remaining R$ 3,000 at 20% = R$ 600
    const events: RealizedGainEvent[] = [
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 50,
        salePrice: 150,
        proceeds: 7500,
        costBasis: 12500,
        gain: -5000,
        assetType: "FII",
      },
      {
        ticker: "RURA11",
        saleDate: tsFeb,
        quantity: 800,
        salePrice: 10,
        proceeds: 8000,
        costBasis: 0,
        gain: 8000,
        assetType: "FIAGRO",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(2);

    // Month 1: FII loss accumulated
    expect(results[0].month).toBe("2026-01");
    expect(results[0].totalGain).toBe(-5000);
    expect(results[0].lossCarryforwardRemaining).toBe(5000);
    expect(results[0].taxDue).toBe(0);

    // Month 2: FIAGRO gain offsets FII loss
    expect(results[1].month).toBe("2026-02");
    expect(results[1].totalGain).toBe(8000);
    expect(results[1].lossCarryforwardUsed).toBe(5000);
    expect(results[1].lossCarryforwardRemaining).toBe(0);
    expect(results[1].taxableGain).toBe(3000);
    expect(results[1].taxDue).toBe(600); // 20% of 3000
  });

  it("strictly excludes FII_INFRA, ETF, and STOCK_BR from calculateFiiCapitalGainsTax", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "JURO11",
        saleDate: tsJan,
        quantity: 10,
        salePrice: 100,
        proceeds: 1000,
        costBasis: 900,
        gain: 100,
        assetType: "FII_INFRA",
      },
      {
        ticker: "BOVA11",
        saleDate: tsJan,
        quantity: 10,
        salePrice: 120,
        proceeds: 1200,
        costBasis: 1000,
        gain: 200,
        assetType: "ETF",
      },
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 10,
        salePrice: 160,
        proceeds: 1600,
        costBasis: 1400,
        gain: 200,
        assetType: "FII",
      },
      {
        ticker: "VGIA11",
        saleDate: tsJan,
        quantity: 100,
        salePrice: 9,
        proceeds: 900,
        costBasis: 800,
        gain: 100,
        assetType: "FIAGRO",
      },
    ];

    const results = calculateFiiCapitalGainsTax(events);
    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(2500); // 1600 (HGLG11) + 900 (VGIA11)
    expect(results[0].totalGain).toBe(300);   // 200 + 100
    expect(results[0].taxDue).toBe(60);      // 300 * 0.20
  });

  it("returns an empty array when no events are provided", () => {
    expect(calculateFiiCapitalGainsTax([])).toEqual([]);
  });

  it("is pure and idempotent across consecutive executions", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "HGLG11",
        saleDate: tsJan,
        quantity: 10,
        salePrice: 160,
        proceeds: 1600,
        costBasis: 1400,
        gain: 200,
        assetType: "FII",
      },
    ];

    const res1 = calculateFiiCapitalGainsTax(events, 50);
    const res2 = calculateFiiCapitalGainsTax(events, 50);

    expect(res1).toEqual(res2);
  });
});
