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
