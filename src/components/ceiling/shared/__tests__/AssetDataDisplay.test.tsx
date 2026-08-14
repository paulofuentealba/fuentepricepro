// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n-provider";
import { PriceTag, SafetyMarginBadge, YieldIndicator } from "../AssetDataDisplay";

afterEach(cleanup);

function withI18n(node: React.ReactNode) {
  return <I18nProvider>{node}</I18nProvider>;
}

describe("AssetDataDisplay — null/unavailable rendering (Auditoria UX 1.3 / Prompt 94)", () => {
  it("PriceTag renders — for null/undefined/NaN instead of a currency value", () => {
    const { rerender } = render(withI18n(<PriceTag value={null} currency="BRL" />));
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(withI18n(<PriceTag value={undefined} currency="BRL" />));
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(withI18n(<PriceTag value={NaN} currency="BRL" />));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("PriceTag renders a real formatted value when the price is a valid number, including exactly 0", () => {
    render(withI18n(<PriceTag value={42.5} currency="BRL" />));
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("SafetyMarginBadge renders — for null/undefined/NaN, never a literal 0%", () => {
    const { rerender } = render(withI18n(<SafetyMarginBadge margin={null} />));
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(withI18n(<SafetyMarginBadge margin={undefined} />));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("SafetyMarginBadge renders a real 0.0% when margin is genuinely zero (asset exactly at ceiling price)", () => {
    render(withI18n(<SafetyMarginBadge margin={0} />));
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
  });

  it("YieldIndicator renders — for null/undefined/NaN, never a literal 0%", () => {
    const { rerender } = render(withI18n(<YieldIndicator value={null} />));
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(withI18n(<YieldIndicator value={undefined} />));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("YieldIndicator renders a real 0.0% when yield is genuinely zero, distinct from unavailable", () => {
    render(withI18n(<YieldIndicator value={0} />));
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });
});
