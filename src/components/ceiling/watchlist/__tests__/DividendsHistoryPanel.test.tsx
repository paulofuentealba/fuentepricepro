// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DividendsHistoryPanel } from "../DividendsHistoryPanel";
import type { WatchlistItem } from "@/lib/watchlist";
import type { DividendEvent } from "@/lib/domain";

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => ({ transactions: [] }),
}));

describe("DividendsHistoryPanel Sorting", () => {
  const mockItem: WatchlistItem = {
    id: "item-1",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 28,
    quantity: 100,
  } as any;

  const mockEvents: DividendEvent[] = [
    {
      exDate: "2023-06-01",
      paymentDate: "2023-06-15",
      amountPerShare: 0.5,
      isJCP: false,
    } as any,
    {
      exDate: "2024-03-01",
      paymentDate: "2024-03-15",
      amountPerShare: 1.2,
      isJCP: true,
    } as any,
  ];

  it("defaults to exDate descending and supports tri-state sorting", () => {
    render(
      <DividendsHistoryPanel
        item={mockItem}
        events={mockEvents}
        currency="BRL"
      />
    );

    // Default: exDate desc -> initially default direction (none on aria-sort)
    const exDateHeader = screen.getByRole("button", { name: /Data-Com/i });
    expect(exDateHeader.getAttribute("aria-sort")).toBe("none");

    // Click 1 -> asc
    fireEvent.click(exDateHeader);
    expect(exDateHeader.getAttribute("aria-sort")).toBe("ascending");

    // Click 2 -> desc
    fireEvent.click(exDateHeader);
    expect(exDateHeader.getAttribute("aria-sort")).toBe("descending");

    // Click 3 -> default
    fireEvent.click(exDateHeader);
    expect(exDateHeader.getAttribute("aria-sort")).toBe("none");
  });
});
