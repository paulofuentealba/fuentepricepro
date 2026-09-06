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
  vacancyRate?: number | null; // for FIIs, e.g. 0.04
  pvp?: number | null; // for FIIs, e.g. 0.98
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

export function calculateDividendSafetyScore(input: AssetSafetyInput): DividendSafetyResult {
  const isFii = input.type === "FII" || input.type === "REIT";
  const factors: DividendSafetyFactor[] = [];

  if (isFii) {
    // --- FII / REIT MODEL ---
    // 1. Vacancy / Inadimplência (weight 0.40)
    const vacancy = normalizePct(input.vacancyRate);
    let vacancyScore = 75;
    let vacancyDesc = "Vacância controlada";
    let vacancyDetail = "Dentro da média histórica do setor imobiliário.";
    let vacancyStatus: DividendSafetyFactor["status"] = "neutral";

    if (vacancy != null) {
      if (vacancy <= 5) {
        vacancyScore = 95;
        vacancyDesc = `${vacancy.toFixed(1)}% (Excelente)`;
        vacancyDetail = "Taxa de ocupação acima de 95%, fluxo de aluguéis altamente blindado.";
        vacancyStatus = "success";
      } else if (vacancy <= 10) {
        vacancyScore = 80;
        vacancyDesc = `${vacancy.toFixed(1)}% (Saudável)`;
        vacancyDetail = "Vacância em níveis normais para fundos de tijolo/renda.";
        vacancyStatus = "success";
      } else if (vacancy <= 20) {
        vacancyScore = 50;
        vacancyDesc = `${vacancy.toFixed(1)}% (Atenção)`;
        vacancyDetail = "Vacância moderada pressionando a distribuição de rendimentos.";
        vacancyStatus = "warning";
      } else {
        vacancyScore = 20;
        vacancyDesc = `${vacancy.toFixed(1)}% (Risco)`;
        vacancyDetail = "Alta vacância física ou financeira gerando perda relevante de receita.";
        vacancyStatus = "danger";
      }
    }
    factors.push({
      name: "Ocupação dos Imóveis",
      score: vacancyScore,
      weight: 0.4,
      valueDescription: vacancyDesc,
      detail: vacancyDetail,
      status: vacancyStatus,
    });

    // 2. Preço / Valor Patrimonial - P/VP (weight 0.35)
    const pvp = input.pvp;
    let pvpScore = 75;
    let pvpDesc = "P/VP Equilibrado";
    let pvpDetail = "Cotação em linha com valor patrimonial dos laudos técnicos.";
    let pvpStatus: DividendSafetyFactor["status"] = "neutral";

    if (pvp != null && Number.isFinite(pvp)) {
      if (pvp >= 0.85 && pvp <= 1.05) {
        pvpScore = 95;
        pvpDesc = `${pvp.toFixed(2)}x (Justo / Saudável)`;
        pvpDetail = "Sem distorções patrimoniais severas; emissões futuras no valor da cota patrimonial.";
        pvpStatus = "success";
      } else if (pvp > 1.05 && pvp <= 1.25) {
        pvpScore = 70;
        pvpDesc = `${pvp.toFixed(2)}x (Ágio)`;
        pvpDetail = "Negociando com ágio sobre laudo patrimonial; risco moderado em novas emissões.";
        pvpStatus = "warning";
      } else if (pvp < 0.85 && pvp >= 0.65) {
        pvpScore = 60;
        pvpDesc = `${pvp.toFixed(2)}x (Desconto Expressivo)`;
        pvpDetail = "Desconto pode indicar desvalorização de imóveis ou risco de crédito em CRIs.";
        pvpStatus = "warning";
      } else {
        pvpScore = 30;
        pvpDesc = `${pvp.toFixed(2)}x (Distorção Extrema)`;
        pvpDetail = "Cotação em níveis atípicos; atenção a risco de liquidação ou calote de devedores.";
        pvpStatus = "danger";
      }
    }
    factors.push({
      name: "Valuation Patrimonial (P/VP)",
      score: pvpScore,
      weight: 0.35,
      valueDescription: pvpDesc,
      detail: pvpDetail,
      status: pvpStatus,
    });

    // 3. Regularidade de Pagamento (weight 0.25)
    const years = input.yearsPayingDividends ?? 5;
    let regScore = 80;
    let regDesc = `${years} anos pagando`;
    let regDetail = "Histórico recorrente de distribuição mensal.";
    let regStatus: DividendSafetyFactor["status"] = "success";

    if (years >= 10) {
      regScore = 100;
      regDesc = `${years}+ anos ininterruptos`;
      regDetail = "Comprovada resiliência em múltiplos ciclos econômicos.";
    } else if (years < 3) {
      regScore = 50;
      regDesc = `${years} anos (Fundo Recente)`;
      regDetail = "Fundo com menor histórico operacional para validação de estresse.";
      regStatus = "warning";
    }
    factors.push({
      name: "Consistência Histórica",
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
    let payoutDesc = "Payout moderado";
    let payoutDetail = "Empresa retém parcela do lucro para investimentos e reservas.";
    let payoutStatus: DividendSafetyFactor["status"] = "neutral";

    if (payout != null) {
      if (payout >= 25 && payout <= 60) {
        payoutScore = 100;
        payoutDesc = `${payout.toFixed(1)}% (Conservador)`;
        payoutDetail = "Excelente margem de segurança. Lucro cobre os dividendos com folga de mais de 40%.";
        payoutStatus = "success";
      } else if (payout > 60 && payout <= 80) {
        payoutScore = 80;
        payoutDesc = `${payout.toFixed(1)}% (Equilibrado)`;
        payoutDetail = "Distribuição compatível com empresas maduras e geradoras de caixa estável.";
        payoutStatus = "success";
      } else if (payout > 80 && payout <= 100) {
        payoutScore = 55;
        payoutDesc = `${payout.toFixed(1)}% (Elevado)`;
        payoutDetail = "Pouca margem de retenção. Qualquer queda no lucro líquido pode forçar corte.";
        payoutStatus = "warning";
      } else if (payout > 100) {
        payoutScore = 15;
        payoutDesc = `${payout.toFixed(1)}% (Insustentável)`;
        payoutDetail = "Empresa distribuindo mais do que lucra no exercício. Risco iminente de corte.";
        payoutStatus = "danger";
      } else {
        // payout < 25%
        payoutScore = 70;
        payoutDesc = `${payout.toFixed(1)}% (Baixo)`;
        payoutDetail = "Empresa prioriza reinvestimento sobre proventos imediatos.";
        payoutStatus = "neutral";
      }
    }
    factors.push({
      name: "Payout Ratio",
      score: payoutScore,
      weight: 0.35,
      valueDescription: payoutDesc,
      detail: payoutDetail,
      status: payoutStatus,
    });

    // 2. Alavancagem - Dívida Líquida / EBITDA (weight 0.30)
    const lev = input.netDebtToEbitda;
    let levScore = 80;
    let levDesc = "Alavancagem moderada";
    let levDetail = "Nível de endividamento confortável perante a geração de caixa.";
    let levStatus: DividendSafetyFactor["status"] = "neutral";

    if (lev != null && Number.isFinite(lev)) {
      if (lev <= 1.0) {
        levScore = 100;
        levDesc = `${lev.toFixed(1)}x (Baixa / Caixa Líquido)`;
        levDetail = "Balanço extremamente sólido, dívida não ameaça a distribuição de proventos.";
        levStatus = "success";
      } else if (lev <= 2.2) {
        levScore = 85;
        levDesc = `${lev.toFixed(1)}x (Saudável)`;
        levDetail = "Endividamento sob controle, dentro dos parâmetros de empresas de utilidade pública.";
        levStatus = "success";
      } else if (lev <= 3.2) {
        levScore = 55;
        levDesc = `${lev.toFixed(1)}x (Atenção)`;
        levDetail = "Alavancagem moderadamente alta; juros elevados consom fatia da geração de caixa.";
        levStatus = "warning";
      } else {
        levScore = 20;
        levDesc = `${lev.toFixed(1)}x (Crítica)`;
        levDetail = "Endividamento perigoso; covenants financeiros podem exigir retenção integral de lucros.";
        levStatus = "danger";
      }
    }
    factors.push({
      name: "Alavancagem (Dív. Líq / EBITDA)",
      score: levScore,
      weight: 0.3,
      valueDescription: levDesc,
      detail: levDetail,
      status: levStatus,
    });

    // 3. Regularidade de Pagamento (weight 0.20)
    const years = input.yearsPayingDividends ?? 6;
    let regScore = 80;
    let regDesc = `${years} anos consecutivos`;
    let regDetail = "Histórico estável de proventos aos acionistas.";
    let regStatus: DividendSafetyFactor["status"] = "success";

    if (years >= 10) {
      regScore = 100;
      regDesc = `${years}+ anos ininterruptos`;
      regDetail = "Companhia passou por recessões e choques de mercado sem interromper proventos.";
    } else if (years < 3) {
      regScore = 45;
      regDesc = `${years} anos (Histórico curto)`;
      regDetail = "Pouco tempo de bolsa para comprovar disciplina de proventos em crises.";
      regStatus = "warning";
    }
    factors.push({
      name: "Regularidade Histórica",
      score: regScore,
      weight: 0.2,
      valueDescription: regDesc,
      detail: regDetail,
      status: regStatus,
    });

    // 4. Rentabilidade - ROE (weight 0.15)
    const roe = normalizePct(input.roe);
    let roeScore = 80;
    let roeDesc = "ROE consistente";
    let roeDetail = "Retorno sobre patrimônio cobre o custo de oportunidade de capital.";
    let roeStatus: DividendSafetyFactor["status"] = "neutral";

    if (roe != null) {
      if (roe >= 18) {
        roeScore = 100;
        roeDesc = `${roe.toFixed(1)}% (Excelente)`;
        roeDetail = "Alta rentabilidade e forte fosso competitivo (moat).";
        roeStatus = "success";
      } else if (roe >= 12) {
        roeScore = 80;
        roeDesc = `${roe.toFixed(1)}% (Sólido)`;
        roeDetail = "Gera valor acima do custo de capital brasileiro.";
        roeStatus = "success";
      } else if (roe >= 5) {
        roeScore = 50;
        roeDesc = `${roe.toFixed(1)}% (Comprimido)`;
        roeDetail = "Rentabilidade modesta perante a taxa básica de juros.";
        roeStatus = "warning";
      } else {
        roeScore = 20;
        roeDesc = `${roe.toFixed(1)}% (Baixo/Negativo)`;
        roeDetail = "Operação com baixa eficiência de capital; risco estrutural.";
        roeStatus = "danger";
      }
    }
    factors.push({
      name: "Rentabilidade (ROE)",
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
  let label = "Seguro";
  let badgeVariant: DividendSafetyResult["badgeVariant"] = "success";
  let cutRiskProbabilityPct = 12;
  let summary = "Fluxo de proventos com fundamentos consistentes e boa cobertura operacional.";

  if (score >= 80) {
    tier = "very_safe";
    label = "Muito Seguro";
    badgeVariant = "success";
    cutRiskProbabilityPct = 5;
    summary = "Excelente blindagem financeira. Risco estatístico de corte de proventos praticamente nulo nos próximos 12 meses.";
  } else if (score >= 60) {
    tier = "safe";
    label = "Seguro";
    badgeVariant = "success";
    cutRiskProbabilityPct = 15;
    summary = "Fundamentos sólidos e geração de caixa previsível. Capacidade adequada de honrar o fluxo de dividendos.";
  } else if (score >= 40) {
    tier = "caution";
    label = "Atenção";
    badgeVariant = "warning";
    cutRiskProbabilityPct = 38;
    summary = "Métricas em alerta (payout alto ou alavancagem esticada). Suscetível a oscilações em caso de compressão de margens.";
  } else {
    tier = "cut_risk";
    label = "Risco de Corte";
    badgeVariant = "danger";
    cutRiskProbabilityPct = 72;
    summary = "Alta probabilidade de redução ou suspensão de proventos. Estrutura de capital ou payout não sustentam o patamar atual.";
  }

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
