// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AuditScreen } from "../AuditScreen";
import type { DecisionLogSummary } from "@/lib/audit/types";

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => ({ currency: "BRL" }),
}));

afterEach(() => {
  cleanup();
});

const mockSummary: DecisionLogSummary = {
  entries: [
    {
      id: "1",
      ticker: "VALE3",
      name: "Vale SA",
      assetType: "STOCK_BR",
      currency: "BRL",
      kind: "buy",
      date: 3000,
      quantity: 10,
      pricePerShare: 60,
      consensusAtDecision: 65,
      marginAtDecision: 8,
      yieldTrapAtDecision: false,
      realizedGainNative: null,
      verdict: "fair_entry",
      effectNative: 50,
      feesNative: 2,
      taxNative: 0,
      totalNative: 602,
    },
    {
      id: "2",
      ticker: "ITUB4",
      name: "Itaú Unibanco",
      assetType: "STOCK_BR",
      currency: "BRL",
      kind: "buy",
      date: 2000,
      quantity: 10,
      pricePerShare: 35,
      consensusAtDecision: 30,
      marginAtDecision: -16,
      yieldTrapAtDecision: false,
      realizedGainNative: null,
      verdict: "above_ceiling",
      effectNative: -50,
      feesNative: 10,
      taxNative: 0,
      totalNative: 360,
    },
    {
      id: "3",
      ticker: "BBAS3",
      name: "Banco do Brasil",
      assetType: "STOCK_BR",
      currency: "BRL",
      kind: "buy",
      date: 1000,
      quantity: 10,
      pricePerShare: 25,
      consensusAtDecision: 32,
      marginAtDecision: 28,
      yieldTrapAtDecision: false,
      realizedGainNative: null,
      verdict: "great_entry",
      effectNative: 70,
      feesNative: 5,
      taxNative: 0,
      totalNative: 255,
    },
  ],
  overpaidCount: 1,
  overpaidTotalBRL: 50,
  overpaidExtraShares: 1.67,
  overpaidExtraMonthlyIncomeBRL: 2.5,
  totalFeesBRL: 17,
  totalTaxBRL: 0,
  totalBoughtBRL: 1217,
  totalSoldNetBRL: 0,
};

describe("AuditScreen tri-state column sorting", () => {
  it("renders entries sorted by date descending by default", () => {
    render(<AuditScreen summary={mockSummary} />);

    const rows = screen.getAllByRole("row");
    // Row 0 is header, rows 1..3 are data
    expect(rows[1].textContent).toContain("VALE3");
    expect(rows[2].textContent).toContain("ITUB4");
    expect(rows[3].textContent).toContain("BBAS3");
  });

  it("cycles through asc -> desc -> default when clicking the Preço header", () => {
    render(<AuditScreen summary={mockSummary} />);

    const priceHeader = screen.getByRole("button", { name: /Preço/i });
    expect(priceHeader.getAttribute("aria-sort")).toBe("none");

    // Click 1: asc (25 -> 35 -> 60: BBAS3, ITUB4, VALE3)
    fireEvent.click(priceHeader);
    expect(priceHeader.getAttribute("aria-sort")).toBe("ascending");
    let rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("BBAS3");
    expect(rows[2].textContent).toContain("ITUB4");
    expect(rows[3].textContent).toContain("VALE3");

    // Click 2: desc (60 -> 35 -> 25: VALE3, ITUB4, BBAS3)
    fireEvent.click(priceHeader);
    expect(priceHeader.getAttribute("aria-sort")).toBe("descending");
    rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("VALE3");
    expect(rows[2].textContent).toContain("ITUB4");
    expect(rows[3].textContent).toContain("BBAS3");

    // Click 3: return to default (date desc: VALE3, ITUB4, BBAS3)
    fireEvent.click(priceHeader);
    expect(priceHeader.getAttribute("aria-sort")).toBe("none");
    rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("VALE3");
    expect(rows[2].textContent).toContain("ITUB4");
    expect(rows[3].textContent).toContain("BBAS3");
  });

  it("sorts by asset ticker when clicking the Ativo header", () => {
    render(<AuditScreen summary={mockSummary} />);

    const assetHeader = screen.getByRole("button", { name: /Ativo/i });

    // Click 1: asc -> BBAS3, ITUB4, VALE3
    fireEvent.click(assetHeader);
    expect(assetHeader.getAttribute("aria-sort")).toBe("ascending");
    let rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("BBAS3");
    expect(rows[2].textContent).toContain("ITUB4");
    expect(rows[3].textContent).toContain("VALE3");

    // Click 2: desc -> VALE3, ITUB4, BBAS3
    fireEvent.click(assetHeader);
    expect(assetHeader.getAttribute("aria-sort")).toBe("descending");
    rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("VALE3");
    expect(rows[2].textContent).toContain("ITUB4");
    expect(rows[3].textContent).toContain("BBAS3");
  });
});
