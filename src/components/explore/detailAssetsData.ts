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
  payFreq?: string;
  snowballReqQty?: number;
  snowballText?: string;
  bazinDiv?: number;
  bazinYieldTarget?: number;
  kDiscount?: number;
  gGrowth?: number;
}

export const REPRESENTATIVE_ASSETS: Record<string, RepresentativeAssetData> = {
  BBAS3: {
    ticker: "BBAS3",
    name: "Banco do Brasil S.A.",
    classLabel: "Ações Brasil",
    classType: "STOCK_BR",
    sector: "Financeiro • Intermediação Bancária",
    currency: "BRL",
    payFreq: "8x ao ano",
    snowballReqQty: 42,
    snowballText: "A cada corte, 42 ações geram proventos suficientes para adquirir 1 nova ação automaticamente.",
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
    payFreq: "Mensal",
    snowballReqQty: 147,
    snowballText: "Suas cotas geram proventos suficientes para comprar novas cotas mensalmente sem tirar do bolso.",
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
    payFreq: "Mensal",
    snowballReqQty: 98,
    snowballText: "A cada 98 cotas, os rendimentos mensais compram 1 nova cota de Fiagro automaticamente.",
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
    payFreq: "Mensal",
    snowballReqQty: 96,
    snowballText: "A cada 96 cotas, os cupons mensais adquirem 1 cota de infraestrutura sem aporte externo.",
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
    payFreq: "Trimestral",
    snowballReqQty: 141,
    snowballText: "Dividend King com mais de 62 anos consecutivos de aumento anual nos proventos distribuídos.",
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
    payFreq: "Mensal (The Monthly Dividend Co.)",
    snowballReqQty: 203,
    snowballText: "Suas shares geram dividendos mensais para reinvestir novas cotas sem novos aportes.",
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
    payFreq: "Sem distribuição em dinheiro",
    snowballReqQty: 1,
    snowballText: "Os dividendos pagos pelas 500 empresas americanas são retidos e reinvestidos automaticamente pelo fundo.",
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
    payFreq: "Trimestral",
    snowballReqQty: 95,
    snowballText: "Cesta balanceada por ROE, fluxo de caixa e histórico de pagamento de dividendos de 10 anos.",
    bazinDiv: 3.28,
    bazinYieldTarget: 4.0,
    kDiscount: 8.5,
    gGrowth: 4.5,
  },
  JNJ: {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    classLabel: "Ações US",
    classType: "STOCK_US",
    sector: "Healthcare • Farmacêutica & MedTech",
    currency: "USD",
    payFreq: "Trimestral",
    snowballReqQty: 130,
    snowballText: "Dividend King com 62 anos consecutivos de aumento ininterrupto em proventos.",
    bazinDiv: 4.96,
    bazinYieldTarget: 3.2,
    kDiscount: 8.0,
    gGrowth: 5.0,
  },
  VOO: {
    ticker: "VOO",
    name: "Vanguard S&P 500 ETF",
    classLabel: "ETFs (US)",
    classType: "ETF",
    sector: "Index ETF • 500 Maiores Empresas dos EUA",
    currency: "USD",
    payFreq: "Trimestral",
    snowballReqQty: 288,
    snowballText: "A base de acumulação global com menor custo de administração do planeta.",
    bazinDiv: 7.12,
    bazinYieldTarget: 1.5,
    kDiscount: 9.0,
    gGrowth: 7.5,
  },
};

export const REPRESENTATIVE_KEYS_US = [
  "KO",
  "JNJ",
  "O",
  "SCHD",
  "VOO",
];

export const REPRESENTATIVE_KEYS_BR = [
  "BBAS3",
  "HGLG11",
  "RURA11",
  "JURO11",
  "KO",
  "O",
  "IVVB11",
  "SCHD",
];

export const REPRESENTATIVE_KEYS = REPRESENTATIVE_KEYS_BR;

