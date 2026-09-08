/**
 * SSOT Dividend Safety Score (0 - 100)
 * Evaluates the safety and durability of dividend payments across stocks and FIIs.
 */

export type DividendSafetyTier = "very_safe" | "safe" | "caution" | "cut_risk";

export interface DividendSafetyFactor {
  name: string;
  score: number; // 0 - 100
  weight: number; // 0 - 1
  valueDescription: string;
  detail: string;
  status: "success" | "warning" | "danger" | "neutral";
}

export interface DividendSafetyResult {
  score: number; // 0 - 100
  tier: DividendSafetyTier;
  label: string;
  badgeVariant: "success" | "warning" | "danger" | "secondary";
  summary: string;
  factors: DividendSafetyFactor[];
  cutRiskProbabilityPct: number;
}

export interface AssetSafetyInput {
  type?: string;
  payoutRatio?: number | null; // e.g. 0.55 for 55% or 55
  netDebtToEbitda?: number | null; // e.g. 1.8
  roe?: number | null; // e.g. 0.18 or 18
  yearsPayingDividends?: number | null; // e.g. 12
  vacancyRate?: number | null; // for FIIs/REITs, e.g. 0.04
  pvp?: number | null; // for FIIs/REITs, e.g. 0.98
  currency?: string;
  locale?: string;
}

/**
 * Normalizes percentage values to standard 0-100 scale
 */
function normalizePct(val: number | null | undefined): number | null {
  if (val == null || !Number.isFinite(val)) return null;
  // If passed as 0.45, convert to 45
  if (val > 0 && val <= 1.5) return val * 100;
  return val;
}

interface LocalizationDictionary {
  tiers: Record<
    DividendSafetyTier,
    {
      label: string;
      summary: string;
    }
  >;
  fii: {
    occupancyName: string;
    occupancyControlledDesc: string;
    occupancyControlledDetail: string;
    occupancyExcellentDesc: (v: string) => string;
    occupancyExcellentDetail: string;
    occupancyHealthyDesc: (v: string) => string;
    occupancyHealthyDetail: (isReit: boolean) => string;
    occupancyCautionDesc: (v: string) => string;
    occupancyCautionDetail: string;
    occupancyRiskDesc: (v: string) => string;
    occupancyRiskDetail: string;

    valuationName: (isReit: boolean) => string;
    valuationBalancedDesc: (isReit: boolean) => string;
    valuationBalancedDetail: string;
    valuationFairDesc: (v: string) => string;
    valuationFairDetail: (isReit: boolean) => string;
    valuationPremiumDesc: (v: string) => string;
    valuationPremiumDetail: string;
    valuationDiscountDesc: (v: string) => string;
    valuationDiscountDetail: (isReit: boolean) => string;
    valuationDistortionDesc: (v: string) => string;
    valuationDistortionDetail: string;

    consistencyName: string;
    consistencyRegularDesc: (y: number) => string;
    consistencyRegularDetail: string;
    consistencyTenPlusDesc: (y: number) => string;
    consistencyTenPlusDetail: string;
    consistencyShortDesc: (y: number) => string;
    consistencyShortDetail: string;
  };
  stocks: {
    payoutName: string;
    payoutModerateDesc: string;
    payoutModerateDetail: string;
    payoutConservativeDesc: (v: string) => string;
    payoutConservativeDetail: string;
    payoutBalancedDesc: (v: string) => string;
    payoutBalancedDetail: string;
    payoutElevatedDesc: (v: string) => string;
    payoutElevatedDetail: string;
    payoutUnsustainableDesc: (v: string) => string;
    payoutUnsustainableDetail: string;
    payoutLowDesc: (v: string) => string;
    payoutLowDetail: string;

    leverageName: string;
    leverageModerateDesc: string;
    leverageModerateDetail: string;
    leverageLowDesc: (v: string) => string;
    leverageLowDetail: string;
    leverageHealthyDesc: (v: string) => string;
    leverageHealthyDetail: string;
    leverageCautionDesc: (v: string) => string;
    leverageCautionDetail: string;
    leverageCriticalDesc: (v: string) => string;
    leverageCriticalDetail: string;

    regularityName: string;
    regularityConsecutiveDesc: (y: number) => string;
    regularityConsecutiveDetail: string;
    regularityTenPlusDesc: (y: number) => string;
    regularityTenPlusDetail: string;
    regularityShortDesc: (y: number) => string;
    regularityShortDetail: string;

    roeName: string;
    roeConsistentDesc: string;
    roeConsistentDetail: string;
    roeExcellentDesc: (v: string) => string;
    roeExcellentDetail: string;
    roeSolidDesc: (v: string) => string;
    roeSolidDetail: (isUs: boolean) => string;
    roeCompressedDesc: (v: string) => string;
    roeCompressedDetail: string;
    roeLowDesc: (v: string) => string;
    roeLowDetail: string;
  };
}

