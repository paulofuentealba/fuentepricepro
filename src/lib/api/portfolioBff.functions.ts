import { createServerFn } from "@tanstack/react-start";
import { fetchAssetFn } from "../apiService.functions";
import {
  computeValuedPortfolioInternal,
  type FetchValuedPortfolioInput,
  type ValuedPortfolioResponse,
} from "../portfolioBffLogic";

export { computeValuedPortfolioInternal, type FetchValuedPortfolioInput, type ValuedPortfolioResponse };

/**
 * TanStack Start Server Function for single-round-trip portfolio valuation.
 */
export const fetchValuedPortfolioFn = createServerFn({ method: "POST" })
  .validator((d: FetchValuedPortfolioInput) => d)
  .handler(async ({ data }: { data: FetchValuedPortfolioInput }) => {
    return computeValuedPortfolioInternal(data, Date.now(), async (ticker) => {
      try {
        return await fetchAssetFn({ data: { ticker } });
      } catch {
        return null;
      }
    });
  });
