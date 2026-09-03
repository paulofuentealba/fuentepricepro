/**
 * Shared localStorage key constants — kept in a dependency-free module so
 * watchlist.ts/transactions.ts and demoMode.ts can both reference the same
 * keys without an import cycle (demoMode.ts needs the keys to seed/clear
 * demo data; watchlist.ts/transactions.ts need demoMode.ts to guard writes).
 */
export const WATCHLIST_STORAGE_KEY = "ceilingPricePro.watchlist.v1";
export const TRANSACTIONS_STORAGE_KEY = "ceilingPricePro.transactions.v1";
