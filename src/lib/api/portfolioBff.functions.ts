import { createServerFn } from "@tanstack/react-start";
import { fetchAssetFn } from "../apiService.functions";
import {
  computeValuedPortfolioInternal,
  MAX_PORTFOLIO_BFF_ITEMS,
  type FetchValuedPortfolioInput,
  type ValuedPortfolioResponse,
} from "../portfolioBffLogic";

export type { FetchValuedPortfolioInput, ValuedPortfolioResponse };

/**
 * TanStack Start Server Function for single-round-trip portfolio valuation.
 */
export const fetchValuedPortfolioFn = createServerFn({ method: "POST" })
  .validator((d: FetchValuedPortfolioInput) => {
    if (!d || typeof d !== "object") {
      return { uid: "", items: [] };
    }
    const safeItems = Array.isArray(d.items) ? d.items.slice(0, MAX_PORTFOLIO_BFF_ITEMS) : [];
    return {
      ...d,
      items: safeItems,
    };
  })
  .handler(async ({ data }: { data: FetchValuedPortfolioInput }) => {
    return computeValuedPortfolioInternal(data, Date.now(), async (ticker) => {
      try {
        return await fetchAssetFn({ data: { ticker } });
      } catch {
        return null;
      }
    });
  });
