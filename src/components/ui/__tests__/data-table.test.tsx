// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { beforeEach } from "vitest";
import { useTableSort } from "../table-sort";
import { DataTable, type DataTableColumn } from "../data-table";

interface MockAsset {
  id: string;
  ticker: string;
  yoc: number | null;
  total: number;
}

const mockData: MockAsset[] = [
  { id: "1", ticker: "BBAS3", yoc: 12.5, total: 5000 },
  { id: "2", ticker: "TAEE11", yoc: 8.2, total: 12000 },
  { id: "3", ticker: "VALE3", yoc: 5.0, total: 3000 },
  { id: "4", ticker: "WEGE3", yoc: null, total: 8000 },
];

beforeEach(() => {
  cleanup();
});

describe("useTableSort — Máquina de Estados Tri-State (Regra 1 do AGENTS.md)", () => {
  it("carrega inicialmente na ordenação padrão por peso (total desc)", () => {
    const { result } = renderHook(() =>
      useTableSort<MockAsset, "ticker" | "yoc" | "total">({
        items: mockData,
        defaultSortKey: "total",
        defaultDirection: "desc",
        extractors: {
          ticker: (i) => i.ticker,
          yoc: (i) => i.yoc,
          total: (i) => i.total,
        },
      }),
    );

    expect(result.current.sortDirection).toBe("default");
    expect(result.current.activeEffectiveKey).toBe("total");
    expect(result.current.sortedItems.map((i) => i.ticker)).toEqual([
      "TAEE11", // 12000
      "WEGE3",  // 8000
      "BBAS3",  // 5000
      "VALE3",  // 3000
    ]);
  });

  it("executa o ciclo completo de 3 cliques (asc -> desc -> default)", () => {
    const { result } = renderHook(() =>
      useTableSort<MockAsset, "ticker" | "yoc" | "total">({
        items: mockData,
        defaultSortKey: "total",
        defaultDirection: "desc",
        extractors: {
          ticker: (i) => i.ticker,
          yoc: (i) => i.yoc,
          total: (i) => i.total,
        },
      }),
    );

    // 1º Clique: ordem crescente (asc)
    act(() => {
      result.current.toggleSort("yoc");
    });
    expect(result.current.sortKey).toBe("yoc");
    expect(result.current.sortDirection).toBe("asc");
    // Nulos vão para o final
    expect(result.current.sortedItems.map((i) => i.ticker)).toEqual([
      "VALE3",  // 5.0
      "TAEE11", // 8.2
      "BBAS3",  // 12.5
      "WEGE3",  // null (final)
    ]);

    // 2º Clique: ordem decrescente (desc)
    act(() => {
      result.current.toggleSort("yoc");
    });
    expect(result.current.sortKey).toBe("yoc");
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.sortedItems.map((i) => i.ticker)).toEqual([
      "BBAS3",  // 12.5
      "TAEE11", // 8.2
      "VALE3",  // 5.0
      "WEGE3",  // null (final)
    ]);

    // 3º Clique: volta ao padrão da tabela (total desc)
    act(() => {
      result.current.toggleSort("yoc");
    });
    expect(result.current.sortDirection).toBe("default");
    expect(result.current.activeEffectiveKey).toBe("total");
    expect(result.current.sortedItems.map((i) => i.ticker)).toEqual([
      "TAEE11", // 12000
      "WEGE3",  // 8000
      "BBAS3",  // 5000
      "VALE3",  // 3000
    ]);
  });

  it("muda para nova coluna em ordem crescente ao clicar em coluna diferente", () => {
    const { result } = renderHook(() =>
      useTableSort<MockAsset, "ticker" | "yoc" | "total">({
        items: mockData,
        defaultSortKey: "total",
        defaultDirection: "desc",
        extractors: {
          ticker: (i) => i.ticker,
          yoc: (i) => i.yoc,
          total: (i) => i.total,
        },
      }),
    );

    act(() => {
      result.current.toggleSort("yoc");
    });
    expect(result.current.sortKey).toBe("yoc");

    // Clica em ticker -> deve mudar para ticker em ordem crescente
    act(() => {
      result.current.toggleSort("ticker");
    });
    expect(result.current.sortKey).toBe("ticker");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.sortedItems.map((i) => i.ticker)).toEqual([
      "BBAS3",
      "TAEE11",
      "VALE3",
      "WEGE3",
    ]);
  });
});

describe("DataTable Component", () => {
  const columns: DataTableColumn<MockAsset>[] = [
    {
      id: "ticker",
      header: "Ativo",
      accessor: (i) => i.ticker,
      sticky: true,
    },
    {
      id: "total",
      header: "Posição Total",
      accessor: (i) => i.total,
      align: "right",
    },
    {
      id: "yoc",
      header: "Yield on Cost",
      accessor: (i) => i.yoc,
      cell: (i) => (i.yoc !== null ? `${i.yoc}%` : "—"),
      align: "right",
    },
  ];

  it("renderiza os cabeçalhos com acessibilidade ARIA e permite ordenar por clique", () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        defaultSortKey="total"
        defaultSortDirection="desc"
        keyExtractor={(item) => item.id}
      />,
    );

    const yocHeader = screen.getByRole("button", { name: /yield on cost/i });
    expect(yocHeader).toHaveAttribute("aria-sort", "none");

    // 1º clique: asc
    fireEvent.click(yocHeader);
    expect(yocHeader).toHaveAttribute("aria-sort", "ascending");

    // 2º clique: desc
    fireEvent.click(yocHeader);
    expect(yocHeader).toHaveAttribute("aria-sort", "descending");

    // 3º clique: volta a none / default
    fireEvent.click(yocHeader);
    expect(yocHeader).toHaveAttribute("aria-sort", "none");
  });

  it("suporta acionamento via teclado (Enter) no cabeçalho", () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        defaultSortKey="total"
        defaultSortDirection="desc"
        keyExtractor={(item) => item.id}
      />,
    );

    const yocHeader = screen.getByRole("button", { name: /yield on cost/i });
    fireEvent.keyDown(yocHeader, { key: "Enter" });
    expect(yocHeader).toHaveAttribute("aria-sort", "ascending");
  });
});
