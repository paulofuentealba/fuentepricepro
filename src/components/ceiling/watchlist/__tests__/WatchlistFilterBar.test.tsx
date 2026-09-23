// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WatchlistFilterBar } from "../WatchlistFilterBar";
import type { EightClassKey } from "@/lib/selectors/eightClassAllocation";

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      watchlist: {
        filterUndervalued: "Abaixo do Preço Teto",
        filterOvervalued: "Acima do Preço Teto",
        sort: {
          label: "Ordenar por",
          ticker_asc: "Ticker (A-Z)",
          yield_desc: "Maior Yield",
          margin_desc: "Maior Margem",
          income_desc: "Maior Renda",
          yoc_desc: "Maior YoC",
        },
      },
      dashboard: {
        allocation: {
          classes: {
            acoes_br: "Ações BR",
            fiis: "FIIs",
            fiagros: "Fiagros",
            fi_infras: "FI-Infras",
            reits_us: "REITs (US)",
            etfs_us: "ETFs US",
            etfs_br: "ETFs BR",
            acoes_us: "Ações US",
          },
        },
        matrix: {
          filterAllDynamic: "Todas as Classes",
        },
      },
    },
  }),
}));

describe("WatchlistFilterBar", () => {
  const availableClasses: EightClassKey[] = ["acoes_br", "fiis"];

  it("renders class filter chips and calls onSelectClassFilter", () => {
    const onSelectClass = vi.fn();
    const onSetOpp = vi.fn();
    const onSetSort = vi.fn();

    render(
      <WatchlistFilterBar
        activeClassFilter="ALL"
        onSelectClassFilter={onSelectClass}
        availableClasses={availableClasses}
        classCounts={{ ALL: 10, acoes_br: 6, fiis: 4 }}
        counts={{ total: 10, under: 7, over: 3 }}
        oppFilter={null}
        sortOption="yield_desc"
        onSetOppFilter={onSetOpp}
        onSetSortOption={onSetSort}
      />,
    );

    expect(screen.getByText("Todas as Classes")).toBeInTheDocument();
    expect(screen.getByText("Ações BR")).toBeInTheDocument();
    expect(screen.getByText("FIIs")).toBeInTheDocument();
    expect(screen.getByText("Abaixo do Preço Teto")).toBeInTheDocument();

    fireEvent.click(screen.getByText("FIIs"));
    expect(onSelectClass).toHaveBeenCalledWith("fiis");

    fireEvent.click(screen.getByText("Abaixo do Preço Teto"));
    expect(onSetOpp).toHaveBeenCalledWith("under");
  });
});
