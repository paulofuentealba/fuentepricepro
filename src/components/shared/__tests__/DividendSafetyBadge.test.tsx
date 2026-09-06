// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { DividendSafetyBadge } from "../DividendSafetyBadge";
import { DividendSafetyRadar } from "../DividendSafetyRadar";

describe("DividendSafety components", () => {
  it("renders DividendSafetyBadge with score and label", () => {
    render(
      <DividendSafetyBadge
        input={{
          type: "STOCK_BR",
          payoutRatio: 0.5,
          netDebtToEbitda: 1.2,
          roe: 0.2,
          yearsPayingDividends: 10,
        }}
      />
    );

    const badge = screen.getByTestId("dividend-safety-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Muito Seguro|Seguro/);
  });

  it("renders DividendSafetyRadar with 4 pillars", () => {
    render(
      <DividendSafetyRadar
        ticker="PETR4"
        input={{
          type: "STOCK_BR",
          payoutRatio: 0.55,
          netDebtToEbitda: 1.5,
          roe: 0.22,
          yearsPayingDividends: 12,
        }}
      />
    );

    expect(screen.getByTestId("dividend-safety-radar")).toBeInTheDocument();
    expect(screen.getByText(/PETR4/)).toBeInTheDocument();
    expect(screen.getByText("Payout Ratio")).toBeInTheDocument();
  });
});
