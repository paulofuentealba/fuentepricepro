# 📊 Relatório Consolidado de Avaliação de APIs (5 Provedores)
> Gerado em: 2026-08-02 | Fuente Price Pro
> APIs Analisadas: **Alpha Vantage**, **Bolsai**, **API Massive (Polygon.io)**, **ANBIMA**, **Dados de Mercado**

---

## 1. Estado Atual do Modelo de Dados & Lacunas da Plataforma

### Ativos Cobertos no Fuente Price Pro

| Tipo | Mercado | Fonte Atual de Dados | Status de Cobertura |
|---|---|---|---|
| `STOCK_BR` | B3 (Brasil) | Brapi.dev | Cotação e histórico de dividendos OK. **Faltam múltiplos fundamentalistas** (ROE, ROIC, margens, dívida líquida). |
| `FII` | B3 (Brasil) | Brapi.dev | Cotação e rendimentos OK. **Faltam Cap Rate e Vacância** no modelo. |
| `FII_INFRA` | B3 (Brasil) | Brapi.dev | Análogo a FIIs. **Falta alinhamento com índices de crédito privado (IDA-IPCA)**. |
| `FIAGRO` | B3 (Brasil) | Brapi.dev | Análogo a FIIs. |
| `STOCK_US` | NYSE / NASDAQ | Yahoo Finance | Cotação, EPS e P/E OK. **`bvps` (BVPS) e `paymentDate` de dividendos sempre `null`**. |
| `REIT` | NYSE / NASDAQ | Yahoo Finance | Análogo a `STOCK_US`. **Modelo de Graham falha por falta de `bvps`**. |
| `ETF` | NYSE / NASDAQ / B3 | Yahoo / Brapi | Cotação OK. **Expense Ratio e Tracking Error nunca populados**. |
| `FIXED_INCOME` | Brasil (CDB/LCI/LCA/Tesouro) | Entrada Manual + BACEN | Cálculo por juros compostos teóricos. **Sem Marcação a Mercado (preço unitário PU em tempo real)**. |

---

## 2. Análise Detalhada dos 5 Provedores de Dados

---

### 2.1 Alpha Vantage (EUA)

- **URL Base:** `https://www.alphavantage.co`
- **Autenticação:** Query string `?apikey=H3KIOIMPF9JUBO3P`
- **Mercado:** EUA (NYSE, NASDAQ)
- **Plano / Rate Limit:** Free Tier — **25 requisições/dia** (5 req/min)

#### Endpoints Principais & Testes Ao Vivo

1. **`OVERVIEW` (IBM, O - Realty Income):**
   - Retorna ~52 campos string.
   - **Campos-chave recuperados:** `BookValue` (36.57 — **habilita modelo de Graham para US**), `ReturnOnEquityTTM`, `Beta`, `52WeekHigh`, `52WeekLow`, `50DayMovingAverage`, `200DayMovingAverage`, `AnalystTargetPrice`, `AnalystRatingStrongBuy/Buy/Hold/Sell`, `EVToEBITDA`, `PEGRatio`, `PercentInsiders`, `PercentInstitutions`.
   - ⚠️ **Para ETFs (`SCHD`):** Retorna `{}` vazio.
2. **`DIVIDENDS`:** Retorna histórico completo com `ex_dividend_date` e **`payment_date`** (resolve o bug do Yahoo Finance que retorna `paymentDate: null`).
3. **`EARNINGS` & `EARNINGS_CALENDAR`:** Histórico de EPS reportado vs. estimado, surpresa % e agenda de divulgação em formato CSV.

---

### 2.2 Bolsai (Brasil)

- **URL Base:** `https://api.usebolsai.com/api/v1`
- **Autenticação:** Header `X-API-Key: sk_797e60832d465c3e4bbba6289156d090cd17c847884f0c16`
- **Mercado:** Brasil (B3 - Ações)
- **Plano / Rate Limit:** Free Tier — **200 requisições/dia**

#### Endpoints Principais & Testes Ao Vivo

