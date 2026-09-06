import type { AssetType, Currency } from "@/lib/domain";

export interface ClassMetricItem {
  label: string;
  val: string;
  desc: string;
}

export interface RepresentativeAssetData {
  ticker: string;
  name: string;
  classLabel: string;
  classType: AssetType;
  sector: string;
  currency: Currency;
  broker: string;
  price: number;
  teto: number;
  margin: number;
  action: string;
  actionType: "strong" | "ok" | "hold" | "danger";
  defaultQty: number;
  defaultPm: number;
  dyProj: string;
  payFreq: string;
  nextCom: string;
  nextPay: string;
  nextVal: string;
  snowballReqQty: number;
  snowballText: string;
  metricsBadge: string;
  metricsTitle: string;
  metrics: ClassMetricItem[];
  taxPassportHtml: string;
  bazinDiv: number;
  bazinYieldTarget: number;
  kDiscount: number;
  gGrowth: number;
}

export const REPRESENTATIVE_ASSETS: Record<string, RepresentativeAssetData> = {
  BBAS3: {
    ticker: "BBAS3",
    name: "Banco do Brasil S.A.",
    classLabel: "Ações Brasil",
    classType: "STOCK_BR",
    sector: "Financeiro • Intermediação Bancária",
    currency: "BRL",
    broker: "BTG Pactual",
    price: 27.45,
    teto: 34.0,
    margin: 23.8,
    action: "APORTE FORTE",
    actionType: "strong",
    defaultQty: 1200,
    defaultPm: 22.1,
    dyProj: "9,8% a.a.",
    payFreq: "8x ao ano (Previsível)",
    nextCom: "18/SET/2026",
    nextPay: "02/OUT/2026",
    nextVal: "R$ 0,65 / ação (JCP Líq)",
    snowballReqQty: 42,
    snowballText: "A cada corte, 42 ações geram proventos suficientes para adquirir 1 nova ação automaticamente.",
    metricsBadge: "MÉTRICAS BANCÁRIAS & DIVIDENDOS",
    metricsTitle: "Fundamentos de Crédito & Eficiência",
    metrics: [
      { label: "P/L", val: "4.1x", desc: "Múltiplo de Lucro com forte desconto histórico" },
      { label: "P/VP", val: "0.82", desc: "Negociando com 18% de desconto sobre o patrimônio" },
      { label: "ROE", val: "21.4%", desc: "Retorno sobre o patrimônio líquido consistente" },
      { label: "MARGEM LÍQUIDA", val: "18.2%", desc: "Rentabilidade operacional líquida" },
      { label: "PAYOUT", val: "45.0%", desc: "Política estatutária de distribuição de lucros" },
      { label: "ÍNDICE BASILEIA", val: "15.6%", desc: "Capitalização e solvência muito acima do mínimo" },
    ],
    taxPassportHtml:
      "<strong>Rendimentos:</strong> Dividendos são 100% isentos de imposto de renda para pessoa física. Juros sobre Capital Próprio (JCP) sofrem retenção exclusiva de 15% na fonte pela corretora.<br><strong>Ganho de Capital:</strong> Vendas no mercado à vista até R$ 20.000,00 no mês são isentas de IR. Acima desse limite, alíquota de 15% sobre o lucro líquido (20% em operações de day trade).",
    bazinDiv: 2.04,
    bazinYieldTarget: 6.0,
    kDiscount: 11.0,
    gGrowth: 5.0,
  },
  HGLG11: {
    ticker: "HGLG11",
    name: "CSHG Logística FII",
    classLabel: "FII (Fundo Imobiliário)",
    classType: "FII",
    sector: "Tijolo • Galpões Logísticos Classe AAA",
    currency: "BRL",
    broker: "BTG Pactual",
    price: 161.2,
    teto: 168.0,
    margin: 4.2,
    action: "APORTE OK",
    actionType: "ok",
    defaultQty: 440,
    defaultPm: 152.0,
    dyProj: "8,4% a.a.",
    payFreq: "Mensal (Todo dia 14)",
    nextCom: "30/SET/2026",
    nextPay: "14/OUT/2026",
    nextVal: "R$ 1,10 / cota",
    snowballReqQty: 147,
    snowballText: "Suas cotas geram proventos suficientes para comprar novas cotas mensalmente sem tirar do bolso.",
    metricsBadge: "MÉTRICAS IMOBILIÁRIAS (TIJOLO)",
    metricsTitle: "Eficiência Operacional do Portfólio",
    metrics: [
      { label: "P/VP", val: "1.02", desc: "Próximo ao valor justo dos laudos imobiliários" },
      { label: "VP POR COTA", val: "R$ 157,80", desc: "Patrimônio líquido avaliado por laudos independentes" },
      { label: "VACÂNCIA FÍSICA", val: "5.8%", desc: "Baixa desocupação nos principais eixos (SP/RJ/MG)" },
      { label: "VACÂNCIA FINANC.", val: "4.2%", desc: "Impacto financeiro reduzido de contratos vagos" },
      { label: "CAP RATE MÉDIO", val: "8.9% a.a.", desc: "Taxa de retorno operacional dos galpões" },
      { label: "CONTRATOS ATÍPICOS", val: "62%", desc: "Contratos de longo prazo (Build-to-Suit / Sale & Leaseback)" },
    ],
    taxPassportHtml:
      "<strong>Rendimentos Mensais:</strong> 100% isentos de imposto de renda para pessoa física, conforme Lei 11.033/04 (fundo com mais de 100 cotistas negociado em bolsa).<br><strong>Ganho de Capital:</strong> Alíquota fixa de 20% sobre o lucro líquido na venda das cotas (NÃO há isenção de R$ 20.000 para FIIs).",
    bazinDiv: 13.2,
    bazinYieldTarget: 8.0,
    kDiscount: 10.5,
    gGrowth: 4.0,
  },
  RURA11: {
    ticker: "RURA11",
    name: "Itaú Agro Crédito Fiagro",
    classLabel: "Fiagro",
    classType: "FIAGRO",
    sector: "Crédito Agrícola • CRA & Financiamento Agro",
    currency: "BRL",
    broker: "BTG Pactual",
    price: 9.85,
    teto: 10.2,
    margin: 3.5,
    action: "APORTE OK",
    actionType: "ok",
    defaultQty: 4000,
    defaultPm: 9.9,
    dyProj: "13,2% a.a.",
    payFreq: "Mensal (Todo dia 10)",
    nextCom: "30/SET/2026",
    nextPay: "10/OUT/2026",
    nextVal: "R$ 0,10 / cota",
    snowballReqQty: 98,
    snowballText: "A cada 98 cotas, os rendimentos mensais compram 1 nova cota de Fiagro automaticamente.",
    metricsBadge: "MÉTRICAS DE CRÉDITO DO AGRO",
    metricsTitle: "Qualidade da Carteira de CRAs",
    metrics: [
      { label: "P/VP", val: "0.98", desc: "Com leve desconto sobre a carteira de recebíveis" },
      { label: "VP POR COTA", val: "R$ 10,05", desc: "Valor da carteira de crédito marcada a mercado" },
      { label: "TAXA MÉDIA", val: "CDI + 3.8%", desc: "Spread médio sobre o CDI líquido" },
      { label: "GARANTIAS REAIS", val: "145% LTV", desc: "Alienação fiduciária em terras produtivas" },
      { label: "INADIMPLÊNCIA", val: "0.0%", desc: "Nenhum atraso ou default na carteira" },
      { label: "DURATION MÉDIA", val: "2.3 anos", desc: "Prazo médio moderado com amortizações contínuas" },
    ],
    taxPassportHtml:
      "<strong>Rendimentos Mensais:</strong> 100% isentos de imposto de renda para pessoa física, conforme Lei 14.130/2021.<br><strong>Ganho de Capital:</strong> Alíquota fixa de 20% sobre o ganho apurado na alienação das cotas em bolsa.",
    bazinDiv: 1.25,
    bazinYieldTarget: 12.0,
    kDiscount: 13.0,
    gGrowth: 2.0,
  },
  JURO11: {
    ticker: "JURO11",
    name: "Sparta Infra FI-Infra",
    classLabel: "FI-Infra",
    classType: "FII_INFRA",
    sector: "Infraestrutura • Debêntures Incentivadas",
    currency: "BRL",
    broker: "BTG Pactual",
    price: 97.5,
    teto: 104.0,
    margin: 6.7,
    action: "APORTE FORTE",
    actionType: "strong",
    defaultQty: 500,
    defaultPm: 92.4,
    dyProj: "12,8% a.a.",
    payFreq: "Mensal (Todo dia 22)",
    nextCom: "15/SET/2026",
    nextPay: "22/SET/2026",
    nextVal: "R$ 1,02 / cota",
    snowballReqQty: 96,
    snowballText: "A cada 96 cotas, os cupons mensais adquirem 1 cota de infraestrutura sem aporte externo.",
    metricsBadge: "MÉTRICAS DE RENDA FIXA INCENTIVADA",
    metricsTitle: "Estrutura do Crédito Privado",
    metrics: [
      { label: "P/VP", val: "1.00", desc: "Negociando perfeitamente a valor justo patrimonial" },
      { label: "VP POR COTA", val: "R$ 97,45", desc: "Valor da carteira de debêntures marcadas a mercado" },
      { label: "TAXA DA CARTEIRA", val: "IPCA + 7.4%", desc: "Retorno real acima da inflação garantido no cupom" },
      { label: "RATING MÉDIO", val: "AA+ / AAA", desc: "Grau de investimento nas principais agências (S&P/Fitch)" },
      { label: "DURATION", val: "4.8 anos", desc: "Maturação média dos projetos financiados" },
      { label: "BENEFÍCIO FISCAL", val: "Isenção Dupla", desc: "100% livre de IR tanto em rendimentos quanto ganho" },
    ],
    taxPassportHtml:
      "<strong>Super Isenção (Lei 12.431/2011):</strong> Os FI-Infras possuem o benefício fiscal mais forte do mercado brasileiro. Os rendimentos mensais são 100% isentos de IR E o ganho de capital na alienação de cotas na bolsa também é 100% isento de IR para pessoas físicas (sem limite de R$ 20k).",
    bazinDiv: 12.4,
    bazinYieldTarget: 11.5,
    kDiscount: 12.0,
    gGrowth: 3.5,
  },
  KO: {
    ticker: "KO",
    name: "The Coca-Cola Company",
    classLabel: "Ações US",
    classType: "STOCK_US",
    sector: "Consumer Staples • Bebidas & Marcas Globais",
    currency: "USD",
    broker: "Charles Schwab",
    price: 68.5,
    teto: 65.0,
    margin: -5.4,
    action: "QUARENTENA",
    actionType: "danger",
    defaultQty: 175,
    defaultPm: 58.0,
    dyProj: "2,8% a.a. (Líq)",
    payFreq: "Trimestral",
    nextCom: "14/SET/2026",
    nextPay: "01/OUT/2026",
    nextVal: "US$ 0,485 / share",
    snowballReqQty: 141,
    snowballText: "Dividend King com mais de 62 anos consecutivos de aumento anual nos proventos distribuídos.",
    metricsBadge: "MÉTRICAS CORPORATIVAS EUA",
    metricsTitle: "Moat & Alavancagem Global",
    metrics: [
      { label: "P/E (TTM)", val: "24.5x", desc: "Preço sobre Lucro refletindo prêmio de qualidade" },
      { label: "FORWARD P/E", val: "22.1x", desc: "Múltiplo estimado para os próximos 12 meses" },
      { label: "ROIC", val: "14.8%", desc: "Retorno consistente sobre o capital investido" },
      { label: "FCF PAYOUT", val: "68.0%", desc: "Comprometimento saudável do fluxo de caixa livre" },
      { label: "MARGEM OPERACIONAL", val: "29.4%", desc: "Forte poder de precificação e marcas icônicas" },
      { label: "STREAK DIVIDENDOS", val: "62 Anos", desc: "Classificação como Dividend King oficial" },
    ],
    taxPassportHtml:
      "<strong>Retenção US (WHT):</strong> 30% retido diretamente na fonte pelo governo americano (IRS).<br><strong>Brasil (Lei 14.754/2023):</strong> Tributação de 15% na Declaração de Ajuste Anual (DAA) com compensação integral dos 30% pagos nos EUA. Sem imposto complementar a pagar no Brasil.",
    bazinDiv: 1.94,
    bazinYieldTarget: 3.0,
    kDiscount: 8.5,
    gGrowth: 5.5,
  },
  O: {
    ticker: "O",
    name: "Realty Income Corporation",
    classLabel: "REITs (US)",
    classType: "REIT",
    sector: "Real Estate • Varejo & Comercial Triple-Net",
    currency: "USD",
    broker: "Avenue",
    price: 53.4,
    teto: 58.0,
    margin: 8.6,
    action: "APORTE FORTE",
    actionType: "strong",
    defaultQty: 250,
    defaultPm: 49.2,
    dyProj: "4,1% a.a. (Líq)",
    payFreq: "Mensal (The Monthly Dividend Co.)",
    nextCom: "28/SET/2026",
    nextPay: "15/OUT/2026",
    nextVal: "US$ 0,263 / share",
    snowballReqQty: 203,
    snowballText: "Suas shares geram dividendos mensais para reinvestir novas cotas sem novos aportes.",
    metricsBadge: "MÉTRICAS DE REAL ESTATE AMERICANO",
    metricsTitle: "Fluxo de Caixa Operacional (FFO)",
    metrics: [
      { label: "P/FFO", val: "12.8x", desc: "Preço sobre Funds From Operations com desconto" },
      { label: "P/AFFO", val: "13.2x", desc: "Múltiplo sobre FFO ajustado para manutenção" },
      { label: "FFO PAYOUT", val: "74.0%", desc: "Payout seguro dentro do padrão de REITs (obrigatório 90% lucro)" },
      { label: "OCCUPANCY RATE", val: "98.6%", desc: "Taxa histórica de ocupação estável em crises" },
      { label: "WALT", val: "9.8 Anos", desc: "Prazo médio restante dos contratos de locação" },
      { label: "PROPRIEDADES", val: "+15.400", desc: "Portfólio ultra-diversificado nos EUA e Reino Unido" },
    ],
    taxPassportHtml:
      "<strong>Retenção US:</strong> 30% retido na fonte pela custódia americana.<br><strong>Brasil (Lei 14.754/23):</strong> Proventos compensáveis na declaração anual. Ganhos de capital em alienação tributados em 15% na DAA anual com compensação de perdas.",
    bazinDiv: 3.16,
    bazinYieldTarget: 5.5,
    kDiscount: 9.0,
    gGrowth: 3.5,
  },
  IVVB11: {
    ticker: "IVVB11",
    name: "iShares S&P 500 B3 ETF",
    classLabel: "ETFs BR",
    classType: "ETF",
    sector: "Índices • 500 Maiores Empresas dos EUA em Reais",
    currency: "BRL",
    broker: "BTG Pactual",
    price: 342.0,
    teto: 340.0,
    margin: -0.6,
    action: "AGUARDAR",
    actionType: "hold",
    defaultQty: 80,
    defaultPm: 310.0,
    dyProj: "Acumulação Direta",
    payFreq: "Sem distribuição em dinheiro",
    nextCom: "N/A",
    nextPay: "Reinvestimento Automático",
    nextVal: "Reinvestido no ETF",
    snowballReqQty: 1,
    snowballText: "Os dividendos pagos pelas 500 empresas americanas são retidos e reinvestidos automaticamente pelo fundo.",
    metricsBadge: "MÉTRICAS DO FUNDO DE ÍNDICE",
    metricsTitle: "Estrutura & Eficiência de Réplica",
    metrics: [
      { label: "ÍNDICE", val: "S&P 500 TR", desc: "Total Return com dividendos reinvestidos" },
      { label: "TAXA DE ADM.", val: "0.23% a.a.", desc: "Custo operacional de gestão BlackRock Brasil" },
      { label: "TRACKING ERROR", val: "0.04%", desc: "Aderência quase perfeita ao índice de referência" },
      { label: "LIQUIDEZ DIÁRIA", val: "> R$ 150M", desc: "Facilidade de entrada e saída imediata a mercado" },
      { label: "ATIVO BASE", val: "ETF IVV", desc: "Cotas custodiadas diretamente do ETF IVV da NYSE" },
      { label: "POLÍTICA", val: "Acumulação", desc: "Otimização tributária sem antecipação de proventos" },
    ],
    taxPassportHtml:
      "<strong>Sem Dividendos Diretos:</strong> Os proventos não transitam pela sua conta, evitando recolhimento antecipado.<br><strong>Ganho de Capital:</strong> Alíquota fixa de 15% sobre o lucro líquido apurado em qualquer venda (NÃO se aplica a isenção de R$ 20.000 de ações).",
    bazinDiv: 17.5,
    bazinYieldTarget: 5.0,
    kDiscount: 10.0,
    gGrowth: 6.0,
  },
  SCHD: {
    ticker: "SCHD",
    name: "Schwab US Dividend Equity ETF",
    classLabel: "ETFs US",
    classType: "ETF",
    sector: "Dividend Growth • 100 Empresas com Histórico de Dividendos",
    currency: "USD",
    broker: "Avenue",
    price: 78.1,
    teto: 84.0,
    margin: 7.6,
    action: "APORTE FORTE",
    actionType: "strong",
    defaultQty: 155,
    defaultPm: 71.0,
    dyProj: "3,4% a.a. (Líq)",
    payFreq: "Trimestral",
    nextCom: "15/SET/2026",
    nextPay: "25/SET/2026",
    nextVal: "US$ 0,82 / share (Bruto)",
    snowballReqQty: 95,
    snowballText: "Cesta balanceada por ROE, fluxo de caixa e histórico de pagamento de dividendos de 10 anos.",
    metricsBadge: "MÉTRICAS DO ETF DE DIVIDENDOS EUA",
    metricsTitle: "Filtros de Qualidade & Custo",
    metrics: [
      { label: "EXPENSE RATIO", val: "0.06% a.a.", desc: "Taxa ultra-baixa da Charles Schwab Asset Mgmt" },
      { label: "AUM (PATRIMÔNIO)", val: "US$ 56.4B", desc: "Um dos maiores ETFs de dividendos do mundo" },
      { label: "P/E DA CESTA", val: "15.2x", desc: "Múltiplo muito mais atrativo que o S&P 500 tradicional (22x)" },
      { label: "ROE MÉDIO", val: "27.8%", desc: "Empresas com altíssima eficiência sobre patrimônio" },
      { label: "ATIVOS", val: "100 Ações", desc: "Diversificação setorial com teto de 4% por empresa" },
      { label: "REBALANCEAMENTO", val: "Anual (Março)", desc: "Exclusão automática de empresas que cortam proventos" },
    ],
    taxPassportHtml:
      "<strong>Dividendos:</strong> Retenção de 30% WHT na fonte americana.<br><strong>Brasil:</strong> Tributação unificada de 15% na declaração de ajuste anual com compensação dos 30% retidos nos EUA. Ganhos de capital tributados anualmente em 15% na DAA.",
    bazinDiv: 3.28,
    bazinYieldTarget: 4.0,
    kDiscount: 8.5,
    gGrowth: 4.5,
  },
};

