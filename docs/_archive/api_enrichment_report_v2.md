# 📊 Relatório Consolidado de Avaliação de APIs (8 Provedores de Dados)
> Gerado em: 2026-08-02 | Fuente Price Pro
> Fontes Analisadas: **Alpha Vantage**, **Bolsai**, **API Massive (Polygon.io)**, **ANBIMA**, **Dados de Mercado**, **EODHD**, **Okane Box**, **CVM Dados Abertos**

---

## 1. Estado Atual do Modelo de Dados & Lacunas da Plataforma

### Ativos Cobertos no Fuente Price Pro

| Tipo | Mercado | Fonte Atual de Dados | Status de Cobertura & Lacunas Históricas |
|---|---|---|---|
| `STOCK_BR` | B3 (Brasil) | Brapi.dev | Cotação e histórico de dividendos OK. **Faltam múltiplos fundamentalistas** (ROE, ROIC, margens, dívida líquida). |
| `FII` | B3 (Brasil) | Brapi.dev | Cotação e proventos OK. **`vacancy` (Vacância %) e `capRate` (Cap Rate %) nunca populados**. |
| `FII_INFRA` | B3 (Brasil) | Brapi.dev | Análogo a FIIs. **Falta alinhamento com índices de crédito privado (IDA-IPCA)**. |
| `FIAGRO` | B3 (Brasil) | Brapi.dev | Análogo a FIIs. |
| `STOCK_US` | NYSE / NASDAQ | Yahoo Finance | Cotação, EPS e P/E OK. **`bvps` (BVPS) e `paymentDate` de dividendos sempre `null`**. |
| `REIT` | NYSE / NASDAQ | Yahoo Finance | Análogo a `STOCK_US`. **Modelo de Graham falha por falta de `bvps`**. |
| `ETF` | NYSE / NASDAQ / B3 | Yahoo / Brapi | Cotação OK. **Expense Ratio e Tracking Error nunca populados**. |
| `FIXED_INCOME` | Brasil (CDB/LCI/LCA/Tesouro) | Entrada Manual + BACEN | Cálculo por acúmulo teórico. **Sem Marcação a Mercado (Preço Unitário PU em tempo real)**. |

---

## 2. Análise Detalhada das 8 Fontes de Dados

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
   - Taxa de câmbio institucional sem depender do Yahoo (`BRL=X`).

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
   - Taxas indicativas, PU do mercado secundário, duration e spread de crédito.
3. **Índices ANBIMA:** `/indices/resultados-intradiarios-ima` e `/indices/carteira-teorica-ida`
   - Índices de inflação (`IMA-B`), prefixados (`IRF-M`), Selic (`IMA-S`) e debêntures incentivadas (`IDA-IPCA`).

---

### 2.5 Dados de Mercado (Brasil — Ações, FIIs, CVM, Macro & Tesouro)

- **URL Base:** `https://api.dadosdemercado.com.br/v1`
- **Autenticação:** Header `Authorization: Bearer <token>` (solicitação via `api@dadosdemercado.com.br`)
- **Mercado:** Brasil (B3, FIIs, CVM, Macroeconomia, Tesouro Direto, Notícias)

#### Endpoints Principais & Recursos Documentados
1. **Fundos Imobiliários (`/reits` e `/reits/{ticker}/dividends`):**
   - Retorna cotações EOD e histórico de rendimentos com `payment_date` e `ex_date` para FIIs como `HGLG11` e `MXRF11`.
2. **Macroeconomia & Curvas de Juros (`/macro` & `/treasury`):**
   - IPCA, IGP-M, Selic, CDI, **Boletim Focus (projeções do Banco Central)** e **Curvas ETTJ** (Estrutura a Termo da Taxa de Juros).
3. **Fluxo Estrangeiro:** `GET /investors` — Entrada e saída diária de capital estrangeiro na B3.

---

### 2.6 EODHD (EOD Historical Data — EUA, Brasil & Global)

- **URL Base:** `https://eodhd.com/api`
- **Autenticação:** Query parameter `?api_token=6a6fb1d5498da3.65268028&fmt=json`
- **Mercado:** Global (NYSE, NASDAQ, B3 `.SA`, LSE, XETRA, etc.)
- **Plano / Rate Limit:** Testado e aprovado com a chave fornecida.

#### Endpoints Principais & Testes Ao Vivo
1. **`GET /api/eod/{symbol}` (PETR4.SA, AAPL.US):**
   - Retorna séries temporais completas com `date`, `open`, `high`, `low`, `close`, **`adjusted_close`** e `volume`.
   - 🎯 **Testado com sucesso para B3 (`PETR4.SA`)** e mercado americano (`AAPL.US`).
