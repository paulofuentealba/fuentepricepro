/**
 * Known custody institutions whose broker-note PDF layout `brokerNoteParser.ts` can parse
 * automatically. This is a suggestion list for the free-text `WatchlistItem.broker` field
 * (see watchlist.ts) — not a closed enum. A user's real broker (e.g. Avenue Securities) may
 * not have a supported parser yet but is still a valid value to type into that field.
 */
export type SupportedBroker =
  | "XP"
  | "CLEAR"
  | "RICO"
  | "MODAL"
  | "BTG"
  | "INTER"
  | "NUINVEST"
  | "ORAMA"
  | "GENIAL"
  | "ITAU"
  | "BRADESCO"
  | "SANTANDER"
  | "BB"
  | "CAIXA"
  | "SCHWAB"
  | "FIDELITY"
  | "VANGUARD"
  | "IBKR"
  | "ROBINHOOD"
  | "ETRADE"
  | "WEBULL";

export const KNOWN_BROKER_LABELS: Record<SupportedBroker, string> = {
  FIDELITY: "Fidelity Investments",
  SCHWAB: "Charles Schwab",
  VANGUARD: "Vanguard",
  IBKR: "Interactive Brokers",
  ROBINHOOD: "Robinhood",
  ETRADE: "E*TRADE",
  WEBULL: "Webull",
  XP: "XP Investimentos",
  BTG: "BTG Pactual",
  CLEAR: "Clear Corretora",
  RICO: "Rico Investimentos",
  INTER: "Banco Inter",
  NUINVEST: "NuInvest",
  GENIAL: "Genial Investimentos",
  ORAMA: "Órama",
  ITAU: "Itaú Corretora",
  BRADESCO: "Bradesco / Ágora",
  SANTANDER: "Santander / Toro",
  BB: "Banco do Brasil",
  CAIXA: "Caixa Econômica Federal",
  MODAL: "ModalMais",
};

export const US_SUPPORTED_BROKERS: SupportedBroker[] = [
  "FIDELITY",
  "SCHWAB",
  "VANGUARD",
  "IBKR",
  "ROBINHOOD",
  "ETRADE",
  "WEBULL",
];

export const BR_SUPPORTED_BROKERS: SupportedBroker[] = [
  "XP",
  "BTG",
  "CLEAR",
  "RICO",
  "INTER",
  "NUINVEST",
  "GENIAL",
  "ORAMA",
  "ITAU",
  "BRADESCO",
  "SANTANDER",
  "BB",
  "CAIXA",
  "MODAL",
];

