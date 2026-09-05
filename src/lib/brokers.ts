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
  | "SCHWAB";

export const KNOWN_BROKER_LABELS: Record<SupportedBroker, string> = {
  XP: "XP Investimentos",
  CLEAR: "Clear Corretora",
  RICO: "Rico Investimentos",
  MODAL: "ModalMais",
  BTG: "BTG Pactual",
  INTER: "Banco Inter",
  NUINVEST: "NuInvest",
  ORAMA: "Órama",
  GENIAL: "Genial Investimentos",
  ITAU: "Itaú Corretora",
  BRADESCO: "Bradesco / Ágora",
  SANTANDER: "Santander / Toro",
  BB: "Banco do Brasil",
  CAIXA: "Caixa Econômica Federal",
  SCHWAB: "Charles Schwab",
};