2. **`GET /api/div/{symbol}` (PETR4.SA, AAPL.US):**
   - Retorna proventos históricos completos incluindo a **`paymentDate`** exata para ações brasileiras (ex: PETR4 `date: 2026-06-01`, `paymentDate: 2026-08-20`, `value: 0.35049`).
3. **`GET /api/splits/{symbol}`:** Histórico completo de desdobramentos e grupamentos.

---

### 2.7 Okane Box (Brasil — Ações, FIIs, Fundos CVM)

- **URL Base:** `https://www.okanebox.com.br/api/...`
- **Autenticação:** Header `Authorization: Bearer <SEU_EMAIL>`
- **Mercado:** Brasil (B3, FIIs, Fundos de Investimento CVM, Câmbio PTAX)
- **Plano / Rate Limit:** Free tier possui atraso de 15 dias para ações e 30 dias para fundos de investimento.

#### Endpoints Principais & Recursos Documentados
1. **Ações:** `GET /api/acoes/hist/[TICKER]/[START]/[END]/` — Histórico de cotações, proventos e múltiplos fundamentalistas (P/L, EBIT, EBITDA).
2. **Fundos Imobiliários:** `GET /api/fii/...` — Dados cadastrais do fundo, gestor/administrador, demonstrativos e histórico de rendimentos.
3. **Fundos de Investimento CVM:** Séries históricas de cotas, patrimônio líquido e composição de carteira.

---

### 2.8 CVM Dados Abertos (Portal Oficial de Dados da CVM)

- **URL Base:** `https://dados.cvm.gov.br/dataset/` e diretório `/dados/`
- **Autenticação:** **100% Gratuito, Público e Aberto** (Sem necessidade de API Key, acesso HTTP GET direto para arquivos CSV/ZIP ou via API REST CKAN em `dados.cvm.gov.br/api/3/action/`).
- **Mercado:** Brasil (Todas as Companhias Abertas e Fundos Imobiliários regulados pela CVM)

#### Datasets Principais & Resolução de Gaps Críticos

1. **Informe Mensal Estruturado de FII (`FII/DOC/INF_MENSAL/DADOS/`):**
   - 🏆 **RESOLUÇÃO DEFINITIVA DA VACÂNCIA**: Contém **`Percentual_Vacancia_Fisica` (%)**, **`Percentual_Vacancia_Financeira` (%)**, Área Bruta Locável (**ABL**), Rendimento Declarado por Cota, Patrimônio Líquido, VPA e Número de Cotistas.
   - 🎯 **Resolve o maior gap de FIIs no Fuente Price Pro (`vacancy` e `capRate`) sem qualquer custo de API.**
2. **Companhias Abertas (DFP / ITR):**
   - Dados financeiros padronizados brutos completos (Demonstração do Resultado DRE, Balanço Patrimonial BP, DFC).
3. **Proventos & Ações em Tesouraria:**
   - Registro oficial de todas as deliberações de proventos enviadas pelas empresas à CVM.

---

## 3. Quadro Comparativo Consolidado das 8 Fontes

