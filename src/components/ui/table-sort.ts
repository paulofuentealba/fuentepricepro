import { useMemo, useState, useCallback } from "react";

export type SortDirection = "asc" | "desc" | "default";

export interface SortConfig<K extends string> {
  key: K | null;
  direction: SortDirection;
}

export interface UseTableSortOptions<T, K extends string = string> {
  items: T[];
  defaultSortKey: K;
  defaultDirection?: "asc" | "desc";
  extractors: Record<K, (item: T) => number | string | null | undefined>;
}

export interface UseTableSortReturn<T, K extends string> {
  sortedItems: T[];
  sortKey: K | null;
  sortDirection: SortDirection;
  activeEffectiveKey: K;
  activeEffectiveDirection: "asc" | "desc";
  toggleSort: (key: K) => void;
  resetSort: () => void;
  setSort: (key: K | null, direction: SortDirection) => void;
}

/**
 * Pure helper to compare two values safely.
 * Nulls/undefined/NaN are always placed at the end regardless of direction.
 */
function compareValues(
  valA: number | string | null | undefined,
  valB: number | string | null | undefined,
  direction: "asc" | "desc",
): number {
  const isAEmpty =
    valA === null || valA === undefined || (typeof valA === "number" && isNaN(valA));
  const isBEmpty =
    valB === null || valB === undefined || (typeof valB === "number" && isNaN(valB));

  // Both empty -> equal
  if (isAEmpty && isBEmpty) return 0;
  // A empty -> place A at the end
  if (isAEmpty) return 1;
  // B empty -> place B at the end
  if (isBEmpty) return -1;

  const multiplier = direction === "asc" ? 1 : -1;

  if (typeof valA === "number" && typeof valB === "number") {
    return multiplier * (valA - valB);
  }

  // String comparison
  const strA = String(valA);
  const strB = String(valB);
  return multiplier * strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Hook universal de ordenação tri-state (Regra 1 do AGENTS.md — Reusabilidade Primeiro):
 * 1º clique: Ordem crescente (asc)
 * 2º clique: Ordem decrescente (desc)
 * 3º clique: Volta ao padrão da tabela (default)
 */
export function useTableSort<T, K extends string = string>({
  items,
  defaultSortKey,
  defaultDirection = "desc",
  extractors,
}: UseTableSortOptions<T, K>): UseTableSortReturn<T, K> {
  const [sortKey, setSortKey] = useState<K | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("default");

  const toggleSort = useCallback((key: K) => {
    setSortKey((currentKey) => {
      // Se clicou em uma coluna diferente da atual: inicia no 1º clique (asc)
      if (currentKey !== key) {
        setSortDirection("asc");
        return key;
      }

      // Se clicou na mesma coluna: avança na máquina tri-state
      setSortDirection((currentDirection) => {
        if (currentDirection === "asc") return "desc";
        if (currentDirection === "desc") return "default";
        return "asc";
      });

      return key;
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortKey(null);
    setSortDirection("default");
  }, []);

  const activeEffectiveKey = sortDirection === "default" || sortKey === null ? defaultSortKey : sortKey;
  const activeEffectiveDirection =
    sortDirection === "default" || sortKey === null ? defaultDirection : sortDirection;

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const extractor = extractors[activeEffectiveKey];
    if (!extractor) return items;

    // Criamos cópia indexada para garantir ordenação estável (stable sort)
    return [...items]
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const valA = extractor(a.item);
        const valB = extractor(b.item);
        const diff = compareValues(valA, valB, activeEffectiveDirection);
        if (diff !== 0) return diff;
        // Critério de desempate estável: posição original
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }, [items, activeEffectiveKey, activeEffectiveDirection, extractors]);

  const setSort = useCallback((key: K | null, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  return {
    sortedItems,
    sortKey,
    sortDirection,
    activeEffectiveKey,
    activeEffectiveDirection,
    toggleSort,
    resetSort,
    setSort,
  };
}
