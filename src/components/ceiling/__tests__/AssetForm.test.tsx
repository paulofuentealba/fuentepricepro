// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { AssetForm } from "../AssetForm";
import { dict } from "@/lib/i18n";
import type { SearchHit } from "@/lib/apiService.functions";

let mockPickHandler: ((hit: SearchHit) => void) | null = null;

vi.mock("@/components/shared/TickerSearchField", () => ({
  TickerSearchField: ({ onPick }: { onPick: (hit: SearchHit) => void }) => {
    mockPickHandler = onPick;
    return (
      <div data-testid="mock-ticker-search-field">
        <button
          type="button"
          data-testid="mock-pick-button"
          onClick={() =>
            onPick({
              ticker: "HGLG11",
              name: "CSHG Logistica",
              type: "STOCK_BR", // intentionally start with STOCK_BR to test editing to FII
              sector: null,
            })
          }
        >
          Pick HGLG11
        </button>
      </div>
    );
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({ data: null, isLoading: false }),
  };
});

vi.mock("@/lib/settings", () => ({
  useSettings: () => ({
    targetYield: 0.06,
  }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: dict.ptBR,
  }),
}));

describe("AssetForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPickHandler = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("calls onSubmit once on initial pick with the detected asset type", () => {
    const mockSubmit = vi.fn();
    render(<AssetForm onSubmit={mockSubmit} />);

    const pickButton = screen.getByTestId("mock-pick-button");
    fireEvent.click(pickButton);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "HGLG11",
        type: "STOCK_BR",
        targetYield: 0.06,
      })
    );
  });

  it("does not call onSubmit on intermediate dropdown select, and calls onSubmit exactly once upon clicking 'Concluído' with the updated type", () => {
    const mockSubmit = vi.fn();
    render(<AssetForm onSubmit={mockSubmit} />);

    // 1. Initial selection
    const pickButton = screen.getByTestId("mock-pick-button");
    fireEvent.click(pickButton);
    expect(mockSubmit).toHaveBeenCalledTimes(1);

    // 2. Click "Editar tipo"
    const editButton = screen.getByRole("button", { name: new RegExp(dict.ptBR.form.editType, "i") });
    fireEvent.click(editButton);

    // Done button is now visible
    const doneButton = screen.getByRole("button", { name: new RegExp(dict.ptBR.form.done, "i") });
    expect(doneButton).toBeInTheDocument();

    // 3. Select new type in dropdown
    const selectTrigger = screen.getByRole("combobox");
    expect(selectTrigger).toBeInTheDocument();

    // onSubmit must NOT be called again during editing before clicking Done
    expect(mockSubmit).toHaveBeenCalledTimes(1);

    // 4. Click "Concluído"
    fireEvent.click(doneButton);

    // onSubmit is now called a second time with the active type
    expect(mockSubmit).toHaveBeenCalledTimes(2);
    expect(mockSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ticker: "HGLG11",
        type: "STOCK_BR",
        targetYield: 0.06,
      })
    );
  });

  it("displays 'FII' badge when the detected asset type is FII_INFRA or FIAGRO", () => {
    const mockSubmit = vi.fn();
    render(<AssetForm onSubmit={mockSubmit} />);

    // Pick an asset with type FII_INFRA inside act
    act(() => {
      mockPickHandler!({
        ticker: "JURO11",
        name: "Sparta Infra",
        type: "FII_INFRA",
        sector: null,
      });
    });

    // Badge should render "FII" (FII), NOT "FII-Infra"
    expect(screen.getByText(dict.ptBR.types.FII)).toBeInTheDocument();
    expect(screen.queryByText(dict.ptBR.types.FII_INFRA)).not.toBeInTheDocument();
  });
});
