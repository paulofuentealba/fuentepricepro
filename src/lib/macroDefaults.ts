/**
 * Single Source of Truth (SSOT) para constantes macroeconômicas padrão/fallback.
 * Utilizadas quando feeds externos (BCB SGS 4389 / 433 / Selic / IPCA) estão indisponíveis ou carregando.
 */

/** Taxa Selic/CDI padrão em pontos percentuais (10.5 para 10,5% a.a.) */
export const SELIC_FALLBACK = 10.5;

/** Taxa Selic/CDI padrão em formato decimal (0.105 para 10,5% a.a.) */
export const SELIC_DECIMAL = 0.105;

/** Taxa de inflação corrente IPCA padrão em pontos percentuais (4.5 para 4,5% a.a.) */
export const IPCA_FALLBACK = 4.5;

/** Taxa de câmbio USD/BRL padrão/fallback quando feed de cotação em tempo real não responde */
export const EXCHANGE_RATE_FALLBACK = 5.5;

/** Yield do US Treasury 10Y padrão/fallback em pontos percentuais (4.25 para 4,25% a.a.) */
export const US_TREASURY_10Y_FALLBACK = 4.25;

/** Custo de capital próprio americano (Cost of Equity) padrão/fallback em formato decimal (0.085 para 8,5% a.a.) */
export const US_COST_OF_EQUITY_FALLBACK = 0.085;

/** Taxa de inflação/crescimento terminal de longo prazo dos EUA em formato decimal (0.025 para 2,5% a.a.) */
export const US_TERMINAL_GROWTH_FALLBACK = 0.025;

/** Piso histórico da taxa de juro real NTN-B em pontos percentuais (5.5 para 5,5% a.a.) */
export const NTN_B_FLOOR_FALLBACK = 5.5;

/** Spread de risco padrão de REITs sobre o US Treasury 10Y em pontos percentuais (2.75 para 2,75% a.a.) */
export const REIT_TREASURY_SPREAD_FALLBACK = 2.75;

/** Yield anual médio assumido (formato decimal, 0.08 = 8% a.a.) quando o portfólio ainda não tem valor/dividendo suficiente para calcular um blended yield real (ex.: Snowball com carteira vazia). */
export const DEFAULT_SNOWBALL_YIELD_FALLBACK = 0.08;

export interface MacroRates {
  cdi: number;
  ipca: number;
  selic: number;
}

/** Objeto com as taxas macroeconômicas padrão para renda fixa e oráculo */
export const MACRO_RATES_FALLBACK: MacroRates = {
  cdi: SELIC_FALLBACK,
  ipca: IPCA_FALLBACK,
  selic: SELIC_FALLBACK,
};