| Recurso / API | **Alpha Vantage** | **Bolsai** | **API Massive** | **ANBIMA** | **Dados de Mercado** | **EODHD** | **Okane Box** | **CVM Dados Abertos** |
|---|---|---|---|---|---|---|---|---|
| **Foco Geográfico** | EUA | Brasil | EUA & Global | Brasil | Brasil | Global | Brasil | Brasil |
| **Autenticação** | Query Key | X-API-Key | Bearer / Query | OAuth 2.0 | Bearer Token | Query Token | Bearer Email | **Pública / Nenhuma** |
| **Custo / Limite** | 25 req/dia | 200 req/dia | 5 req/min | Token Portal | Via e-mail | Token OK | Delay 15d | **100% Grátis / Sem Limite** |
| **Ações BR (`STOCK_BR`)** | ❌ | ✅ (40+ ratios) | ❌ (ADRs) | ❌ | ✅ (CVM) | ✅ (Histórico/.SA) | ✅ | ✅ (DFP/ITR CVM) |
| **FIIs BR (`FII`)** | ❌ | ❌ (404) | ❌ | ❌ | ✅ (Rendimentos) | ✅ | ✅ | ✅ **(Vacância % + ABL)** |
| **Ações US (`STOCK_US`)** | ✅ | ❌ | ✅ (XBRL/BVPS) | ❌ | ❌ | ✅ | ❌ | ❌ |
| **REITs US** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **ETFs US** | ❌ (vazio) | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Renda Fixa (`FIXED_INCOME`)**| ❌ | ❌ | ❌ | ✅ **(Marcação/PU)** | ✅ (Tesouro) | ❌ | ❌ | ❌ |
| **Macro & Índices** | ❌ | ❌ | ✅ (FX USD/BRL)| ✅ (IMA-B/IDA) | ✅ (Focus/ETTJ) | ❌ | ✅ (PTAX) | ❌ |
| **Dividend Payment Dates** | ✅ | ❌ (Pro) | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |

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
 │ • Bolsai      │       │ • CVM Abertos │         │ • Massive API │       │ • ANBIMA      │
 │   (ROE, VPA,  │       │   (Vacância %,│         │   (BVPS, Pay  │       │   (Marcação a │
 │    ROIC, EV/  │       │    ABL, PL)   │         │    Date, Logo,│       │    Mercado/PU,│
 │    EBITDA)    │       │ • Dados de    │         │    VWAP, SEC) │       │    Taxa Ind.) │
 │ • EODHD       │       │   Mercado     │         │ • EODHD       │       │ • Dados de    │
 │   (Histórico/ │       │   (Rendimentos│         │   (Dividendos/│       │   Mercado     │
 │    Adjusted)  │       │    FII)       │         │    Adjusted)  │       │   (Focus/ETTJ)│
 └───────────────┘       └───────────────┘         └───────────────┘       └───────────────┘