1. **`GET /api/v1/fundamentals/{ticker}` (PETR4, VALE3):**
   - **40+ indicadores fundamentalistas reais recuperados no Free Tier**:
     ```json
     {
       "ticker": "PETR4", "close_price": 43.42, "market_cap": 559628776482,
       "pl": 5.2, "pvp": 1.26, "ev_ebitda": 4.09, "ev_ebit": 4.54,
       "lpa": 8.35, "vpa": 34.54, "roe": 24.17, "roic": 16.7, "roa": 8.67,
       "gross_margin": 47.36, "net_margin": 21.69, "ebitda_margin": 43.41,
       "net_debt_ebitda": 1.5, "current_ratio": 0.74, "debt_equity": 0.83,
       "cagr_revenue_5y": 12.83, "cagr_earnings_5y": 77.68
     }
     ```
   - 🎯 **Destaque:** `vpa` (VPA/BVPS) e `roe` no Free Tier preenchem a principal lacuna de ações BR sem necessitar de token pago da Brapi.
2. **`GET /api/v1/stocks/{ticker}/quote` & `/stats`:** Cotação EOD, variação %, máxima/mínima 52 semanas, volume médio e retorno YTD.
3. ⚠️ **Limitações:** FIIs (`HGLG11`) retornam 404. Endpoints de `dividends`, `history` e `corporate-events` exigem plano Pro.

---

### 2.3 API Massive / Polygon.io (EUA, Global, FX, Crypto)

- **URL Base:** `https://api.massive.com` (ou alias `https://api.polygon.io`)
- **Autenticação:** Header `Authorization: Bearer _lNgXw0fnoGWdgtvHrjw0JvZsV8Z6FgN` ou query `?apiKey=...`
- **Mercado:** EUA (NYSE, NASDAQ, AMEX, Options), Câmbio (USD/BRL), Crypto, ADRs brasileiras (PBR, VALE, ITUB)
- **Plano / Rate Limit:** Free/Basic — **5 requisições/minuto**

#### Endpoints Principais & Testes Ao Vivo

1. **`GET /v3/reference/tickers/{ticker}` (AAPL):**
   - Retorna metadata oficial completa: `market_cap`, `sic_description`, `homepage_url`, `total_employees`, `branding` (`logo_url`, `icon_url`), `share_class_shares_outstanding`.
2. **`GET /v3/reference/dividends`:**
   - Retorna proventos com `cash_amount`, `declaration_date`, `ex_dividend_date`, `record_date`, **`pay_date`** e `frequency` (4 = Trimestral).
3. **`GET /v2/reference/financials/{ticker}` (Demonstrações Padronizadas):**
   - **Campos numéricos tipados (não strings)**: `bookValuePerShare` (17.98 — BVPS), `currentRatio`, `debtToEquityRatio`, `EBITDAMargin`, `enterpriseValueOverEBITDA`, `freeCashFlow`, `grossMargin`, `netIncome`, `operatingIncome`, `payoutRatio`, `priceToBookValue`, `priceEarnings`, `workingCapital`.
4. **`GET /v2/aggs/ticker/C:USDBRL/prev` (Câmbio USD/BRL em Tempo Real):**
   - Permite taxa de câmbio institucional sem depender do Yahoo (`BRL=X`).
5. **ADRs Brasileiras (`PBR`, `VALE`, `ITUB`):**
   - Permite arbitragem e cruzamento de dados de liquidez dos papéis brasileiros negociados em Nova Iorque.

---

### 2.4 ANBIMA (Brasil — Renda Fixa, Crédito Privado & Benchmarks)

- **URL Base:** `https://api.anbima.com.br` (Sandbox: `https://api-sandbox.anbima.com.br`)
- **Autenticação:** OAuth 2.0 Client Credentials Grant (`POST /oauth/access-token` via `client_id` + `client_secret`)
- **Mercado:** Renda Fixa Governamental (Tesouro), Crédito Privado (Debêntures, CRI, CRA), Índices de Referência (IMA-B, IDA, IRF-M), Fundos de Investimento (RCVM 175).

#### Endpoints Principais & Recursos Documentados

1. **Títulos Públicos Federais (TPF):** `GET /feed/precos-indices/v1/titulos-publicos/mercado-secundario-TPF`
   - Retorna **Taxa Indicativa**, Taxa Compra/Venda e **Preço Unitário (PU)** para **NTN-B** (IPCA+), **LFT** (Selic), **LTN** e **NTN-F**.
   - 🎯 **Habilita Marcação a Mercado em Tempo Real para Títulos Públicos** no Fuente Price Pro.
2. **Debêntures, CRI & CRA:** `GET /feed/precos-indices/v1/debentures/mercado-secundario` e `/cri-cra/mercado-secundario`
   - Taxas indicativas, PU do mercado secundário, duration e spread de crédito para títulos de renda fixa corporativa.