export const REPRESENTATIVE_KEYS = [
  "BBAS3",
  "HGLG11",
  "RURA11",
  "JURO11",
  "KO",
  "O",
  "IVVB11",
  "SCHD",
];

export function getDynamicClassMetrics(
  type: AssetType,
  metrics?: any,
): { badge: string; title: string; items: ClassMetricItem[] } {
  switch (type) {
    case "FII":
      return {
        badge: "MÉTRICAS IMOBILIÁRIAS (TIJOLO / PAPEL)",
        title: "Eficiência do Portfólio Imobiliário",
        items: [
          {
            label: "P/VP",
            val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00",
            desc: "Relação sobre valor patrimonial dos imóveis",
          },
          {
            label: "VP POR COTA",
            val: metrics?.bvps ? `R$ ${metrics.bvps.toFixed(2)}` : "Patrimonial",
            desc: "Valor contábil avaliado em laudos periciais",
          },
          {
            label: "VACÂNCIA FÍSICA",
            val: metrics?.vacancy != null ? `${(metrics.vacancy * 100).toFixed(1)}%` : "Baixa (<6%)",
            desc: "Percentual de ABL não locada nos imóveis",
          },
          {
            label: "CAP RATE MÉDIO",
            val: metrics?.capRate != null ? `${(metrics.capRate * 100).toFixed(1)}%` : "8.5% a.a.",
            desc: "Retorno da renda operacional sobre valor patrimonial",
          },
          {
            label: "PAYOUT FII",
            val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "95%",
            desc: "Distribuição legal semestral do lucro caixa",
          },
          {
            label: "DIVIDEND YIELD",
            val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "Consistente",
            desc: "Rendimento distribuído nos últimos 12 meses",
          },
        ],
      };

    case "FIAGRO":
      return {
        badge: "MÉTRICAS DE CRÉDITO DO AGRO",
        title: "Qualidade da Carteira de CRAs",
        items: [
          { label: "P/VP", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "0.98", desc: "Preço sobre carteira de crédito" },
          { label: "TAXA MÉDIA", val: "CDI + 3.8%", desc: "Spread médio sobre o CDI líquido" },
          { label: "GARANTIAS REAIS", val: "145% LTV", desc: "Alienação fiduciária em terras produtivas" },
          { label: "INADIMPLÊNCIA", val: "0.0%", desc: "Contratos adimplentes e monitorados" },
          { label: "DURATION", val: "2.5 anos", desc: "Prazo de amortização do crédito agro" },
          { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "13.2% a.a.", desc: "Proventos mensais isentos de IR" },
        ],
      };

    case "FII_INFRA":
      return {
        badge: "MÉTRICAS DE CRÉDITO INCENTIVADO",
        title: "Estrutura de Debêntures de Infraestrutura",
        items: [
          { label: "P/VP", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00", desc: "Marcação a mercado das debêntures" },
          { label: "TAXA CARTEIRA", val: "IPCA + 7.4%", desc: "Cupom real médio acima da inflação" },
          { label: "RATING MÉDIO", val: "AA+ / AAA", desc: "Grau de investimento em agências globais" },
          { label: "DURATION", val: "4.8 anos", desc: "Maturação média dos projetos financiados" },
          { label: "ISENÇÃO FISCAL", val: "Super Isenção", desc: "0% IR em rendimentos e ganho de capital" },
          { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "12.8% a.a.", desc: "Renda mensal livre de tributação" },
        ],
      };

    case "REIT":
      return {
        badge: "MÉTRICAS DE REAL ESTATE AMERICANO",
        title: "Fluxo Operacional de REITs (FFO)",
        items: [
          { label: "P/FFO", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "13.5x", desc: "Preço sobre Funds From Operations" },
          { label: "FFO PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "75%", desc: "Comprometimento do fluxo caixa com proventos" },
          { label: "OCCUPANCY", val: metrics?.vacancy != null ? `${((1 - metrics.vacancy) * 100).toFixed(1)}%` : "98.2%", desc: "Taxa de ocupação estável dos imóveis" },
          { label: "CAP RATE", val: metrics?.capRate != null ? `${(metrics.capRate * 100).toFixed(1)}%` : "7.5%", desc: "Taxa operacional de retorno imobiliário" },
          { label: "WALT", val: "9.5 Anos", desc: "Prazo médio ponderado dos contratos" },
          { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "4.2%", desc: "Rendimento distribuído em dólar" },
        ],
      };

    case "ETF":
      return {
        badge: "MÉTRICAS DO FUNDO DE ÍNDICE",
        title: "Eficiência de Réplica & Custos",
        items: [
          { label: "TAXA DE ADM.", val: metrics?.expenseRatio != null ? `${(metrics.expenseRatio * 100).toFixed(2)}% a.a.` : "0.20% a.a.", desc: "Taxa de gestão e custódia do fundo" },
          { label: "TRACKING ERROR", val: metrics?.trackingError != null ? `${(metrics.trackingError * 100).toFixed(2)}%` : "0.05%", desc: "Aderência em relação ao benchmark" },
          { label: "P/L DA CESTA", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "18.5x", desc: "Múltiplo ponderado das empresas do índice" },
          { label: "AUM (PATRIMÔNIO)", val: metrics?.aum ? `R$ ${(metrics.aum / 1e9).toFixed(1)}B` : "> R$ 5B", desc: "Volume total sob gestão do fundo" },
          { label: "ROE MÉDIO", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "20%", desc: "Rentabilidade sobre patrimônio da carteira" },
          { label: "POLÍTICA", val: "Eficiência Fiscal", desc: "Distribuição periódica ou reinvestimento" },
        ],
      };

    default: // STOCK_BR and STOCK_US
      return {
        badge: "FUNDAMENTOS CORPORATIVOS & DIVIDENDOS",
        title: "Rentabilidade, Múltiplos & Moat",
        items: [
          { label: "P/L", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "-", desc: "Preço sobre Lucro por ação (LPA)" },
          { label: "P/VP", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "-", desc: "Preço sobre Valor Patrimonial (VPA)" },
          { label: "ROE", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "-", desc: "Retorno sobre o patrimônio líquido" },
          { label: "PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "-", desc: "Percentual do lucro distribuído como provento" },
          { label: "LPA (EPS)", val: metrics?.eps != null ? `R$ ${metrics.eps.toFixed(2)}` : "-", desc: "Lucro líquido contábil por ação" },
          { label: "CAGR DIVIDENDOS", val: metrics?.dividendCagr5y != null ? `${(metrics.dividendCagr5y * 100).toFixed(1)}%` : "Consistente", desc: "Crescimento anual composto dos proventos" },
        ],
      };
  }
}

export function getDynamicTaxPassport(type: AssetType, currency: Currency): string {
  if (type === "FII_INFRA") {
    return "<strong>Super Isenção (Lei 12.431/2011):</strong> Os FI-Infras possuem o benefício fiscal mais forte do mercado brasileiro. Os rendimentos mensais são 100% isentos de IR E o ganho de capital na alienação de cotas na bolsa também é 100% isento de IR para pessoas físicas (sem teto de R$ 20k).";
  }
  if (type === "FII" || type === "FIAGRO") {
    return "<strong>Rendimentos Mensais:</strong> 100% isentos de imposto de renda para pessoa física, conforme Lei 11.033/04 e Lei 14.130/21 (fundo com mais de 100 cotistas negociado em bolsa).<br><strong>Ganho de Capital:</strong> Alíquota fixa de 20% sobre o lucro líquido na venda das cotas (NÃO há isenção de R$ 20.000).";
  }
  if (currency === "USD" || type === "STOCK_US" || type === "REIT") {
    return "<strong>Retenção US (WHT):</strong> 30% retido na fonte pela custódia americana sobre dividendos distribuídos.<br><strong>Brasil (Lei 14.754/2023):</strong> Proventos são compensáveis na declaração anual de IR (DAA). Ganho de capital na venda apurado em 15% na DAA com compensação integral de eventuais prejuízos passados.";
  }
  if (type === "ETF") {
    return "<strong>Rendimentos:</strong> Conforme política do ETF (reinvestimento automático no patrimônio ou distribuição tributável).<br><strong>Ganho de Capital:</strong> Alíquota fixa de 15% sobre o lucro líquido em qualquer venda na bolsa brasileira (sem faixa de isenção de R$ 20.000).";
  }
  // STOCK_BR default
  return "<strong>Rendimentos:</strong> Dividendos são 100% isentos de imposto de renda para pessoa física. Juros sobre Capital Próprio (JCP) sofrem retenção exclusiva de 15% na fonte pela corretora.<br><strong>Ganho de Capital:</strong> Vendas no mercado à vista até R$ 20.000,00 no mês são isentas de IR. Acima desse limite, alíquota de 15% sobre o lucro líquido (20% em operações de day trade).";
}
