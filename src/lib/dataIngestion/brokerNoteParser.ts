import { parseB3BrokerNote, ALL_SINACOR_BROKERS, type BrokerType, type ParseResult } from "./b3Parser";
import { detectSchwab, parseSchwabTradeConfirmation } from "./schwabParser";

export * from "./b3Parser";
export * from "./schwabParser";

/**
 * Every broker the import flow can auto-detect — Brazilian SINACOR brokers (b3Parser.ts) plus
 * international brokers (currently just Schwab; each new international broker gets its own
 * parser module here and one line in this list, keeping b3Parser.ts B3-only).
 */
export type SupportedBroker = BrokerType | "SCHWAB";
export const ALL_SUPPORTED_BROKERS: SupportedBroker[] = [...ALL_SINACOR_BROKERS, "SCHWAB"];

/**
 * Broker-agnostic entry point for the import flow. Tries international broker detectors first
 * (currently just Schwab — a distinct document layout, not a SINACOR variant), then falls back
 * to the existing B3 SINACOR auto-detection/parsing untouched.
 */
export function parseBrokerNote(
  rawText: string,
  hintBroker?: SupportedBroker | "AUTO" | null,
  userMappings: Record<string, string> = {},
): ParseResult {
  if (!rawText || rawText.trim() === "") {
    return { success: false, error: "Empty file" };
  }

  if ((hintBroker === "SCHWAB" || hintBroker === "AUTO" || !hintBroker) && detectSchwab(rawText)) {
    const { trades, unresolvedTrades } = parseSchwabTradeConfirmation(rawText);
    if (trades.length === 0 && unresolvedTrades.length === 0) {
      return { success: false, error: "broker_layout_unsupported", broker: "SCHWAB" };
    }
    return { success: true, trades, unresolvedTrades, broker: "SCHWAB" };
  }

  return parseB3BrokerNote(rawText, hintBroker as BrokerType | "AUTO" | null, userMappings);
}