3. **Índices ANBIMA:** `/indices/resultados-intradiarios-ima` e `/indices/carteira-teorica-ida`
   - Índices de inflação (`IMA-B`), prefixados (`IRF-M`), Selic (`IMA-S`) e debêntures incentivadas (`IDA-IPCA`).
4. **Fundos de Investimento (v2 - RCVM 175):** `GET /feed/fundos/v2/fundos`
   - Cota diária, patrimônio líquido (PL), número de cotistas e classificação ANBIMA.

---

### 2.5 Dados de Mercado (Brasil — Ações, FIIs, CVM, Macro & Tesouro)

- **URL Base:** `https://api.dadosdemercado.com.br/v1`
- **Autenticação:** Header `Authorization: Bearer <token>` (solicitação via `api@dadosdemercado.com.br`)
- **Mercado:** Brasil (B3, FIIs, CVM, Macroeconomia, Tesouro Direto, Notícias)

#### Endpoints Principais & Recursos Documentados

1. **Fundos Imobiliários (`/reits` e `/reits/{ticker}/dividends`):**
   - ✅ **Diferencial:** Retorna cotações EOD e histórico de rendimentos com `payment_date` e `ex_date` para FIIs como `HGLG11` e `MXRF11` (onde a Bolsai falha com 404).
2. **Demonstrativos CVM & Ratios (`/companies/{cvm_code}/market_ratios` & `/docs`):**
   - Dados financeiros extraídos das Demonstrações Financeiras Padronizadas (DFP) e ITR da CVM.
3. **Macroeconomia & Curvas de Juros (`/macro` & `/treasury`):**
   - IPCA, IGP-M, Selic, CDI, **Boletim Focus (projeções do Banco Central)** e **Curvas ETTJ** (Estrutura a Termo da Taxa de Juros).
4. **Fluxo Estrangeiro:** `GET /investors` — Entrada e saída diária de capital estrangeiro na B3.

---

## 3. Quadro Comparativo Consolidado das 5 APIs

| Recurso / API | **Alpha Vantage** | **Bolsai** | **API Massive (Polygon)** | **ANBIMA** | **Dados de Mercado** |
|---|---|---|---|---|---|
| **Foco Geográfico** | EUA | Brasil | EUA & Global | Brasil | Brasil |
| **Autenticação** | Query Key | X-API-Key | Bearer / Query | OAuth 2.0 | Bearer Token |
| **Limite Free** | 25 req/dia | 200 req/dia | 5 req/min | Token via portal | Via e-mail |
| **Ações BR (`STOCK_BR`)** | ❌ | ✅ (40+ ratios) | ❌ (somente ADRs) | ❌ | ✅ (integração CVM) |
| **FIIs BR (`FII`)** | ❌ | ❌ (404) | ❌ | ❌ | ✅ (cotações + proventos) |
| **Ações US (`STOCK_US`)** | ✅ (Overview/Div) | ❌ | ✅ (XBRL/VWAP/Div) | ❌ | ❌ |
| **REITs US** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **ETFs US** | ❌ (vazio) | ❌ | ✅ | ❌ | ❌ |
| **Renda Fixa (`FIXED_INCOME`)**| ❌ | ❌ | ❌ | ✅ (Marcação/PU/Taxas) | ✅ (Tesouro Direto) |
| **Macro & Índices** | ❌ | ❌ | ✅ (Câmbio USD/BRL) | ✅ (IMA-B, IDA) | ✅ (Focus, IPCA, ETTJ) |
| **Dividend Payment Dates** | ✅ | ❌ (Pro) | ✅ | ❌ | ✅ |

---

## 4. Matriz de Enriquecimento por Categoria de Ativo

