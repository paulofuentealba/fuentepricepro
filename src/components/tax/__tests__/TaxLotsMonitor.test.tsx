// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n-provider";
import { TaxLotsMonitor } from "../TaxLotsMonitor";
import type { Transaction } from "@/lib/transactionsLogic";

describe("TaxLotsMonitor Component", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => "en"),
        setItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const asOf = new Date("2026-06-01T12:00:00Z").getTime();

  it("renders null if there are no open lots for ticker", () => {
    const { container } = render(
      <I18nProvider>
        <TaxLotsMonitor
          ticker="AAPL"
          currentPrice={200}
          transactions={[]}
          asOf={asOf}
        />
      </I18nProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders tax lot summary and breakdown for holding periods", () => {
    const txs: Transaction[] = [
      {
        id: "tx-old",
        ticker: "KO",
        type: "buy",
        date: asOf - 400 * MS_PER_DAY,
        quantity: 50,
        pricePerShare: 55,
      },
      {
        id: "tx-recent",
        ticker: "KO",
        type: "buy",
        date: asOf - 100 * MS_PER_DAY,
        quantity: 50,
        pricePerShare: 60,
      },
    ];

    render(
      <I18nProvider>
        <TaxLotsMonitor
          ticker="KO"
          currentPrice={70}
          transactions={txs}
          asOf={asOf}
        />
      </I18nProvider>,
    );

    // Title should be visible
    expect(screen.getByText("Tax Lots Monitor (IRS FIFO)")).toBeInTheDocument();

    // 50% Short-term and 50% Long-term
    expect(screen.getByText(/50% Long-Term/)).toBeInTheDocument();
    expect(screen.getByText(/50% Short-Term/)).toBeInTheDocument();

    // Long-term badge and countdown
    expect(screen.getByText("Long-Term (> 365d)")).toBeInTheDocument();
    expect(screen.getByText("266d to Long-Term")).toBeInTheDocument();
  });
});
