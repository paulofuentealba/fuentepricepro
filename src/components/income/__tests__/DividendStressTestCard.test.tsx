// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DividendStressTestCard } from "../DividendStressTestCard";
import { MonthlyCashflowTimeline } from "../MonthlyCashflowTimeline";

describe("Income WOW features", () => {
  it("renders DividendStressTestCard and updates stressed income when cut preset is clicked", () => {
    render(
      <DividendStressTestCard
        monthlyProjectedIncome={5000}
        survivalTargetMonthly={3500}
      />
    );

    expect(screen.getByTestId("dividend-stress-test-card")).toBeInTheDocument();
    expect(screen.getByText(/Simulador de Crise e Resiliência/)).toBeInTheDocument();

    // Click on 50% cut preset
    const btn50 = screen.getByText("Choque Extremo (-50%)");
    fireEvent.click(btn50);

    // Stressed income should become 2,500
    expect(screen.getAllByText(/2\.500,00/).length).toBeGreaterThan(0);
  });

  it("renders MonthlyCashflowTimeline with month events", () => {
    const today = new Date();
    const mockEvents: any[] = [
      {
        ticker: "TAEE11",
        currency: "BRL",
        exDate: today.toISOString().split("T")[0],
        paymentDate: today.toISOString().split("T")[0],
        isPaid: true,
        quantityHeld: 100,
        amountPerShareGross: 4.5,
        amountGross: 450,
        amountNet: 450,
        taxType: "dividend",
      },
    ];

    render(<MonthlyCashflowTimeline events={mockEvents} />);

    expect(screen.getByTestId("monthly-cashflow-timeline")).toBeInTheDocument();
    expect(screen.getByText("TAEE11")).toBeInTheDocument();
    expect(screen.getAllByText(/450,00/).length).toBeGreaterThan(0);
  });
});