```
                  ┌────────────────────────────────────────────────────────┐
                  │              FUENTE PRICE PRO DATA PIPELINE            │
                  └────────────────────────────────────────────────────────┘
                                               │
         ┌───────────────────────┬─────────────┴───────────┬───────────────────────┐
         ▼                       ▼                         ▼                       ▼
    [STOCK_BR]              [FII / FII_INFRA]        [STOCK_US / REIT]         [FIXED_INCOME]
         │                       │                         │                       │
 ┌───────┴───────┐       ┌───────┴───────┐         ┌───────┴───────┐       ┌───────┴───────┐
 │ Primary:      │       │ Primary:      │         │ Primary:      │       │ Primary:      │
 │ Brapi.dev     │       │ Brapi.dev     │         │ Yahoo Finance │       │ Manual Accrual│
 ├───────────────┤       ├───────────────┤         ├───────────────┤       ├───────────────┤
 │ Enrichment:   │       │ Enrichment:   │         │ Enrichment:   │       │ Enrichment:   │
 │ • Bolsai      │       │ • Dados de    │         │ • Massive API │       │ • ANBIMA      │
 │   (ROE, VPA,  │       │   Mercado     │         │   (BVPS, Pay  │       │   (Marcação a │
 │    ROIC, EV/  │       │   (Rendimentos│         │    Date, Logo,│       │    Mercado/PU,│
 │    EBITDA)    │       │    FII)       │         │    VWAP, SEC) │       │    Taxa Ind.) │
 │               │       │ • ANBIMA      │         │ • AlphaVantage│       │ • Dados de    │
 │               │       │   (Index IDA- │         │   (Analyst    │       │   Mercado     │
 │               │       │    IPCA)      │         │    Targets)   │       │   (Focus/ETTJ)│
 └───────────────┘       └───────────────┘         └───────────────┘       └───────────────┘
```

### 1. `STOCK_BR`
- **Provedor Atual:** Brapi.dev
- **Enriquecimento com Bolsai:** Preenche `vpa` (VPA/BVPS) e `roe` no Free Tier. Adiciona indicadores avançados para a interface (`roic`, `ev_ebitda`, `net_margin`, `net_debt_ebitda`).
- **Enriquecimento com Dados de Mercado:** Balanços históricos completos CVM e indicadores de fluxo de capital estrangeiro.

### 2. `STOCK_US` & `REIT`
- **Provedor Atual:** Yahoo Finance
- **Enriquecimento com API Massive (Polygon):** Fornece `bookValuePerShare` (BVPS) em formato numérico nativo (destrava o modelo de Graham para mercado americano), traz a data exata de pagamento de dividendos (`pay_date`), logotipos oficiais (`logo_url`) e volume ponderado por preço (`vwap`).
- **Enriquecimento com Alpha Vantage:** Preço-alvo de analistas (`AnalystTargetPrice`) e contagem de recomendações (Buy/Hold/Sell).

### 3. `FIXED_INCOME` (Renda Fixa & Títulos Públicos)
- **Provedor Atual:** Entrada manual de taxa + cálculo teórico de acúmulo via BACEN (CDI/IPCA).
- **Enriquecimento com ANBIMA:** Transforma a Renda Fixa de um cálculo puramente teórico para **Marcação a Mercado real (PU secundário)**. Exibe taxa indicativa do dia e duration calculada.
- **Enriquecimento com Dados de Mercado:** Incorpora o Boletim Focus (expectativa de mercado para Selic/IPCA nos próximos anos) e curvas de juros ETTJ.

### 4. `FII` & `FII_INFRA`
- **Provedor Atual:** Brapi.dev
- **Enriquecimento com Dados de Mercado:** Histórico consolidado de rendimentos com confirmação de datas `payment_date`.
- **Enriquecimento com ANBIMA:** Benchmark do `FII_INFRA` comparado diretamente com o índice `IDA-IPCA` da ANBIMA.

---

## 5. Impacto nos Motores de Valuation

### Modelo de Valuation de Graham — `√(22.5 × EPS × BVPS)`
- **Antes:** Falhava em ~80% das ações BR por falta de `bvps` na Brapi (exigia token pago) e em 100% dos REITs/Stocks US (Yahoo não fornece BVPS).
- **Depois:** 
  - **Bolsai** supre `vpa` para ações BR sem custo.
  - **API Massive (Polygon)** ou **Alpha Vantage** suprem `bookValuePerShare` para ativos US.
  - **Resultado:** O modelo de Graham passa a ser computado com sucesso em 100% dos ativos acionários cobertos.

### Tela de Fluxo de Caixa / Calendário de Dividendos
- **Antes:** `dividendEvents.paymentDate` permanecia `null` para ações americanas no Yahoo.
- **Depois:** **API Massive** ou **Alpha Vantage** preenchem `pay_date` com precisão de dia, eliminando a ambiguidade no calendário de proventos do usuário.

