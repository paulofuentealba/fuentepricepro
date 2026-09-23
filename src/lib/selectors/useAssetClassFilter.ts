import { useState, useMemo } from "react";
import {
  type EightClassKey,
  EIGHT_CLASSES_ORDER,
  US_CLASSES_ORDER,
  classifyPositionToEightClass,
} from "./eightClassAllocation";
import { useMarketScope } from "@/lib/useMarketScope";

export interface AssetClassFilterable {
  type?: string;
  currency?: string;
  isClosedPosition?: boolean;
  quantity?: number;
}

export interface UseAssetClassFilterOptions<T> {
  /**
   * If true, availableClasses will ONLY include classes that have at least 1 item in the dataset.
   * If false, availableClasses will include all classes in visibleAllocationClasses from useMarketScope.
   * Default: false
   */
  onlyExisting?: boolean;
  /**
   * Optional custom predicate to filter out items before classification and counting
   * (e.g. `(item) => !item.isClosedPosition && (item.quantity ?? 0) > 0`).
   */
  filterPredicate?: (item: T) => boolean;
  /**
   * Initial active filter class key or "ALL". Default: "ALL".
   */
  defaultFilter?: EightClassKey | "ALL";
}

export function useAssetClassFilter<T extends AssetClassFilterable>(
  items: T[],
  options?: UseAssetClassFilterOptions<T>,
) {
  const { visibleAllocationClasses } = useMarketScope();
  const [activeFilter, setActiveFilter] = useState<EightClassKey | "ALL">(
    options?.defaultFilter ?? "ALL",
  );

  const baseItems = useMemo(() => {
    if (!options?.filterPredicate) return items;
    return items.filter(options.filterPredicate);
  }, [items, options?.filterPredicate]);

  const countsByClass = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: baseItems.length,
    };
    for (const item of baseItems) {
      const cls = classifyPositionToEightClass(item);
      counts[cls] = (counts[cls] ?? 0) + 1;
    }
    return counts;
  }, [baseItems]);

  const availableClasses = useMemo(() => {
    const classes = new Set<EightClassKey>();

    if (options?.onlyExisting) {
      for (const item of baseItems) {
        classes.add(classifyPositionToEightClass(item));
      }
    } else {
      for (const c of visibleAllocationClasses) {
        classes.add(c);
      }
      for (const item of baseItems) {
        classes.add(classifyPositionToEightClass(item));
      }
    }

    const preferredOrder =
      visibleAllocationClasses.length < 8 ? US_CLASSES_ORDER : EIGHT_CLASSES_ORDER;
    const ordered = preferredOrder.filter((c) => classes.has(c));
    for (const c of classes) {
      if (!ordered.includes(c)) ordered.push(c);
    }
    return ordered;
  }, [baseItems, visibleAllocationClasses, options?.onlyExisting]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "ALL") return baseItems;
    return baseItems.filter((i) => classifyPositionToEightClass(i) === activeFilter);
  }, [baseItems, activeFilter]);

  return {
    activeFilter,
    setActiveFilter,
    availableClasses,
    filteredItems,
    countsByClass,
    totalCount: baseItems.length,
  };
}
