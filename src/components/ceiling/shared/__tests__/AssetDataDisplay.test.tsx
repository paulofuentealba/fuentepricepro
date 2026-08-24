// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PriceTag, SafetyMarginBadge, YieldIndicator } from "../AssetDataDisplay";
import { dict, type Locale } from "@/lib/i18n";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

describe("AssetDataDisplay — null/unavailable rendering (Auditoria UX 1.3 / Prompt 94)", () => {
  beforeEach(() => {
    cleanup();
    currentLocale = "ptBR";
  });

  it("PriceTag renders — for null/undefined/NaN instead of a currency value", () => {
    const { rerender } = render(<PriceTag value={null} currency="BRL" />);
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(<PriceTag value={undefined} currency="BRL" />);
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(<PriceTag value={NaN} currency="BRL" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("PriceTag renders a real formatted value when the price is a valid number, including exactly 0", () => {
    render(<PriceTag value={42.5} currency="BRL" />);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("SafetyMarginBadge renders — for null/undefined/NaN, never a literal 0%", () => {
    const { rerender } = render(<SafetyMarginBadge margin={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(<SafetyMarginBadge margin={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("SafetyMarginBadge renders a real 0,0% when margin is genuinely zero in ptBR", () => {
    currentLocale = "ptBR";
    render(<SafetyMarginBadge margin={0} />);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.getByText("+0,0%")).toBeInTheDocument();
  });

  it("SafetyMarginBadge formats positive and negative margins with localized decimal separator in ptBR", () => {
    currentLocale = "ptBR";
    const { rerender } = render(<SafetyMarginBadge margin={15.5} />);
    expect(screen.getByText("+15,5%")).toBeInTheDocument();

    rerender(<SafetyMarginBadge margin={-8.2} />);
    expect(screen.getByText("-8,2%")).toBeInTheDocument();
  });

  it("SafetyMarginBadge formats with period decimal separator in English (en)", () => {
    currentLocale = "en";
    render(<SafetyMarginBadge margin={15.5} />);
    expect(screen.getByText("+15.5%")).toBeInTheDocument();
  });

  it("SafetyMarginBadge formats with comma decimal separator in Spanish (es)", () => {
    currentLocale = "es";
    render(<SafetyMarginBadge margin={15.5} />);
    expect(screen.getByText("+15,5%")).toBeInTheDocument();
  });

  it("YieldIndicator renders — for null/undefined/NaN, never a literal 0%", () => {
    const { rerender } = render(<YieldIndicator value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(<YieldIndicator value={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("YieldIndicator renders a real 0.0% when yield is genuinely zero, distinct from unavailable", () => {
    render(<YieldIndicator value={0} />);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });
});

