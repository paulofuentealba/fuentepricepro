// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FxDecompositionPanel } from "../FxDecompositionPanel";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

describe("FxDecompositionPanel Sorting", () => {
  const mockValuedItems: ValuedWatchlistItem[] = [
    {
      id: "us-1",
      ticker: "AAPL",
      name: "Apple Inc.",
      type: "STOCK_US",
      currency: "USD",
      currentPrice: 200,
      livePrice: 200,
      averagePrice: 150,
      quantity: 10,
      currentFxRate: 5.5,
      averageFxRate: 5.0,
      totalCost: 1500,
      totalCurrentValue: 2000,
    } as any,
    {
      id: "us-2",
      ticker: "MSFT",
      name: "Microsoft Corp.",
      type: "STOCK_US",
      currency: "USD",
      currentPrice: 400,
      livePrice: 400,
      averagePrice: 250,
      quantity: 5,
      currentFxRate: 5.5,
      averageFxRate: 5.0,
      totalCost: 1250,
      totalCurrentValue: 2000,
    } as any,
  ];

  it("supports tri-state column sorting and returns to total return BRL default", () => {
    render(
      <FxDecompositionPanel
        valuedItems={mockValuedItems}
        usdBrlRate={5.5}
        isLoading={false}
      />
    );

    // Default: Total return BRL % descending
    // Both are shown
    expect(screen.getAllByText(/AAPL|MSFT/).length).toBeGreaterThan(0);

    // Click on "Ativo US" -> 1st click = asc (AAPL before MSFT)
    const assetHeader = screen.getByRole("button", { name: /^Ativo US/i });
    fireEvent.click(assetHeader);
    let tickers = screen.getAllByText(/AAPL|MSFT/);
    expect(tickers[0].textContent).toContain("AAPL");

    // 2nd click -> desc (MSFT before AAPL)
    fireEvent.click(assetHeader);
    tickers = screen.getAllByText(/AAPL|MSFT/);
    expect(tickers[0].textContent).toContain("MSFT");

    // 3rd click -> default
    fireEvent.click(assetHeader);
    expect(assetHeader.getAttribute("aria-sort")).toBe("none");
  });
});
