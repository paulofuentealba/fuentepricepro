import { DEV_MOCK_DATA, DEV_MOCK_TRANSACTIONS } from "./devMockData";

/**
 * Public demo dataset ("See demo" on the landing page) — ships in production,
 * unlike DEV_MOCK_DATA/DEV_MOCK_TRANSACTIONS which are dev-only convenience
 * fixtures. Derived from the same curated portfolio (not duplicated, to avoid
 * drift) minus TEST_IPO_RECENTE, which exists purely to exercise an edge case
 * in dividend-history math and has no place in a public-facing demo.
 */
export const DEMO_WATCHLIST_DATA = DEV_MOCK_DATA.filter((item) => item.ticker !== "TEST_IPO_RECENTE");
export const DEMO_TRANSACTIONS = DEV_MOCK_TRANSACTIONS.filter((tx) => tx.ticker !== "TEST_IPO_RECENTE");
