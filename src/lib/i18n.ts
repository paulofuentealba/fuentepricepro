import { en } from "./i18n/dict.en";
import { ptBR } from "./i18n/dict.ptBR";
import { es } from "./i18n/dict.es";

export type { Locale } from "./formatters";
export {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactCurrency,
  displayTicker,
  getDisplayAssetType,
  toIntlLocale,
} from "./formatters";

export const dict = { en, ptBR, es };

export type Dict = typeof dict.en;
