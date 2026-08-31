import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AssetType, Currency } from "@/lib/domain";
import type { RealizedGainEvent } from "@/lib/tax/types";

/**
 * Which SSOT capital-gains track a lot sale is dispatched to. Mirrors the module split under
 * `src/lib/tax/{br,exterior}` — never a parallel tax rule, only a routing key.
 */
export type WithdrawTaxTrack = "STOCK_BR" | "FII" | "FII_INFRA" | "ETF_BR" | "FOREIGN";

export interface WithdrawTaxState {
  /** Full real realized-gain history (buildTaxContext.realizedGainEvents) — the baseline every
   * simulated sale is appended on top of, so exemption thresholds and loss carryforward reflect
   * what the user has actually sold this period, not just what's being simulated right now. */
  realizedGainEvents: RealizedGainEvent[];
  assetTypeByTicker: Map<string, AssetType>;
  currencyByTicker: Map<string, Currency>;
  /** BRL per 1 unit of foreign currency, used only to convert the FOREIGN track's taxDue (native
   * currency, per simulateForeignCapitalGainsTax) into BRL for aggregate display. */
  fxRate: number;
}

export interface WithdrawStrategyContext {
  eligiblePositions: ValuedWatchlistItem[];
  neededAmountBRL: number;
  taxState: WithdrawTaxState;
  asOf: string;
}

export interface WithdrawCandidate {
  ticker: string;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
}

export interface WithdrawStrategy {
  id: string;
  labelKey: string;
  /** Returns eligible positions ranked in sell priority order. Sizing (how many shares of each)
   * is mechanical, decided by the engine — a strategy only decides ORDER. */
  run: (ctx: WithdrawStrategyContext) => WithdrawCandidate[];
}

export interface WithdrawAllocation {
  ticker: string;
  quantity: number;
  /** Proceeds in the asset's own trading currency (never converted for per-row display). */
  amountNative: number;
  currency: Currency;
  /** This lot's marginal tax contribution, already converted to BRL. */
  taxBRL: number;
  incomeLostAnnualBRL: number;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  percentOfTotal: number;
}

export type WithdrawResultState = "success" | "insufficient_position" | "no_eligible_assets";

export interface WithdrawResult {
  state: WithdrawResultState;
  allocations: WithdrawAllocation[];
  /** Still-needed amount in BRL if eligible positions ran out before reaching neededAmountBRL. */
  leftoverBRL: number;
  totalTaxBRL: number;
  totalIncomeLostAnnualBRL: number;
  /** Sum of prior-period loss carryforward consumed across all tracks touched, in BRL. */
  lossCarryforwardUsedBRL: number;
}
