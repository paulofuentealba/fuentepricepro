// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DividendSafetyBadge } from "../DividendSafetyBadge";
import { DividendSafetyRadar } from "../DividendSafetyRadar";

describe("DividendSafety components", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("renders DividendSafetyRadar for US REIT in English without Portuguese leakage", () => {
    render(
      <DividendSafetyRadar
        ticker="O"
        input={{
          type: "REIT",
          currency: "USD",
          locale: "en",
          yearsPayingDividends: 30,
          vacancyRate: 0.014,
          pvp: 1.05,
        }}
      />
    );

    const radar = screen.getByTestId("dividend-safety-radar");
    expect(radar).toBeInTheDocument();
    expect(radar).toHaveTextContent("Very Safe");
    expect(radar).toHaveTextContent("Property Occupancy");
    expect(radar).toHaveTextContent("Valuation (Price / NAV)");
    expect(radar).toHaveTextContent("Dividend Track Record");

    // Zero Portuguese leakage
    expect(radar).not.toHaveTextContent("Muito Seguro");
    expect(radar).not.toHaveTextContent("Ocupação dos Imóveis");
    expect(radar).not.toHaveTextContent("P/VP");
    expect(radar).not.toHaveTextContent("Consistência Histórica");
  });
});