const MESSAGES: Record<"ptBR" | "en" | "es", LocalizationDictionary> = {
  ptBR: {
    tiers: {
      very_safe: {
        label: "Muito Seguro",
        summary:
          "Excelente blindagem financeira. Risco estatístico de corte de proventos praticamente nulo nos próximos 12 meses.",
      },
      safe: {
        label: "Seguro",
        summary:
          "Fundamentos sólidos e geração de caixa previsível. Capacidade adequada de honrar o fluxo de dividendos.",
      },
      caution: {
        label: "Atenção",
        summary:
          "Métricas em alerta (payout alto ou alavancagem esticada). Suscetível a oscilações em caso de compressão de margens.",
      },
      cut_risk: {
        label: "Risco de Corte",
        summary:
          "Alta probabilidade de redução ou suspensão de proventos. Estrutura de capital ou payout não sustentam o patamar atual.",
      },
    },
    fii: {
      occupancyName: "Ocupação dos Imóveis",
      occupancyControlledDesc: "Vacância controlada",
      occupancyControlledDetail: "Dentro da média histórica do setor imobiliário.",
      occupancyExcellentDesc: (v) => `${v}% (Excelente)`,
      occupancyExcellentDetail: "Taxa de ocupação acima de 95%, fluxo de aluguéis altamente blindado.",
      occupancyHealthyDesc: (v) => `${v}% (Saudável)`,
      occupancyHealthyDetail: () => "Vacância em níveis normais para fundos de tijolo/renda.",
      occupancyCautionDesc: (v) => `${v}% (Atenção)`,
      occupancyCautionDetail: "Vacância moderada pressionando a distribuição de rendimentos.",
      occupancyRiskDesc: (v) => `${v}% (Risco)`,
      occupancyRiskDetail: "Alta vacância física ou financeira gerando perda relevante de receita.",

      valuationName: (isReit) => (isReit ? "Valuation Patrimonial (P/NAV)" : "Valuation Patrimonial (P/VP)"),
      valuationBalancedDesc: (isReit) => (isReit ? "P/NAV Equilibrado" : "P/VP Equilibrado"),
      valuationBalancedDetail: "Cotação em linha com valor patrimonial dos laudos técnicos.",
      valuationFairDesc: (v) => `${v}x (Justo / Saudável)`,
      valuationFairDetail: (isReit) =>
        isReit
          ? "Sem distorções patrimoniais severas; emissões futuras no valor do NAV."
          : "Sem distorções patrimoniais severas; emissões futuras no valor da cota patrimonial.",
      valuationPremiumDesc: (v) => `${v}x (Ágio)`,
      valuationPremiumDetail: "Negociando com ágio sobre laudo patrimonial; risco moderado em novas emissões.",
      valuationDiscountDesc: (v) => `${v}x (Desconto Expressivo)`,
      valuationDiscountDetail: (isReit) =>
        isReit
          ? "Desconto sobre NAV pode sinalizar risco de reavaliação de ativos ou endividamento."
          : "Desconto pode indicar desvalorização de imóveis ou risco de crédito em CRIs.",
      valuationDistortionDesc: (v) => `${v}x (Distorção Extrema)`,
      valuationDistortionDetail: "Cotação em níveis atípicos; atenção a risco de liquidação ou calote de devedores.",

      consistencyName: "Consistência Histórica",
      consistencyRegularDesc: (y) => `${y} anos pagando`,
      consistencyRegularDetail: "Histórico recorrente de distribuição mensal.",
      consistencyTenPlusDesc: (y) => `${y}+ anos ininterruptos`,
      consistencyTenPlusDetail: "Comprovada resiliência em múltiplos ciclos econômicos.",
      consistencyShortDesc: (y) => `${y} anos (Fundo Recente)`,
      consistencyShortDetail: "Fundo com menor histórico operacional para validação de estresse.",
    },
    stocks: {
      payoutName: "Payout Ratio",
      payoutModerateDesc: "Payout moderado",
      payoutModerateDetail: "Empresa retém parcela do lucro para investimentos e reservas.",
      payoutConservativeDesc: (v) => `${v}% (Conservador)`,
      payoutConservativeDetail: "Excelente margem de segurança. Lucro cobre os dividendos com folga de mais de 40%.",
      payoutBalancedDesc: (v) => `${v}% (Equilibrado)`,
      payoutBalancedDetail: "Distribuição compatível com empresas maduras e geradoras de caixa estável.",
      payoutElevatedDesc: (v) => `${v}% (Elevado)`,
      payoutElevatedDetail: "Pouca margem de retenção. Qualquer queda no lucro líquido pode forçar corte.",
      payoutUnsustainableDesc: (v) => `${v}% (Insustentável)`,
      payoutUnsustainableDetail: "Empresa distribuindo mais do que lucra no exercício. Risco iminente de corte.",
      payoutLowDesc: (v) => `${v}% (Baixo)`,
      payoutLowDetail: "Empresa prioriza reinvestimento sobre proventos imediatos.",

      leverageName: "Alavancagem (Dív. Líq / EBITDA)",
      leverageModerateDesc: "Alavancagem moderada",
      leverageModerateDetail: "Nível de endividamento confortável perante a geração de caixa.",
      leverageLowDesc: (v) => `${v}x (Baixa / Caixa Líquido)`,
      leverageLowDetail: "Balanço extremamente sólido, dívida não ameaça a distribuição de proventos.",
      leverageHealthyDesc: (v) => `${v}x (Saudável)`,
      leverageHealthyDetail: "Endividamento sob controle, dentro dos parâmetros de empresas de utilidade pública.",
      leverageCautionDesc: (v) => `${v}x (Atenção)`,
      leverageCautionDetail: "Alavancagem moderadamente alta; juros elevados consom fatia da geração de caixa.",
      leverageCriticalDesc: (v) => `${v}x (Crítica)`,
      leverageCriticalDetail: "Endividamento perigoso; covenants financeiros podem exigir retenção integral de lucros.",

      regularityName: "Regularidade Histórica",
      regularityConsecutiveDesc: (y) => `${y} anos consecutivos`,
      regularityConsecutiveDetail: "Histórico estável de proventos aos acionistas.",
      regularityTenPlusDesc: (y) => `${y}+ anos ininterruptos`,
      regularityTenPlusDetail: "Companhia passou por recessões e choques de mercado sem interromper proventos.",
      regularityShortDesc: (y) => `${y} anos (Histórico curto)`,
      regularityShortDetail: "Pouco tempo de bolsa para comprovar disciplina de proventos em crises.",

      roeName: "Rentabilidade (ROE)",
      roeConsistentDesc: "ROE consistente",
      roeConsistentDetail: "Retorno sobre patrimônio cobre o custo de oportunidade de capital.",
      roeExcellentDesc: (v) => `${v}% (Excelente)`,
      roeExcellentDetail: "Alta rentabilidade e forte fosso competitivo (moat).",
      roeSolidDesc: (v) => `${v}% (Sólido)`,
      roeSolidDetail: (isUs) =>
        isUs
          ? "Gera valor acima do custo de capital de longo prazo."
          : "Gera valor acima do custo de capital brasileiro.",
      roeCompressedDesc: (v) => `${v}% (Comprimido)`,
      roeCompressedDetail: "Rentabilidade modesta perante a taxa básica de juros.",
      roeLowDesc: (v) => `${v}% (Baixo/Negativo)`,
      roeLowDetail: "Operação com baixa eficiência de capital; risco estrutural.",
    },
  },
  en: {
    tiers: {
      very_safe: {
        label: "Very Safe",
        summary:
          "Excellent financial shielding. Statistical risk of a dividend cut is virtually zero over the next 12 months.",
      },
      safe: {
        label: "Safe",
        summary:
          "Solid fundamentals and predictable cash generation. Adequate capacity to maintain dividend stream.",
      },
      caution: {
        label: "Caution",
        summary:
          "Metrics on alert (elevated payout or stretched leverage). Susceptible to fluctuations under margin compression.",
      },
      cut_risk: {
        label: "Cut Risk",
        summary:
          "High probability of dividend reduction or suspension. Capital structure or payout cannot sustain current distribution.",
      },
    },
    fii: {
      occupancyName: "Property Occupancy",
      occupancyControlledDesc: "Controlled vacancy",
      occupancyControlledDetail: "Within historical real estate sector average.",
      occupancyExcellentDesc: (v) => `${v}% (Excellent)`,
      occupancyExcellentDetail: "Occupancy rate above 95%, rental cash flows highly shielded.",
      occupancyHealthyDesc: (v) => `${v}% (Healthy)`,
      occupancyHealthyDetail: (isReit) =>
        isReit
          ? "Vacancy within normal operational range for commercial real estate."
          : "Vacancy within normal operational range for income properties.",
      occupancyCautionDesc: (v) => `${v}% (Caution)`,
      occupancyCautionDetail: "Moderate vacancy placing pressure on distributable cash flow.",
      occupancyRiskDesc: (v) => `${v}% (High Risk)`,
      occupancyRiskDetail: "High vacancy generating material rental revenue loss.",

      valuationName: (isReit) => (isReit ? "Valuation (Price / NAV)" : "Valuation to Book (P/B)"),
      valuationBalancedDesc: (isReit) => (isReit ? "Balanced P/NAV" : "Balanced P/B"),
      valuationBalancedDetail: "Trading in line with appraised Net Asset Value (NAV).",
      valuationFairDesc: (v) => `${v}x (Fair / Healthy)`,
      valuationFairDetail: (isReit) =>
        isReit
          ? "No severe NAV distortions; secondary offerings aligned with asset value."
          : "No severe book value distortions.",
      valuationPremiumDesc: (v) => `${v}x (Premium to NAV)`,
      valuationPremiumDetail: "Trading at premium over NAV; moderate dilution risk on follow-on offerings.",
      valuationDiscountDesc: (v) => `${v}x (Significant Discount)`,
      valuationDiscountDetail: (isReit) =>
        isReit
          ? "Discount to NAV may signal property devaluations, debt pressure, or credit risk."
          : "Discount may signal credit or property devaluations.",
      valuationDistortionDesc: (v) => `${v}x (Extreme Distortion)`,
      valuationDistortionDetail: "Valuation at atypical levels; caution regarding liquidation or credit impairment.",

      consistencyName: "Dividend Track Record",
      consistencyRegularDesc: (y) => `${y} years paying`,
      consistencyRegularDetail: "Recurring monthly or regular distribution track record.",
      consistencyTenPlusDesc: (y) => `${y}+ consecutive years`,
      consistencyTenPlusDetail: "Proven resilience across multiple macroeconomic cycles.",
      consistencyShortDesc: (y) => `${y} yrs (Recent Fund)`,
      consistencyShortDetail: "Shorter operational history under economic stress testing.",
    },
    stocks: {
      payoutName: "Payout Ratio",
      payoutModerateDesc: "Moderate payout",
      payoutModerateDetail: "Company retains portion of earnings for Capex and balance sheet reserves.",
      payoutConservativeDesc: (v) => `${v}% (Conservative)`,
      payoutConservativeDetail: "Excellent margin of safety. Earnings cover dividends with >40% buffer.",
      payoutBalancedDesc: (v) => `${v}% (Balanced)`,
      payoutBalancedDetail: "Payout consistent with mature cash cows with defensive cash flows.",
      payoutElevatedDesc: (v) => `${v}% (Elevated)`,
      payoutElevatedDetail: "Thin safety buffer. Any earnings contraction could trigger a dividend cut.",
      payoutUnsustainableDesc: (v) => `${v}% (Unsustainable)`,
      payoutUnsustainableDetail: "Distributing more than net earnings. Imminent risk of dividend reduction.",
      payoutLowDesc: (v) => `${v}% (Low)`,
      payoutLowDetail: "Company prioritizes growth and reinvestment over immediate payouts.",

      leverageName: "Leverage (Net Debt / EBITDA)",
      leverageModerateDesc: "Moderate leverage",
      leverageModerateDetail: "Comfortable debt load relative to operational cash generation.",
      leverageLowDesc: (v) => `${v}x (Low / Net Cash)`,
      leverageLowDetail: "Rock-solid balance sheet; debt provides zero threat to dividend durability.",
      leverageHealthyDesc: (v) => `${v}x (Healthy)`,
      leverageHealthyDetail: "Controlled leverage, well within standard investment-grade utility thresholds.",
      leverageCautionDesc: (v) => `${v}x (Caution)`,
      leverageCautionDetail: "Moderately high leverage; elevated interest burden consumes operational cash flow.",
      leverageCriticalDesc: (v) => `${v}x (Critical)`,
      leverageCriticalDetail: "Hazardous debt burden; debt covenants may mandate dividend restriction.",

      regularityName: "Dividend Track Record",
      regularityConsecutiveDesc: (y) => `${y} consecutive years`,
      regularityConsecutiveDetail: "Stable historical distribution track record to shareholders.",
      regularityTenPlusDesc: (y) => `${y}+ consecutive years`,
      regularityTenPlusDetail: "Navigated recessions and market shocks without breaking dividend stream.",
      regularityShortDesc: (y) => `${y} yrs (Short history)`,
      regularityShortDetail: "Limited public market history to verify dividend discipline through crises.",

      roeName: "Profitability (ROE)",
      roeConsistentDesc: "Consistent ROE",
      roeConsistentDetail: "Return on Equity covers opportunity cost of capital.",
      roeExcellentDesc: (v) => `${v}% (Excellent)`,
      roeExcellentDetail: "High return on equity and wide economic moat.",
      roeSolidDesc: (v) => `${v}% (Solid)`,
      roeSolidDetail: () => "Generates returns comfortably above the long-term cost of capital.",
      roeCompressedDesc: (v) => `${v}% (Compressed)`,
      roeCompressedDetail: "Modest return relative to benchmark risk-free interest rates.",
      roeLowDesc: (v) => `${v}% (Low / Negative)`,
      roeLowDetail: "Low capital efficiency operations; structural margin risk.",
    },
  },
  es: {
    tiers: {
      very_safe: {
        label: "Muy Seguro",
        summary:
          "Excelente blindaje financiero. El riesgo estadístico de recorte de dividendos es prácticamente nulo en los próximos 12 meses.",
      },
      safe: {
        label: "Seguro",
        summary:
          "Fundamentos sólidos y generación de caja predecible. Capacidad adecuada para mantener el flujo de dividendos.",
      },
      caution: {
        label: "Precaución",
        summary:
          "Métricas en alerta (payout elevado o apalancamiento estirado). Susceptible a oscilaciones ante compresión de márgenes.",
      },
      cut_risk: {
        label: "Riesgo de Recorte",
        summary:
          "Alta probabilidad de reducción o suspensión de dividendos. Estructura de capital o payout no sostienen el nivel actual.",
      },
    },
    fii: {
      occupancyName: "Ocupación de Inmuebles",
      occupancyControlledDesc: "Vacancia controlada",
      occupancyControlledDetail: "Dentro de la media histórica del sector inmobiliario.",
      occupancyExcellentDesc: (v) => `${v}% (Excelente)`,
      occupancyExcellentDetail: "Tasa de ocupación superior al 95%, flujo de alquileres altamente blindado.",
      occupancyHealthyDesc: (v) => `${v}% (Saludable)`,
      occupancyHealthyDetail: () => "Vacancia en niveles normales para el sector inmobiliario de renta.",
      occupancyCautionDesc: (v) => `${v}% (Atención)`,
      occupancyCautionDetail: "Vacancia moderada presionando la distribución de rentas.",
      occupancyRiskDesc: (v) => `${v}% (Riesgo)`,
      occupancyRiskDetail: "Alta vacancia física o financiera generando pérdida relevante de ingresos.",

      valuationName: (isReit) => (isReit ? "Valuación Patrimonial (P/NAV)" : "Valuación Patrimonial (P/VL)"),
      valuationBalancedDesc: (isReit) => (isReit ? "P/NAV Equilibrado" : "P/VL Equilibrado"),
      valuationBalancedDetail: "Cotización en línea con el valor patrimonial neto de tasación.",
      valuationFairDesc: (v) => `${v}x (Justo / Saludable)`,
      valuationFairDetail: (isReit) =>
        isReit
          ? "Sin distorsiones patrimoniales severas; emisiones futuras al valor cuota del NAV."
          : "Sin distorsiones patrimoniales severas; emisiones futuras al valor cuota patrimonial.",
      valuationPremiumDesc: (v) => `${v}x (Prima sobre NAV)`,
      valuationPremiumDetail: "Cotizando con prima sobre el valor patrimonial; riesgo moderado en nuevas emisiones.",
      valuationDiscountDesc: (v) => `${v}x (Descuento Expresivo)`,
      valuationDiscountDetail: (isReit) =>
        isReit
          ? "El descuento sobre el NAV puede indicar desvalorización de inmuebles o deuda."
          : "El descuento puede indicar desvalorización de inmuebles o riesgo de crédito.",
      valuationDistortionDesc: (v) => `${v}x (Distorsión Extrema)`,
      valuationDistortionDetail: "Cotización en niveles atípicos; atención a riesgo de liquidación o impago de deudores.",

      consistencyName: "Historial de Dividendos",
      consistencyRegularDesc: (y) => `${y} años pagando`,
      consistencyRegularDetail: "Historial recurrente de distribución regular.",
      consistencyTenPlusDesc: (y) => `${y}+ años ininterrumpidos`,
      consistencyTenPlusDetail: "Comprobada resiliencia en múltiples ciclos económicos.",
      consistencyShortDesc: (y) => `${y} años (Fondo Reciente)`,
      consistencyShortDetail: "Fondo con menor historial operativo para validación de estrés.",
    },
    stocks: {
      payoutName: "Payout Ratio",
      payoutModerateDesc: "Payout moderado",
      payoutModerateDetail: "La empresa retiene parte de las ganancias para reinversión y reservas.",
      payoutConservativeDesc: (v) => `${v}% (Conservador)`,
      payoutConservativeDetail: "Excelente margen de seguridad. El beneficio cubre los dividendos con holgura superior al 40%.",
      payoutBalancedDesc: (v) => `${v}% (Equilibrado)`,
      payoutBalancedDetail: "Distribución compatible con empresas maduras y generadoras de caja estable.",
      payoutElevatedDesc: (v) => `${v}% (Elevado)`,
      payoutElevatedDetail: "Poco margen de retención. Cualquier caída en el beneficio neto podría forzar un recorte.",
      payoutUnsustainableDesc: (v) => `${v}% (Insostenible)`,
      payoutUnsustainableDetail: "Distribuyendo más de lo que gana en el ejercicio. Riesgo inminente de recorte.",
      payoutLowDesc: (v) => `${v}% (Bajo)`,
      payoutLowDetail: "La empresa prioriza el crecimiento y la reinversión sobre dividendos inmediatos.",

      leverageName: "Apalancamiento (Deuda Neta / EBITDA)",
      leverageModerateDesc: "Apalancamiento moderado",
      leverageModerateDetail: "Nivel de endeudamiento cómodo frente a la generación de caja operativa.",
      leverageLowDesc: (v) => `${v}x (Baja / Caja Neta)`,
      leverageLowDetail: "Balance sumamente sólido; la deuda no compromete el flujo de dividendos.",
      leverageHealthyDesc: (v) => `${v}x (Saludable)`,
      leverageHealthyDetail: "Endeudamiento bajo control, dentro de los parámetros de empresas maduras.",
      leverageCautionDesc: (v) => `${v}x (Atención)`,
      leverageCautionDetail: "Apalancamiento moderadamente alto; mayores intereses consumen flujo de caja.",
      leverageCriticalDesc: (v) => `${v}x (Crítica)`,
      leverageCriticalDetail: "Endeudamiento peligroso; covenants financieros podrían exigir suspender dividendos.",

      regularityName: "Regularidad Histórica",
      regularityConsecutiveDesc: (y) => `${y} años consecutivos`,
      regularityConsecutiveDetail: "Historial estable de proventos para los accionistas.",
      regularityTenPlusDesc: (y) => `${y}+ años ininterrumpidos`,
      regularityTenPlusDetail: "Superó recesiones y crisis de mercado sin interrumpir dividendos.",
      regularityShortDesc: (y) => `${y} años (Historial corto)`,
      regularityShortDetail: "Poco tiempo en bolsa para comprobar disciplina de dividendos ante crisis.",

      roeName: "Rentabilidad (ROE)",
      roeConsistentDesc: "ROE consistente",
      roeConsistentDetail: "El retorno sobre el patrimonio cubre el costo de oportunidad del capital.",
      roeExcellentDesc: (v) => `${v}% (Excelente)`,
      roeExcellentDetail: "Alta rentabilidad y fuerte foso competitivo (moat).",
      roeSolidDesc: (v) => `${v}% (Sólido)`,
      roeSolidDetail: () => "Genera valor holgadamente por encima del costo de capital.",
      roeCompressedDesc: (v) => `${v}% (Comprimido)`,
      roeCompressedDetail: "Rentabilidad modesta frente a las tasas de interés de referencia.",
      roeLowDesc: (v) => `${v}% (Bajo / Negativo)`,
      roeLowDetail: "Operación con baja eficiencia de capital; riesgo estructural.",
    },
  },
};

