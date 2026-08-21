import { describe, it, expect } from "vitest";
import {
  SELIC_FALLBACK,
  SELIC_DECIMAL,
  IPCA_FALLBACK,
  EXCHANGE_RATE_FALLBACK,
  MACRO_RATES_FALLBACK,
} from "../macroDefaults";
import {
  DEFAULT_SELIC,
  GORDON_TERMINAL_GROWTH_RATE,
} from "../calculations";

describe("macroDefaults SSOT", () => {
  it("provides canonical numeric constants", () => {
    expect(SELIC_FALLBACK).toBe(10.5);
    expect(SELIC_DECIMAL).toBe(0.105);
    expect(IPCA_FALLBACK).toBe(4.5);
    expect(EXCHANGE_RATE_FALLBACK).toBe(5.5);
    expect(MACRO_RATES_FALLBACK).toEqual({ cdi: 10.5, ipca: 4.5, selic: 10.5 });
  });

  it("maintains strict mathematical parity between percentage and decimal Selic", () => {
    expect(SELIC_DECIMAL).toBe(SELIC_FALLBACK / 100);
  });

  it("aligns calculations.ts DEFAULT_SELIC with SELIC_DECIMAL", () => {
    expect(DEFAULT_SELIC).toBe(SELIC_DECIMAL);
    expect(DEFAULT_SELIC).toBe(0.105);
  });

  it("segregates IPCA_FALLBACK (4.5%) from GORDON_TERMINAL_GROWTH_RATE (3.0%)", () => {
    // IPCA_FALLBACK is current annual inflation for fixed-income / macro oracle
    expect(IPCA_FALLBACK).toBe(4.5);
    // GORDON_TERMINAL_GROWTH_RATE is long-term perpetual growth assumption in decimal
    expect(GORDON_TERMINAL_GROWTH_RATE).toBe(0.03);
    expect(GORDON_TERMINAL_GROWTH_RATE).not.toBe(IPCA_FALLBACK / 100);
  });
});
