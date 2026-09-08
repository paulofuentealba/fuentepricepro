import { describe, it, expect } from "vitest";
import { getDgiStatus, DIVIDEND_KINGS, DIVIDEND_ARISTOCRATS } from "../dgi";

describe("DGI Classification SSOT (Kings & Aristocrats)", () => {
  it("identifies official Dividend Kings (50+ years)", () => {
    const jnj = getDgiStatus("JNJ");
    expect(jnj).not.toBeNull();
    expect(jnj?.tier).toBe("king");
    expect(jnj?.minYears).toBe(50);

    const ko = getDgiStatus("ko"); // case-insensitive
    expect(ko?.tier).toBe("king");

    const pg = getDgiStatus("PG");
    expect(pg?.tier).toBe("king");

    const mmm = getDgiStatus("MMM");
    expect(mmm?.tier).toBe("king");
  });

  it("identifies official Dividend Aristocrats (25+ years)", () => {
    const o = getDgiStatus("O"); // Realty Income
    expect(o).not.toBeNull();
    expect(o?.tier).toBe("aristocrat");
    expect(o?.minYears).toBe(25);

    const cvx = getDgiStatus("CVX");
    expect(cvx?.tier).toBe("aristocrat");

    const mcd = getDgiStatus("MCD");
    expect(mcd?.tier).toBe("aristocrat");
  });

  it("returns null for non-DGI tickers", () => {
    expect(getDgiStatus("TSLA")).toBeNull();
    expect(getDgiStatus("NVDA")).toBeNull();
    expect(getDgiStatus("PETR4")).toBeNull();
    expect(getDgiStatus("")).toBeNull();
  });
});
