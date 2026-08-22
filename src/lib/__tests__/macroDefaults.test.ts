import { describe, it, expect } from "vitest";
import {
  SELIC_FALLBACK,
  SELIC_DECIMAL,
  IPCA_FALLBACK,
  EXCHANGE_RATE_FALLBACK,
  MACRO_RATES_FALLBACK,
  US_TREASURY_10Y_FALLBACK,
  US_COST_OF_EQUITY_FALLBACK,
  US_TERMINAL_GROWTH_FALLBACK,
  NTN_B_FLOOR_FALLBACK,
  REIT_TREASURY_SPREAD_FALLBACK,
} from "../macroDefaults";
import {
  DEFAULT_SELIC,
  GORDON_TERMINAL_GROWTH_RATE,
} from "../calculations";
import { DEFAULT_US_TREASURY_10Y } from "../api/fred.server";

describe("macroDefaults SSOT", () => {
  it("provides canonical numeric constants", () => {
    expect(SELIC_FALLBACK).toBe(10.5);
    expect(SELIC_DECIMAL).toBe(0.105);
    expect(IPCA_FALLBACK).toBe(4.5);
    expect(EXCHANGE_RATE_FALLBACK).toBe(5.5);
    expect(US_TREASURY_10Y_FALLBACK).toBe(4.25);
    expect(US_COST_OF_EQUITY_FALLBACK).toBe(0.085);
    expect(US_TERMINAL_GROWTH_FALLBACK).toBe(0.025);
    expect(NTN_B_FLOOR_FALLBACK).toBe(5.5);
    expect(REIT_TREASURY_SPREAD_FALLBACK).toBe(2.75);
    expect(MACRO_RATES_FALLBACK).toEqual({ cdi: 10.5, ipca: 4.5, selic: 10.5 });
  });

  it("maintains strict mathematical parity between percentage and decimal Selic", () => {
    expect(SELIC_DECIMAL).toBe(SELIC_FALLBACK / 100);
  });

  it("aligns calculations.ts DEFAULT_SELIC with SELIC_DECIMAL", () => {
    expect(DEFAULT_SELIC).toBe(SELIC_DECIMAL);
    expect(DEFAULT_SELIC).toBe(0.105);
  });

  it("aligns fred.server.ts DEFAULT_US_TREASURY_10Y with US_TREASURY_10Y_FALLBACK", () => {
    expect(DEFAULT_US_TREASURY_10Y).toBe(US_TREASURY_10Y_FALLBACK);
    expect(DEFAULT_US_TREASURY_10Y).toBe(4.25);
  });

  it("segregates IPCA_FALLBACK (4.5%) from GORDON_TERMINAL_GROWTH_RATE (3.0%)", () => {
    // IPCA_FALLBACK is current annual inflation for fixed-income / macro oracle
    expect(IPCA_FALLBACK).toBe(4.5);
    // GORDON_TERMINAL_GROWTH_RATE is long-term perpetual growth assumption in decimal
    expect(GORDON_TERMINAL_GROWTH_RATE).toBe(0.03);
    expect(GORDON_TERMINAL_GROWTH_RATE).not.toBe(IPCA_FALLBACK / 100);
  });
});