export function getDynamicClassMetrics(
  type: AssetType,
  metrics?: any,
  currency: Currency = "BRL",
  locale: string = "ptBR",
  _t?: any,
): { badge: string; title: string; items: ClassMetricItem[] } {
  const isEn = locale === "en";
  const isEs = locale === "es";

  switch (type) {
    case "FII":
      if (isEn) {
        return {
          badge: "BRAZIL REAL ESTATE METRICS (FII)",
          title: "Real Estate Portfolio Efficiency",
          items: [
            {
              label: "P/NAV",
              val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00",
              desc: "Price to Net Asset Value of underlying properties",
            },
            {
              label: "NAV PER SHARE",
              val: metrics?.bvps ? `R$ ${metrics.bvps.toFixed(2)}` : "Book Value",
              desc: "Accounting NAV evaluated by certified appraisal reports",
            },
            {
              label: "PHYSICAL VACANCY",
              val: metrics?.vacancy != null ? `${(metrics.vacancy * 100).toFixed(1)}%` : "Low (<6%)",
              desc: "Percentage of unleased gross leasable area",
            },
            {
              label: "AVG CAP RATE",
              val: metrics?.capRate != null ? `${(metrics.capRate * 100).toFixed(1)}%` : "8.5% p.a.",
              desc: "Operating net rental yield over portfolio value",
            },
            {
              label: "P/FFO",
              val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "10.5x",
              desc: "Price to operating cash generation (FFO)",
            },
            {
              label: "DIVIDEND YIELD",
              val:
                metrics?.currentDy != null
                  ? `${(metrics.currentDy * 100).toFixed(1)}%`
                  : "9.2% p.a.",
              desc: "Tax-free trailing 12-month dividend yield",
            },
          ],
        };
      }
      if (isEs) {
        return {
          badge: "MÉTRICAS INMOBILIARIAS (LADRILLO / PAPEL)",
          title: "Eficiencia de la Cartera Inmobiliaria",
          items: [
            {
              label: "P/VC",
              val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00",
              desc: "Relación sobre valor patrimonial de los inmuebles",
            },
            {
              label: "VC POR CUOTA",
              val: metrics?.bvps ? `R$ ${metrics.bvps.toFixed(2)}` : "Patrimonial",
              desc: "Valor contable evaluado en tasaciones periciales",
            },
            {
              label: "VACANCIA FÍSICA",
              val: metrics?.vacancy != null ? `${(metrics.vacancy * 100).toFixed(1)}%` : "Baja (<6%)",
              desc: "Porcentaje de área bruta alquilable no arrendada",
            },
            {
              label: "CAP RATE MEDIO",
              val: metrics?.capRate != null ? `${(metrics.capRate * 100).toFixed(1)}%` : "8.5% a.a.",
              desc: "Rendimiento operativo sobre valor patrimonial",
            },
            {
              label: "P/FFO",
              val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "10.5x",
              desc: "Precio sobre generación de caja operativa",
            },
            {
              label: "DIVIDEND YIELD",
              val:
                metrics?.currentDy != null
                  ? `${(metrics.currentDy * 100).toFixed(1)}%`
                  : "9.2% a.a.",
              desc: "Rendimiento de dividendos en los últimos 12 meses",
            },
          ],
        };
      }
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
            label: "P/FFO",
            val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "10.5x",
            desc: "Preço sobre geração de caixa operacional",
          },
          {
            label: "DIVIDEND YIELD",
            val:
              metrics?.currentDy != null
                ? `${(metrics.currentDy * 100).toFixed(1)}%`
                : "9.2% a.a.",
            desc: "Rendimento de proventos nos últimos 12 meses",
          },
        ],
      };

    case "FIAGRO":
      if (isEn) {
        return {
          badge: "AGRIBUSINESS CREDIT METRICS",
          title: "Rural Receivables Structure (CRA)",
          items: [
            { label: "P/NAV", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "0.98", desc: "Discount to rural credit portfolio value" },
            { label: "NAV PER SHARE", val: metrics?.bvps ? `R$ ${metrics.bvps.toFixed(2)}` : "Book Value", desc: "Marked-to-market portfolio value per unit" },
            { label: "AVG SPREAD", val: "CDI + 3.8%", desc: "Average spread over Brazilian CDI base rate" },
            { label: "COLLATERAL LTV", val: "145% LTV", desc: "Fiduciary lien over agricultural lands and harvests" },
            { label: "DEFAULT RATE", val: "0.0%", desc: "Payment track record with zero critical default" },
            { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "13.2% p.a.", desc: "Monthly tax-exempt distributed cash yield" },
          ],
        };
      }
      if (isEs) {
        return {
          badge: "MÉTRICAS DE CRÉDITO DEL AGRO",
          title: "Estructura de Créditos Rurales (CRA)",
          items: [
            { label: "P/VC", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "0.98", desc: "Descuento sobre la cartera de crédito rural" },
            { label: "VC POR CUOTA", val: metrics?.bvps ? `R$ ${metrics.bvps.toFixed(2)}` : "Patrimonial", desc: "Valor de la cartera valorado a mercado" },
            { label: "TASA MEDIA", val: "CDI + 3.8%", desc: "Diferencial medio sobre la tasa básica de interés" },
            { label: "GARANTÍAS REALES", val: "145% LTV", desc: "Garantía fiduciaria de tierras y cosechas" },
            { label: "MOROSIDAD", val: "0.0%", desc: "Historial de pagos sin atrasos críticos" },
            { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "13.2% a.a.", desc: "Rendimiento mensual exento de IRPF" },
          ],
        };
      }
      return {
        badge: "MÉTRICAS DE CRÉDITO DO AGRO",
        title: "Estrutura dos Recebíveis Rurais (CRA)",
        items: [
          { label: "P/VP", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "0.98", desc: "Desconto sobre a carteira de crédito rural" },
          { label: "VP POR COTA", val: metrics?.bvps ? `R$ ${metrics.bvps.toFixed(2)}` : "Patrimonial", desc: "Valor da carteira marcado a mercado" },
          { label: "TAXA MÉDIA", val: "CDI + 3.8%", desc: "Spread médio sobre taxa básica de juros" },
          { label: "GARANTIAS REAIS", val: "145% LTV", desc: "Garantia fiduciária de terras e safras" },
          { label: "INADIMPLÊNCIA", val: "0.0%", desc: "Histórico de pagamentos sem atrasos críticos" },
          { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "13.2% a.a.", desc: "Rendimento mensal isento de IR" },
        ],
      };

    case "FII_INFRA":
      if (isEn) {
        return {
          badge: "INCENTIVIZED INFRA CREDIT METRICS",
          title: "Quality of Incentivized Debentures",
          items: [
            { label: "P/NAV", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00", desc: "Trading close to net asset value" },
            { label: "PORTFOLIO RATE", val: "IPCA + 7.4%", desc: "Real inflation-adjusted coupon spread above IPCA" },
            { label: "AVG RATING", val: "AA+ / AAA", desc: "Investment grade rating by global agencies" },
            { label: "DURATION", val: "4.8 years", desc: "Weighted average maturity of financed projects" },
            { label: "TAX STATUS", val: "Super Tax-Exempt", desc: "0% income tax on monthly yield and capital gains" },
            { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "12.8% p.a.", desc: "Monthly income free of personal taxation" },
          ],
        };
      }
      if (isEs) {
        return {
          badge: "MÉTRICAS DE CRÉDITO PRIVADO INCENTIVADO",
          title: "Calidad de Obligaciones Incentivadas",
          items: [
            { label: "P/VC", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00", desc: "Negociando cerca del valor patrimonial" },
            { label: "TASA CARTERA", val: "IPCA + 7.4%", desc: "Cupón real medio por encima de la inflación" },
            { label: "RATING MEDIO", val: "AA+ / AAA", desc: "Grado de inversión otorgado por agencias de calificación" },
            { label: "DURACIÓN", val: "4.8 años", desc: "Maduración media de los proyectos financiados" },
            { label: "EXENCIÓN FISCAL", val: "Súper Exención", desc: "0% IRPF en rendimientos y ganancias de capital" },
            { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "12.8% a.a.", desc: "Renta mensual libre de tributación" },
          ],
        };
      }
      return {
        badge: "MÉTRICAS DE CRÉDITO PRIVADO INCENTIVADO",
        title: "Qualidade das Debêntures Incentivadas",
        items: [
          { label: "P/VP", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "1.00", desc: "Negociando próximo ao valor patrimonial" },
          { label: "TAXA CARTEIRA", val: "IPCA + 7.4%", desc: "Cupom real médio acima da inflação" },
          { label: "RATING MÉDIO", val: "AA+ / AAA", desc: "Grau de investimento em agências globais" },
          { label: "DURATION", val: "4.8 anos", desc: "Maturação média dos projetos financiados" },
          { label: "ISENÇÃO FISCAL", val: "Super Isenção", desc: "0% IR em rendimentos e ganho de capital" },
          { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "12.8% a.a.", desc: "Renda mensal livre de tributação" },
        ],
      };

    case "REIT":
      if (isEn) {
        return {
          badge: "US REAL ESTATE METRICS",
          title: "REIT Operational Cash Flow (FFO)",
          items: [
            { label: "P/FFO", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "13.5x", desc: "Price to Funds From Operations" },
            { label: "FFO PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "75%", desc: "Operational cash-flow commitment to dividends" },
            { label: "OCCUPANCY", val: metrics?.vacancy != null ? `${((1 - metrics.vacancy) * 100).toFixed(1)}%` : "98.2%", desc: "Stable property occupancy rate" },
            { label: "CAP RATE", val: metrics?.capRate != null ? `${(metrics.capRate * 100).toFixed(1)}%` : "7.5%", desc: "Operational real estate return rate" },
            { label: "WALT", val: "9.5 Years", desc: "Weighted average lease term of tenant contracts" },
            { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "4.2%", desc: "Dividend yield distributed in USD" },
          ],
        };
      }
      if (isEs) {
        return {
          badge: "MÉTRICAS DE REAL ESTATE EE. UU.",
          title: "Flujo Operativo de REITs (FFO)",
          items: [
            { label: "P/FFO", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "13.5x", desc: "Precio sobre Funds From Operations" },
            { label: "FFO PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "75%", desc: "Compromiso del flujo de caja con dividendos" },
            { label: "OCUPACIÓN", val: metrics?.vacancy != null ? `${((1 - metrics.vacancy) * 100).toFixed(1)}%` : "98.2%", desc: "Tasa de ocupación estable de los inmuebles" },
            { label: "CAP RATE", val: metrics?.capRate != null ? `${(metrics.capRate * 100).toFixed(1)}%` : "7.5%", desc: "Tasa operativa de rendimiento inmobiliario" },
            { label: "WALT", val: "9.5 Años", desc: "Plazo medio ponderado de los contratos de alquiler" },
            { label: "DIVIDEND YIELD", val: metrics?.currentDy != null ? `${(metrics.currentDy * 100).toFixed(1)}%` : "4.2%", desc: "Rendimiento distribuido en dólares" },
          ],
        };
      }
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

    case "ETF": {
      const aumPrefix = currency === "USD" ? "US$ " : "R$ ";
      if (isEn) {
        return {
          badge: "INDEX FUND METRICS",
          title: "Tracking Efficiency & Costs",
          items: [
            { label: "EXPENSE RATIO", val: metrics?.expenseRatio != null ? `${(metrics.expenseRatio * 100).toFixed(2)}% p.a.` : "0.20% p.a.", desc: "Fund management and custody expense ratio" },
            { label: "TRACKING ERROR", val: metrics?.trackingError != null ? `${(metrics.trackingError * 100).toFixed(2)}%` : "0.05%", desc: "Historical tracking difference against benchmark" },
            { label: "BASKET P/E", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "18.5x", desc: "Weighted price-to-earnings multiple of index holdings" },
            { label: "AUM (ASSETS)", val: metrics?.aum ? `${aumPrefix}${(metrics.aum / 1e9).toFixed(1)}B` : `> ${aumPrefix}5B`, desc: "Total assets under fund management" },
            { label: "AVG ROE", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "20%", desc: "Weighted return on equity of portfolio companies" },
            { label: "POLICY", val: "Tax Efficiency", desc: "Periodic cash distributions or automatic reinvestment" },
          ],
        };
      }
      if (isEs) {
        return {
          badge: "MÉTRICAS DEL FONDO DE ÍNDICE",
          title: "Eficiencia de Réplica & Costes",
          items: [
            { label: "COMISIÓN GESTIÓN", val: metrics?.expenseRatio != null ? `${(metrics.expenseRatio * 100).toFixed(2)}% a.a.` : "0.20% a.a.", desc: "Comisión de gestión y custodia del fondo" },
            { label: "TRACKING ERROR", val: metrics?.trackingError != null ? `${(metrics.trackingError * 100).toFixed(2)}%` : "0.05%", desc: "Desviación histórica respecto al índice de referencia" },
            { label: "P/U DE LA CESTA", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "18.5x", desc: "Múltiplo ponderado de las empresas del índice" },
            { label: "AUM (PATRIMONIO)", val: metrics?.aum ? `${aumPrefix}${(metrics.aum / 1e9).toFixed(1)}B` : `> ${aumPrefix}5B`, desc: "Volumen total bajo gestión del fondo" },
            { label: "ROE MEDIO", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "20%", desc: "Rentabilidad sobre patrimonio de la cartera" },
            { label: "POLÍTICA", val: "Eficiencia Fiscal", desc: "Distribución periódica o reinversión automática" },
          ],
        };
      }
      return {
        badge: "MÉTRICAS DO FUNDO DE ÍNDICE",
        title: "Eficiência de Réplica & Custos",
        items: [
          { label: "TAXA DE ADM.", val: metrics?.expenseRatio != null ? `${(metrics.expenseRatio * 100).toFixed(2)}% a.a.` : "0.20% a.a.", desc: "Taxa de gestão e custódia do fundo" },
          { label: "TRACKING ERROR", val: metrics?.trackingError != null ? `${(metrics.trackingError * 100).toFixed(2)}%` : "0.05%", desc: "Aderência em relação ao benchmark" },
          { label: "P/L DA CESTA", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "18.5x", desc: "Múltiplo ponderado das empresas do índice" },
          { label: "AUM (PATRIMÔNIO)", val: metrics?.aum ? `${aumPrefix}${(metrics.aum / 1e9).toFixed(1)}B` : `> ${aumPrefix}5B`, desc: "Volume total sob gestão do fundo" },
          { label: "ROE MÉDIO", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "20%", desc: "Rentabilidade sobre patrimônio da carteira" },
          { label: "POLÍTICA", val: "Eficiência Fiscal", desc: "Distribuição periódica ou reinvestimento" },
        ],
      };
    }

    default: { // STOCK_BR and STOCK_US
      const epsPrefix = currency === "USD" ? "US$ " : "R$ ";
      if (isEn) {
        return {
          badge: currency === "USD" ? "US CORPORATE METRICS" : "CORPORATE FUNDAMENTALS & DIVIDENDS",
          title: currency === "USD" ? "Profitability, Multiples & Global Moat" : "Profitability, Multiples & Moat",
          items: [
            { label: "P/E", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "-", desc: "Price to Earnings per share (EPS)" },
            { label: "P/B", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "-", desc: "Price to Book value per share (BVPS)" },
            { label: "ROE", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "-", desc: "Return on Equity (net income over equity)" },
            { label: "PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "-", desc: "Percentage of net income distributed as dividends" },
            { label: "EPS", val: metrics?.eps != null ? `${epsPrefix}${metrics.eps.toFixed(2)}` : "-", desc: "Net accounting profit per share" },
            { label: "DIVIDEND CAGR", val: metrics?.dividendCagr5y != null ? `${(metrics.dividendCagr5y * 100).toFixed(1)}%` : "Consistent", desc: "Compound annual dividend growth rate" },
          ],
        };
      }
      if (isEs) {
        return {
          badge: currency === "USD" ? "MÉTRICAS CORPORATIVAS EE. UU." : "FUNDAMENTOS CORPORATIVOS & DIVIDENDOS",
          title: currency === "USD" ? "Rentabilidad, Múltiplos & Moat Global" : "Rentabilidad, Múltiplos & Moat",
          items: [
            { label: "P/U", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "-", desc: "Precio sobre Beneficio por acción (BPA)" },
            { label: "P/VC", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "-", desc: "Precio sobre Valor Contable (VPC)" },
            { label: "ROE", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "-", desc: "Retorno sobre el patrimonio neto" },
            { label: "PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "-", desc: "Porcentaje del beneficio distribuido como dividendo" },
            { label: "BPA (EPS)", val: metrics?.eps != null ? `${epsPrefix}${metrics.eps.toFixed(2)}` : "-", desc: "Beneficio neto contable por acción" },
            { label: "TCAC DIVIDENDOS", val: metrics?.dividendCagr5y != null ? `${(metrics.dividendCagr5y * 100).toFixed(1)}%` : "Consistente", desc: "Tasa de crecimiento anual compuesta de dividendos" },
          ],
        };
      }
      return {
        badge: currency === "USD" ? "MÉTRICAS CORPORATIVAS EUA" : "FUNDAMENTOS CORPORATIVOS & DIVIDENDOS",
        title: currency === "USD" ? "Rentabilidade, Múltiplos & Moat Global" : "Rentabilidade, Múltiplos & Moat",
        items: [
          { label: "P/L", val: metrics?.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "-", desc: "Preço sobre Lucro por ação (LPA)" },
          { label: "P/VP", val: metrics?.pbRatio ? `${metrics.pbRatio.toFixed(2)}` : "-", desc: "Preço sobre Valor Patrimonial (VPA)" },
          { label: "ROE", val: metrics?.roe != null ? `${(metrics.roe * 100).toFixed(1)}%` : "-", desc: "Retorno sobre o patrimônio líquido" },
          { label: "PAYOUT", val: metrics?.payoutRatio != null ? `${(metrics.payoutRatio * 100).toFixed(0)}%` : "-", desc: "Percentual do lucro distribuído como provento" },
          { label: "LPA (EPS)", val: metrics?.eps != null ? `${epsPrefix}${metrics.eps.toFixed(2)}` : "-", desc: "Lucro líquido contábil por ação" },
          { label: "CAGR DIVIDENDOS", val: metrics?.dividendCagr5y != null ? `${(metrics.dividendCagr5y * 100).toFixed(1)}%` : "Consistente", desc: "Crescimento anual composto dos proventos" },
        ],
      };
    }
  }
}

export function getDynamicTaxPassport(
  type: AssetType,
  currency: Currency,
  jurisdiction: "BR" | "US" = "BR",
  t?: any,
): string {
  const p = t?.deepDive?.taxPassports;

  if (jurisdiction === "US") {
    if (currency === "BRL" || type === "STOCK_BR" || type === "FII" || type === "FIAGRO" || type === "FII_INFRA") {
      return (
        p?.usForeignBr ??
        "<strong>Foreign Asset (B3 - Brazil):</strong> Dividends and distributions are treated as foreign ordinary income on IRS Form 1040. If Brazilian withholding applies (e.g. JCP 17.5%), you may claim a Foreign Tax Credit (IRS Form 1116) to prevent double taxation.<br><strong>Capital Gains:</strong> Taxed under standard US capital gains rules in USD equivalent at transaction date."
      );
    }
    if (type === "REIT") {
      return (
        p?.usReit ??
        "<strong>Income (IRS Section 199A):</strong> Most REIT distributions are ordinary income, but eligible for the 20% Qualified Business Income (QBI) deduction under Section 199A (reducing effective top federal bracket from 37% to 29.6%). Return of Capital is non-taxable and reduces cost basis.<br><strong>Capital Gains:</strong> Long-term capital gains (>1 year) qualify for preferential 0/15/20% rates."
      );
    }
    if (type === "ETF") {
      return (
        p?.usEtf ??
        "<strong>Income (Form 1099-DIV):</strong> Dividends passed through as either Qualified or Non-Qualified depending on underlying securities. Distributed capital gains reported on Box 2a.<br><strong>Capital Gains:</strong> Sales taxed as capital gains/losses (preferential 0/15/20% for long-term >1 year; ordinary brackets for short-term)."
      );
    }
    return (
      p?.usStock ??
      "<strong>Income (IRS Form 1040):</strong> Dividends are typically taxed as Qualified Dividends (preferential rate of 0%, 15%, or 20% depending on taxable income) if holding period rules are met (>60 days during the 121-day window).<br><strong>Capital Gains:</strong> Long-term capital gains (>1 year) taxed at preferential 0/15/20% rates. Short-term gains taxed at ordinary income tax brackets."
    );
  }

  // Jurisdiction === "BR"
  if (type === "FII_INFRA") {
    return (
      p?.brFiiInfra ??
      "<strong>Super Isenção (Lei 12.431/2011):</strong> Os FI-Infras possuem o benefício fiscal mais forte do mercado brasileiro. Os rendimentos mensais são 100% isentos de IR E o ganho de capital na alienação de cotas na bolsa também é 100% isento de IR para pessoas físicas (sem teto de R$ 20k)."
    );
  }
  if (type === "FII" || type === "FIAGRO") {
    return (
      p?.brFii ??
      "<strong>Rendimentos Mensais:</strong> 100% isentos de imposto de renda para pessoa física, conforme Lei 11.033/04 e Lei 14.130/21 (fundo com mais de 100 cotistas negociado em bolsa, conforme Lei 14.754/2023).<br><strong>Ganho de Capital:</strong> Alíquota fixa de 20% sobre o lucro líquido na venda das cotas (NÃO há isenção de R$ 20.000)."
    );
  }
  if (currency === "USD" || type === "STOCK_US" || type === "REIT") {
    return (
      p?.brForeignUs ??
      "<strong>Retenção US (WHT):</strong> 30% retido na fonte pela custódia americana sobre dividendos distribuídos.<br><strong>Brasil (Lei 14.754/2023):</strong> Proventos e ganhos de capital no exterior são declarados na DAA à alíquota uniforme de 15%, com compensação integral do imposto retido nos EUA."
    );
  }
  if (type === "ETF") {
    return (
      p?.brEtf ??
      "<strong>Rendimentos:</strong> Conforme política do ETF (reinvestimento automático no patrimônio ou distribuição tributável).<br><strong>Ganho de Capital:</strong> Alíquota fixa de 15% sobre o lucro líquido em qualquer venda na bolsa brasileira (sem faixa de isenção de R$ 20.000)."
    );
  }
  // STOCK_BR default
  return (
    p?.brStock ??
    "<strong>Rendimentos:</strong> Dividendos de ações são isentos de IRPF para a pessoa física (com retenção de 10% exclusivamente sobre parcelas acima de R$ 50 mil/mês da mesma empresa, conforme Lei 15.270/2025). Juros sobre Capital Próprio (JCP) sofrem retenção exclusiva e definitiva de 17,5% na fonte (Lei 15.270/2025 / LC 224/2025).<br><strong>Ganho de Capital:</strong> Vendas no mercado à vista até R$ 20.000,00 no mês são isentas de IR. Acima desse limite, alíquota de 15% sobre o lucro líquido (20% em operações de day trade)."
  );
}