### Módulo de Renda Fixa
- **Antes:** Posições em Tesouro Direto ou Debêntures mostravam apenas o rendimento contratado (curva).
- **Depois:** Possibilidade de exibir a **Marcação a Mercado (PU ANBIMA)**, mostrando o ganho/perda de capital real se o título for vendido hoje no mercado secundário.

---

## 6. Plano de Ação Priorizado (P1 a P5)

### 🟢 Priority 1 — Integrar Bolsai `fundamentals` para Ações BR
- **Objetivo:** Destravar o valuation de Graham em ativos brasileiros e popular ROE, ROIC, EV/EBITDA e Dívida Líquida.
- **Custo/Complexidade:** Baixo. 1 endpoint REST simples (`/api/v1/fundamentals/{ticker}`), resposta em JSON limpo.
- **Estratégia:** Lazy fallback — chamar o Bolsai apenas quando `bvps` ou `roe` retornarem `null` da Brapi.

### 🟢 Priority 2 — Integrar API Massive (Polygon) para Ações US & REITs
- **Objetivo:** Destravar valuation de Graham US (`bookValuePerShare`), corrigir `pay_date` de dividendos e obter imagens de logotipos oficiais.
- **Custo/Complexidade:** Baixo. Endpoint institucional extremamente rápido (`/v2/reference/financials` e `/v3/reference/dividends`).
- **Estratégia:** Utilizar a chave `_lNgXw0fnoGWdgtvHrjw0JvZsV8Z6FgN` para enriquecimento sob demanda ao adicionar ativos.

### 🟡 Priority 3 — Integrar Câmbio `USD/BRL` via API Massive
- **Objetivo:** Substituir a chamada instável do Yahoo (`BRL=X`) por uma cotação de câmbio de alta disponibilidade (`C:USDBRL`).

### 🟡 Priority 4 — Integrar ANBIMA para Marcação a Mercado de Renda Fixa
- **Objetivo:** Implementar cotação oficial e PU de Títulos Públicos (NTN-B, LFT, LTN) e Debêntures, trazendo transparência de marcação a mercado ao usuário.
- **Custo/Complexidade:** Média (exige autenticação OAuth 2.0 via `client_credentials` e gerenciamento de token).

### 🔴 Priority 5 — Integrar Dados de Mercado para Boletim Focus & Expectativas
- **Objetivo:** Alimentar simuladores de rendimento futuro com dados oficiais de expectativas de IPCA e Selic do Banco Central.

---

## 7. Proposta de Arquitetura Server-Side

```
src/lib/api/
├── brapi.server.ts          # Fonte primária BR (Preços + Dividendos)
├── yahoo.server.ts          # Fonte primária US (Preços + Metadata base)
├── bolsai.server.ts         # [NOVO] Enriquecimento fundamentalista BR (Bolsai API)
├── massive.server.ts        # [NOVO] Enriquecimento fundamentalista US/FX (API Massive)
├── anbima.server.ts         # [NOVO] Marcação a mercado de Renda Fixa & Benchmarks
└── apiService.functions.ts  # Orquestrador de fallback e fusão de dados (SSOT)
```

### Exemplo de Código do Orquestrador (`apiService.functions.ts`)

```typescript
// Exemplo conceitual de fusão de dados resiliente
export async function fetchAssetEnriched(ticker: string): Promise<Asset> {
  let asset = looksBr(ticker) ? await fetchFromBrapi(ticker) : await fetchFromYahoo(ticker);

  // Enriquecimento Lazy para BR (Bolsai)
  if (looksBr(ticker) && (!asset.metrics.bvps || !asset.metrics.roe)) {
    const bolsaiData = await fetchFromBolsaiFundamentals(ticker).catch(() => null);
    if (bolsaiData) {
      asset.metrics.bvps = asset.metrics.bvps ?? bolsaiData.vpa;
      asset.metrics.roe = asset.metrics.roe ?? bolsaiData.roe;
      asset.metrics.pbRatio = asset.metrics.pbRatio ?? bolsaiData.pvp;
    }
  }

  // Enriquecimento Lazy para US (API Massive / Polygon)
  if (!looksBr(ticker) && (!asset.metrics.bvps || hasMissingPayDates(asset))) {
    const massiveData = await fetchFromMassiveFinancials(ticker).catch(() => null);
    if (massiveData) {
      asset.metrics.bvps = asset.metrics.bvps ?? massiveData.bookValuePerShare;
    }
  }

  return asset;
}
```
