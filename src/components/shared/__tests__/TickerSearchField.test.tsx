// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TickerSearchField } from "../TickerSearchField";
import { dict } from "@/lib/i18n";
import type { SearchHit } from "@/lib/apiService.functions";

let mockQueryData: SearchHit[] | null = null;
let mockIsFetching = false;

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: mockQueryData,
      isFetching: mockIsFetching,
      isLoading: false,
    }),
  };
});

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: dict.ptBR,
  }),
}));

describe("TickerSearchField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryData = null;
    mockIsFetching = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("does not auto-pick when suggestions arrive without the exact autoPickTicker match", () => {
    const onPick = vi.fn();
    mockQueryData = [
      {
        ticker: "PETR3",
        name: "Petrobras ON",
        type: "STOCK_BR",
        sector: "Petróleo",
      },
    ];

    render(
      <TickerSearchField
        onPick={onPick}
        initialQuery="PETR4"
        autoPickTicker="PETR4"
      />
    );

    // PETR3 arrived, but autoPickTicker is PETR4. It must NOT auto-pick PETR3.
    expect(onPick).not.toHaveBeenCalled();
  });

  it("auto-picks exact match when matching suggestion arrives and only fires once", () => {
    const onPick = vi.fn();
    mockQueryData = [
      {
        ticker: "PETR3",
        name: "Petrobras ON",
        type: "STOCK_BR",
        sector: "Petróleo",
      },
      {
        ticker: "PETR4",
        name: "Petrobras PN",
        type: "STOCK_BR",
        sector: "Petróleo",
      },
    ];

    const { rerender } = render(
      <TickerSearchField
        onPick={onPick}
        initialQuery="PETR4"
        autoPickTicker="PETR4"
      />
    );

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "PETR4",
        name: "Petrobras PN",
        type: "STOCK_BR",
      })
    );

    // Re-rendering with same props should not fire autoPick again (guaranteed by autoPickedRef)
    rerender(
      <TickerSearchField
        onPick={onPick}
        initialQuery="PETR4"
        autoPickTicker="PETR4"
      />
    );
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("does not auto-pick for invalid or unlisted ticker when suggestions are empty", () => {
    const onPick = vi.fn();
    mockQueryData = [];

    render(
      <TickerSearchField
        onPick={onPick}
        initialQuery="INVALID123"
        autoPickTicker="INVALID123"
      />
    );

    expect(onPick).not.toHaveBeenCalled();
  });

  it("allows manual selection by clicking on a suggestion item", () => {
    const onPick = vi.fn();
    mockQueryData = [
      {
        ticker: "VALE3",
        name: "Vale S.A.",
        type: "STOCK_BR",
        sector: "Mineração",
      },
    ];

    render(<TickerSearchField onPick={onPick} />);

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "VALE3" } });

    const itemButton = screen.getByRole("button", { name: /VALE3/i });
    fireEvent.click(itemButton);

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "VALE3",
        name: "Vale S.A.",
      })
    );
  });
});
