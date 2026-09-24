// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyTransactionsTable } from "../MyTransactionsTable";
import type { Transaction } from "@/lib/transactions";

describe("MyTransactionsTable Sorting", () => {
  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      ticker: "PETR4",
      type: "buy",
      date: new Date("2024-01-10").getTime(),
      quantity: 100,
      pricePerShare: 30,
      fees: 5,
    },
    {
      id: "tx-2",
      ticker: "VALE3",
      type: "buy",
      date: new Date("2024-03-15").getTime(),
      quantity: 50,
      pricePerShare: 70,
      fees: 10,
    },
  ];

  it("defaults to date descending and supports 3-click sorting cycle", () => {
    render(
      <MyTransactionsTable
        allTransactions={mockTransactions}
        filteredTransactions={mockTransactions}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBatchDelete={vi.fn()}
        onViewThesis={vi.fn()}
      />
    );

    // Default: date descending -> VALE3 (Mar 2024) before PETR4 (Jan 2024)
    let tickers = screen.getAllByText(/PETR4|VALE3/);
    expect(tickers[0].textContent).toContain("VALE3");

    // Click on "Ativo" header -> 1st click = asc (PETR4 before VALE3)
    const assetHeader = screen.getByRole("button", { name: /Ativo/i });
    fireEvent.click(assetHeader);
    tickers = screen.getAllByText(/PETR4|VALE3/);
    expect(tickers[0].textContent).toContain("PETR4");

    // 2nd click -> desc (VALE3 before PETR4)
    fireEvent.click(assetHeader);
    tickers = screen.getAllByText(/PETR4|VALE3/);
    expect(tickers[0].textContent).toContain("VALE3");

    // 3rd click -> back to default (date descending: VALE3 before PETR4)
    fireEvent.click(assetHeader);
    tickers = screen.getAllByText(/PETR4|VALE3/);
    expect(tickers[0].textContent).toContain("VALE3");
  });
});
