import { describe, it, expect } from "vitest";
import { buildUserDataExport } from "../dataExport";

describe("buildUserDataExport", () => {
  it("should construct a valid export payload from user data", () => {
    const input = {
      userDoc: {
        targetYield: 6,
        displayCurrency: "BRL",
        issuerTickerMappings: { CNPJ123: "PETR4" },
      },
      localIssuerTickerMappings: { CNPJ456: "VALE3" },
      assets: [
        { id: "STOCK_BR:PETR4", ticker: "PETR4", currentPrice: 38.5, quantity: 100 },
      ],
      transactions: [
        {
          id: "tx-1",
          ticker: "PETR4",
          type: "buy",
          date: 1700000000000,
          quantity: 100,
          pricePerShare: 35.0,
          thesisSnapshot: {
            consensusPrice: 42.0,
            bazinPrice: 40.0,
            grahamPrice: 45.0,
            gordonPrice: 41.0,
            purchasePrice: 35.0,
            safetyMarginVsConsensus: 20.0,
            payoutRatio: 0.5,
            dividendYield: 8.5,
            dividendCagr5y: 12.0,
            piotroskiScore: 8,
            isYieldTrap: false,
            valuationVersion: "fuente-v1",
            capturedAt: 1700000000000,
          },
        },
      ],
      portfolioSnapshots: [
        { date: "2026-08-01", totalValueBRL: 3850, totalInvestedBRL: 3500, createdAt: 1700000000000 },
      ],
      feedbacks: [
        { id: "fb-1", message: "Great app!", createdAt: "2026-08-01T10:00:00.000Z" },
      ],
      metadata: {
        userId: "user-123",
        email: "test@example.com",
        exportedAt: "2026-08-07T12:00:00.000Z",
      },
    };

    const result = buildUserDataExport(input);

    expect(result.version).toBe("1.0");
    expect(result.exportedAt).toBe("2026-08-07T12:00:00.000Z");
    expect(result.user.uid).toBe("user-123");
    expect(result.user.email).toBe("test@example.com");
    expect(result.user.profileAndSettings).toEqual({
      targetYield: 6,
      displayCurrency: "BRL",
    });
    expect(result.user.issuerTickerMappings).toEqual({
      CNPJ123: "PETR4",
      CNPJ456: "VALE3",
    });
    expect(result.data.assets).toHaveLength(1);
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.transactions[0].thesisSnapshot).toEqual({
      consensusPrice: 42.0,
      bazinPrice: 40.0,
      grahamPrice: 45.0,
      gordonPrice: 41.0,
      purchasePrice: 35.0,
      safetyMarginVsConsensus: 20.0,
      payoutRatio: 0.5,
      dividendYield: 8.5,
      dividendCagr5y: 12.0,
      piotroskiScore: 8,
      isYieldTrap: false,
      valuationVersion: "fuente-v1",
      capturedAt: 1700000000000,
    });
    expect(result.data.portfolioSnapshots).toHaveLength(1);
    expect(result.data.feedbacks).toHaveLength(1);
    expect(result.data.feedbacks[0].message).toBe("Great app!");
  });

  it("should exclude enrichedFundamentals public market data", () => {
    const input = {
      userDoc: {
        targetYield: 6,
        enrichedFundamentals: { PETR4: { P_L: 4.5 } },
      },
      assets: [
        {
          id: "STOCK_BR:PETR4",
          ticker: "PETR4",
          enrichedFundamentals: { P_L: 4.5, ROIC: 25 },
        },
      ],
      metadata: {
        userId: "user-123",
        exportedAt: "2026-08-07T12:00:00.000Z",
      },
    };

    const result = buildUserDataExport(input);

    expect((result.user.profileAndSettings as any).enrichedFundamentals).toBeUndefined();
    expect((result.data.assets[0] as any).enrichedFundamentals).toBeUndefined();
  });

  it("should merge local and cloud issuerTickerMappings with cloud taking precedence on conflict", () => {
    const input = {
      userDoc: {
        issuerTickerMappings: { CNPJ1: "PETR4_CLOUD", CNPJ2: "VALE3_CLOUD" },
      },
      localIssuerTickerMappings: { CNPJ1: "PETR4_LOCAL", CNPJ3: "ITUB4_LOCAL" },
      metadata: {
        userId: "user-123",
        exportedAt: "2026-08-07T12:00:00.000Z",
      },
    };

    const result = buildUserDataExport(input);

    expect(result.user.issuerTickerMappings).toEqual({
      CNPJ1: "PETR4_CLOUD", // Cloud wins conflict
      CNPJ2: "VALE3_CLOUD",
      CNPJ3: "ITUB4_LOCAL",
    });
  });

  it("should handle empty or null inputs gracefully", () => {
    const input = {
      userDoc: null,
      localIssuerTickerMappings: null,
      assets: undefined,
      transactions: undefined,
      portfolioSnapshots: undefined,
      metadata: {
        userId: "user-empty",
        email: null,
        exportedAt: "2026-08-07T12:00:00.000Z",
      },
    };

    const result = buildUserDataExport(input);

    expect(result.user.uid).toBe("user-empty");
    expect(result.user.email).toBeNull();
    expect(result.user.profileAndSettings).toEqual({});
    expect(result.user.issuerTickerMappings).toEqual({});
    expect(result.data.assets).toEqual([]);
    expect(result.data.transactions).toEqual([]);
    expect(result.data.portfolioSnapshots).toEqual([]);
    expect(result.data.feedbacks).toEqual([]);
  });

  it("should include classTargetYields and exclusion toggles in exported profileAndSettings", () => {
    const input = {
      userDoc: {
        settings: {
          targetYield: 6,
          displayCurrency: "BRL",
          smartAllocationTargets: { STOCK_BR: 40, FII: 60 },
          classTargetYields: { STOCK_BR: 6.5, FII: 8.5 },
          excludeAboveCeiling: true,
          excludeYieldTraps: true,
        },
      },
      metadata: {
        userId: "user-with-class-yields",
        email: "investor@example.com",
        exportedAt: "2026-08-26T12:00:00.000Z",
      },
    };

    const result = buildUserDataExport(input);

    expect(result.user.profileAndSettings.settings).toEqual({
      targetYield: 6,
      displayCurrency: "BRL",
      smartAllocationTargets: { STOCK_BR: 40, FII: 60 },
      classTargetYields: { STOCK_BR: 6.5, FII: 8.5 },
      excludeAboveCeiling: true,
      excludeYieldTraps: true,
    });
  });

  it("should include disclaimerAcceptedVersion and disclaimerAcceptedAt in exported profileAndSettings", () => {
    const input = {
      userDoc: {
        disclaimerAcceptedVersion: "v1",
        disclaimerAcceptedAt: 1770000000000,
        settings: {
          targetYield: 6,
          displayCurrency: "BRL",
        },
      },
      metadata: {
        userId: "user-with-disclaimer",
        email: "legal@example.com",
        exportedAt: "2026-08-26T12:00:00.000Z",
      },
    };

    const result = buildUserDataExport(input);

    expect(result.user.profileAndSettings.disclaimerAcceptedVersion).toBe("v1");
    expect(result.user.profileAndSettings.disclaimerAcceptedAt).toBe(1770000000000);
  });
});