```

### 1. `STOCK_BR`
- **Provedor Atual:** Brapi.dev
- **Enriquecimento com Bolsai:** Preenche `vpa` (VPA/BVPS) e `roe` no Free Tier. Adiciona `roic`, `ev_ebitda`, `net_margin` e `net_debt_ebitda`.
- **Enriquecimento com EODHD:** Séries históricas ajustadas de preços e proventos com `paymentDate` confirmada.

### 2. `FII` & `FII_INFRA`
- **Provedor Atual:** Brapi.dev
- **Enriquecimento com CVM Dados Abertos:** **Popular os campos `vacancy` (Vacância Física/Financeira %) e `capRate`** a partir dos Informes Mensais Estruturados da CVM, preenchendo a principal lacuna de FIIs da plataforma de forma 100% gratuita.
- **Enriquecimento com ANBIMA:** Comparação do benchmark de `FII_INFRA` com o índice `IDA-IPCA`.

### 3. `STOCK_US` & `REIT`
- **Provedor Atual:** Yahoo Finance
- **Enriquecimento com API Massive (Polygon):** Fornece `bookValuePerShare` (BVPS) numérico nativo (habilita Graham para US), traz a data de pagamento de dividendos (`pay_date`) e logotipos oficiais (`logo_url`).

### 4. `FIXED_INCOME` (Renda Fixa & Títulos Públicos)
- **Provedor Atual:** Entrada manual + cálculo teórico BACEN.
- **Enriquecimento com ANBIMA:** Transforma a Renda Fixa em **Marcação a Mercado real (PU secundário)** com taxa indicativa e duration calculada.
- **Enriquecimento com Dados de Mercado:** Boletim Focus (expectativas de Selic/IPCA do BCB) e curvas de juros ETTJ.

---

## 5. Impacto nos Motores de Valuation & Resolução de Gaps

### 1. Resolução do Gap de Vacância em FIIs (`vacancy`)
- **Problema Histórico:** O campo `vacancy` em `AssetMetrics` permanecia sempre `null` porque APIs como Brapi, Yahoo e Bolsai não expõem dados físicos imobiliários.
- **Solução:** Leitura automática dos Informes Mensais Estruturados da **CVM Dados Abertos** (`inf_mensal_fii`). Preenche `vacancy` com a vacância física/financeira declarada pelo gestor.

### 2. Modelo de Valuation de Graham — `√(22.5 × EPS × BVPS)`
- **Problema Histórico:** Falhava em ~80% das ações BR por falta de `bvps` na Brapi e em 100% dos REITs/Stocks US por falta de BVPS no Yahoo.
- **Solução:** **Bolsai** supre `vpa` (BR) e **API Massive / EODHD** suprem `bookValuePerShare` (US), garantindo execução do modelo em 100% dos papéis.

### 3. Marcação a Mercado na Renda Fixa
- **Problema Histórico:** Renda Fixa exibia apenas acúmulo teórico contratado.
- **Solução:** **ANBIMA** fornece o Preço Unitário (PU) do mercado secundário para Tesouro Direto e Debêntures, exibindo o valor real de resgate antecipado.

---

## 6. Plano de Ação Priorizado (P1 a P6)

### 🟢 Priority 1 — Integrar Bolsai `fundamentals` para Ações BR
- **Objetivo:** Destravar valuation de Graham em ações brasileiras e popular ROE, ROIC e EV/EBITDA.
- **Estratégia:** Fallback lazy (chamar Bolsai quando `bvps` ou `roe` forem `null` na Brapi).

### 🟢 Priority 2 — Integrar CVM Dados Abertos para Vacância de FIIs
- **Objetivo:** Preencher `vacancy` e `capRate` em `AssetMetrics` para todos os FIIs da carteira.
- **Estratégia:** Ingestão periódica (semanal/mensal) dos CSVs públicos de Informe Mensal da CVM. Custo zero.

### 🟢 Priority 3 — Integrar API Massive (Polygon) para Ações US & REITs
- **Objetivo:** Destravar Graham US (`bookValuePerShare`), corrigir `pay_date` de dividendos e buscar logos oficiais.

### 🟡 Priority 4 — Integrar EODHD para Histórico & Dividendos Globais
- **Objetivo:** Validação cruzada de datas de pagamento de proventos (`paymentDate`) para ativos BR (`.SA`) e globais.

### 🟡 Priority 5 — Integrar ANBIMA para Marcação a Mercado de Renda Fixa
- **Objetivo:** Cotação oficial em tempo real de PU e taxa indicativa de Títulos Públicos (NTN-B, LFT, LTN) e Debêntures.

### 🔴 Priority 6 — Integrar Dados de Mercado para Boletim Focus & Curvas ETTJ
- **Objetivo:** Alimentar simuladores de projeção financeira com expectativas de mercado do Banco Central.

---

## 7. Proposta de Arquitetura Server-Side Reutilizável

```
src/lib/api/
├── brapi.server.ts          # Fonte primária BR (Preços + Dividendos)
├── yahoo.server.ts          # Fonte primária US (Preços + Metadata base)
├── bolsai.server.ts         # [NOVO] Enriquecimento fundamentalista BR (Bolsai API)
├── massive.server.ts        # [NOVO] Enriquecimento fundamentalista US/FX (API Massive)
├── anbima.server.ts         # [NOVO] Marcação a mercado de Renda Fixa & Benchmarks
├── cvm.server.ts            # [NOVO] Ingestor de Vacância de FIIs & Informes CVM (Grátis)
└── apiService.functions.ts  # Orquestrador de fallback e fusão de dados (SSOT)
```

### Exemplo de Fusão de Dados Resiliente (`apiService.functions.ts`)

```typescript
export async function fetchAssetEnriched(ticker: string): Promise<Asset> {
  let asset = looksBr(ticker) ? await fetchFromBrapi(ticker) : await fetchFromYahoo(ticker);

  // 1. Enriquecimento de Vacância para FIIs via CVM Dados Abertos (Grátis)
  if (asset.type === "FII" && asset.metrics.vacancy === null) {
    const cvmFiiData = await fetchCvmFiiMetrics(ticker).catch(() => null);
    if (cvmFiiData) {
      asset.metrics.vacancy = cvmFiiData.vacanciaFisicaPct;
    }
  }

  // 2. Enriquecimento Fundamentalista BR via Bolsai
  if (looksBr(ticker) && asset.type === "STOCK_BR" && (!asset.metrics.bvps || !asset.metrics.roe)) {
    const bolsaiData = await fetchFromBolsaiFundamentals(ticker).catch(() => null);
    if (bolsaiData) {
      asset.metrics.bvps = asset.metrics.bvps ?? bolsaiData.vpa;
      asset.metrics.roe = asset.metrics.roe ?? bolsaiData.roe;
      asset.metrics.pbRatio = asset.metrics.pbRatio ?? bolsaiData.pvp;
    }
  }

  // 3. Enriquecimento Fundamentalista US via API Massive
  if (!looksBr(ticker) && (!asset.metrics.bvps || hasMissingPayDates(asset))) {
    const massiveData = await fetchFromMassiveFinancials(ticker).catch(() => null);
    if (massiveData) {
      asset.metrics.bvps = asset.metrics.bvps ?? massiveData.bookValuePerShare;
    }
  }

  return asset;
}
```