export function calculateDividendSafetyScore(
  input: AssetSafetyInput,
  localeParam?: "ptBR" | "en" | "es" | string
): DividendSafetyResult {
  const activeLocale = ((input.locale ?? localeParam ?? "ptBR") as "ptBR" | "en" | "es");
  const msg = MESSAGES[activeLocale] ?? MESSAGES.ptBR;

  const isFii = input.type === "FII" || input.type === "REIT";
  const isReit = input.type === "REIT" || (isFii && input.currency === "USD");
  const isUs = input.type === "STOCK_US" || input.currency === "USD" || isReit;

  const factors: DividendSafetyFactor[] = [];

  if (isFii) {
    // --- FII / REIT MODEL ---
    // 1. Vacancy / Occupancy (weight 0.40)
    const vacancy = normalizePct(input.vacancyRate);
    let vacancyScore = 75;
    let vacancyDesc = msg.fii.occupancyControlledDesc;
    let vacancyDetail = msg.fii.occupancyControlledDetail;
    let vacancyStatus: DividendSafetyFactor["status"] = "neutral";

    if (vacancy != null) {
      if (vacancy <= 5) {
        vacancyScore = 95;
        vacancyDesc = msg.fii.occupancyExcellentDesc(vacancy.toFixed(1));
        vacancyDetail = msg.fii.occupancyExcellentDetail;
        vacancyStatus = "success";
      } else if (vacancy <= 10) {
        vacancyScore = 80;
        vacancyDesc = msg.fii.occupancyHealthyDesc(vacancy.toFixed(1));
        vacancyDetail = msg.fii.occupancyHealthyDetail(isReit);
        vacancyStatus = "success";
      } else if (vacancy <= 20) {
        vacancyScore = 50;
        vacancyDesc = msg.fii.occupancyCautionDesc(vacancy.toFixed(1));
        vacancyDetail = msg.fii.occupancyCautionDetail;
        vacancyStatus = "warning";
      } else {
        vacancyScore = 20;
        vacancyDesc = msg.fii.occupancyRiskDesc(vacancy.toFixed(1));
        vacancyDetail = msg.fii.occupancyRiskDetail;
        vacancyStatus = "danger";
      }
    }
    factors.push({
      name: msg.fii.occupancyName,
      score: vacancyScore,
      weight: 0.4,
      valueDescription: vacancyDesc,
      detail: vacancyDetail,
      status: vacancyStatus,
    });

    // 2. Valuation multiple - P/VP or Price/NAV (weight 0.35)
    const pvp = input.pvp;
    let pvpScore = 75;
    let pvpDesc = msg.fii.valuationBalancedDesc(isReit);
    let pvpDetail = msg.fii.valuationBalancedDetail;
    let pvpStatus: DividendSafetyFactor["status"] = "neutral";

    if (pvp != null && Number.isFinite(pvp)) {
      if (pvp >= 0.85 && pvp <= 1.05) {
        pvpScore = 95;
        pvpDesc = msg.fii.valuationFairDesc(pvp.toFixed(2));
        pvpDetail = msg.fii.valuationFairDetail(isReit);
        pvpStatus = "success";
      } else if (pvp > 1.05 && pvp <= 1.25) {
        pvpScore = 70;
        pvpDesc = msg.fii.valuationPremiumDesc(pvp.toFixed(2));
        pvpDetail = msg.fii.valuationPremiumDetail;
        pvpStatus = "warning";
      } else if (pvp < 0.85 && pvp >= 0.65) {
        pvpScore = 60;
        pvpDesc = msg.fii.valuationDiscountDesc(pvp.toFixed(2));
        pvpDetail = msg.fii.valuationDiscountDetail(isReit);
        pvpStatus = "warning";
      } else {
        pvpScore = 30;
        pvpDesc = msg.fii.valuationDistortionDesc(pvp.toFixed(2));
        pvpDetail = msg.fii.valuationDistortionDetail;
        pvpStatus = "danger";
      }
    }
    factors.push({
      name: msg.fii.valuationName(isReit),
      score: pvpScore,
      weight: 0.35,
      valueDescription: pvpDesc,
      detail: pvpDetail,
      status: pvpStatus,
    });

    // 3. Payment regularity (weight 0.25)
    const years = input.yearsPayingDividends ?? 5;
    let regScore = 80;
    let regDesc = msg.fii.consistencyRegularDesc(years);
    let regDetail = msg.fii.consistencyRegularDetail;
    let regStatus: DividendSafetyFactor["status"] = "success";

    if (years >= 10) {
      regScore = 100;
      regDesc = msg.fii.consistencyTenPlusDesc(years);
      regDetail = msg.fii.consistencyTenPlusDetail;
    } else if (years < 3) {
      regScore = 50;
      regDesc = msg.fii.consistencyShortDesc(years);
      regDetail = msg.fii.consistencyShortDetail;
      regStatus = "warning";
    }
    factors.push({
      name: msg.fii.consistencyName,
      score: regScore,
      weight: 0.25,
      valueDescription: regDesc,
      detail: regDetail,
      status: regStatus,
    });
  } else {
    // --- STOCKS MODEL (Ações BR e US) ---
    // 1. Payout Ratio (weight 0.35)
    const payout = normalizePct(input.payoutRatio);
    let payoutScore = 75;
    let payoutDesc = msg.stocks.payoutModerateDesc;
    let payoutDetail = msg.stocks.payoutModerateDetail;
    let payoutStatus: DividendSafetyFactor["status"] = "neutral";

    if (payout != null) {
      if (payout >= 25 && payout <= 60) {
        payoutScore = 100;
        payoutDesc = msg.stocks.payoutConservativeDesc(payout.toFixed(1));
        payoutDetail = msg.stocks.payoutConservativeDetail;
        payoutStatus = "success";
      } else if (payout > 60 && payout <= 80) {
        payoutScore = 80;
        payoutDesc = msg.stocks.payoutBalancedDesc(payout.toFixed(1));
        payoutDetail = msg.stocks.payoutBalancedDetail;
        payoutStatus = "success";
      } else if (payout > 80 && payout <= 100) {
        payoutScore = 55;
        payoutDesc = msg.stocks.payoutElevatedDesc(payout.toFixed(1));
        payoutDetail = msg.stocks.payoutElevatedDetail;
        payoutStatus = "warning";
      } else if (payout > 100) {
        payoutScore = 15;
        payoutDesc = msg.stocks.payoutUnsustainableDesc(payout.toFixed(1));
        payoutDetail = msg.stocks.payoutUnsustainableDetail;
        payoutStatus = "danger";
      } else {
        // payout < 25%
        payoutScore = 70;
        payoutDesc = msg.stocks.payoutLowDesc(payout.toFixed(1));
        payoutDetail = msg.stocks.payoutLowDetail;
        payoutStatus = "neutral";
      }
    }
    factors.push({
      name: msg.stocks.payoutName,
      score: payoutScore,
      weight: 0.35,
      valueDescription: payoutDesc,
      detail: payoutDetail,
      status: payoutStatus,
    });

    // 2. Leverage - Net Debt / EBITDA (weight 0.30)
    const lev = input.netDebtToEbitda;
    let levScore = 80;
    let levDesc = msg.stocks.leverageModerateDesc;
    let levDetail = msg.stocks.leverageModerateDetail;
    let levStatus: DividendSafetyFactor["status"] = "neutral";

    if (lev != null && Number.isFinite(lev)) {
      if (lev <= 1.0) {
        levScore = 100;
        levDesc = msg.stocks.leverageLowDesc(lev.toFixed(1));
        levDetail = msg.stocks.leverageLowDetail;
        levStatus = "success";
      } else if (lev <= 2.2) {
        levScore = 85;
        levDesc = msg.stocks.leverageHealthyDesc(lev.toFixed(1));
        levDetail = msg.stocks.leverageHealthyDetail;
        levStatus = "success";
      } else if (lev <= 3.2) {
        levScore = 55;
        levDesc = msg.stocks.leverageCautionDesc(lev.toFixed(1));
        levDetail = msg.stocks.leverageCautionDetail;
        levStatus = "warning";
      } else {
        levScore = 20;
        levDesc = msg.stocks.leverageCriticalDesc(lev.toFixed(1));
        levDetail = msg.stocks.leverageCriticalDetail;
        levStatus = "danger";
      }
    }
    factors.push({
      name: msg.stocks.leverageName,
      score: levScore,
      weight: 0.3,
      valueDescription: levDesc,
      detail: levDetail,
      status: levStatus,
    });

    // 3. Payment regularity (weight 0.20)
    const years = input.yearsPayingDividends ?? 6;
    let regScore = 80;
    let regDesc = msg.stocks.regularityConsecutiveDesc(years);
    let regDetail = msg.stocks.regularityConsecutiveDetail;
    let regStatus: DividendSafetyFactor["status"] = "success";

    if (years >= 10) {
      regScore = 100;
      regDesc = msg.stocks.regularityTenPlusDesc(years);
      regDetail = msg.stocks.regularityTenPlusDetail;
    } else if (years < 3) {
      regScore = 45;
      regDesc = msg.stocks.regularityShortDesc(years);
      regDetail = msg.stocks.regularityShortDetail;
      regStatus = "warning";
    }
    factors.push({
      name: msg.stocks.regularityName,
      score: regScore,
      weight: 0.2,
      valueDescription: regDesc,
      detail: regDetail,
      status: regStatus,
    });

    // 4. Profitability - ROE (weight 0.15)
    const roe = normalizePct(input.roe);
    let roeScore = 80;
    let roeDesc = msg.stocks.roeConsistentDesc;
    let roeDetail = msg.stocks.roeConsistentDetail;
    let roeStatus: DividendSafetyFactor["status"] = "neutral";

    if (roe != null) {
      if (roe >= 18) {
        roeScore = 100;
        roeDesc = msg.stocks.roeExcellentDesc(roe.toFixed(1));
        roeDetail = msg.stocks.roeExcellentDetail;
        roeStatus = "success";
      } else if (roe >= 12) {
        roeScore = 80;
        roeDesc = msg.stocks.roeSolidDesc(roe.toFixed(1));
        roeDetail = msg.stocks.roeSolidDetail(isUs);
        roeStatus = "success";
      } else if (roe >= 5) {
        roeScore = 50;
        roeDesc = msg.stocks.roeCompressedDesc(roe.toFixed(1));
        roeDetail = msg.stocks.roeCompressedDetail;
        roeStatus = "warning";
      } else {
        roeScore = 20;
        roeDesc = msg.stocks.roeLowDesc(roe.toFixed(1));
        roeDetail = msg.stocks.roeLowDetail;
        roeStatus = "danger";
      }
    }
    factors.push({
      name: msg.stocks.roeName,
      score: roeScore,
      weight: 0.15,
      valueDescription: roeDesc,
      detail: roeDetail,
      status: roeStatus,
    });
  }

  // Calculate weighted score
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const rawScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0) / (totalWeight || 1);
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Determine Tier and Cut Risk Probability
  let tier: DividendSafetyTier = "safe";
  let badgeVariant: DividendSafetyResult["badgeVariant"] = "success";
  let cutRiskProbabilityPct = 12;

  if (score >= 80) {
    tier = "very_safe";
    badgeVariant = "success";
    cutRiskProbabilityPct = 5;
  } else if (score >= 60) {
    tier = "safe";
    badgeVariant = "success";
    cutRiskProbabilityPct = 15;
  } else if (score >= 40) {
    tier = "caution";
    badgeVariant = "warning";
    cutRiskProbabilityPct = 38;
  } else {
    tier = "cut_risk";
    badgeVariant = "danger";
    cutRiskProbabilityPct = 72;
  }

  const label = msg.tiers[tier]?.label ?? "Seguro";
  const summary = msg.tiers[tier]?.summary ?? "";

  return {
    score,
    tier,
    label,
    badgeVariant,
    summary,
    factors,
    cutRiskProbabilityPct,
  };
}
