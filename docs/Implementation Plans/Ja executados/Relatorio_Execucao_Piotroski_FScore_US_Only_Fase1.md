# Relatório de Execução — Piotroski F-Score (US-only, Fase 1: Camada de Dados)

**Data de execução:** 2026-08-11  
**Escopo:** Camada de dados e cálculo — sem UI. US-only via SEC EDGAR.

---

## Achado: Implementação já estava completa

Auditoria inicial revelou que todos os 4 componentes do prompt já haviam sido
implementados em commits anteriores desta sessão. O trabalho desta rodada foi:

1. **Auditar** a implementação existente quanto à correção e completude.
2. **Executar os gates de qualidade** (`tsc`, `vitest`).
3. **Rodar evidência real** contra AAPL e MSFT (exigência do prompt).
4. **Gerar este relatório** e commitar.

---

## Componentes Implementados

### 1. `fetchSecEdgarCompanyFacts(cik)` — secEdgar.server.ts

Busca `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json` via
`fetchWithRetry`. Extrai 2 anos fiscais completos (10-K, FY) para todos os campos.

| Campo | Tags XBRL tentadas | Fallback |
|-------|-------------------|---------|
| netIncome | `NetIncomeLoss` | — |
| totalAssets | `Assets` | — |
| operatingCashFlow | `NetCashProvidedByUsedInOperatingActivities`, `...ContinuingOperations` | — |
| longTermDebt | `LongTermDebtNoncurrent`, `LongTermDebt` | — |
| currentAssets | `AssetsCurrent` | — |
| currentLiabilities | `LiabilitiesCurrent` | — |
| sharesOutstanding | `CommonStockSharesOutstanding` (us-gaap) | `EntityCommonStockSharesOutstanding` (dei) |
| grossProfit | `GrossProfit` | `Revenues - CostOfGoodsAndServicesSold` |
| revenues | `Revenues`, `RevenueFromContractWithCustomerExcludingAssessedTax` | — |

### 2. `calculatePiotroskiFScore()` — calculations.ts

Função pura. 9 critérios binários, comparando ano corrente vs. anterior.

**Regra de corte:** `score = null` quando < 6 dos 9 critérios disponíveis
(`PIOTROSKI_MIN_CRITERIA_AVAILABLE = 6`). Protege contra exibição enganosa de
score parcial como se fosse out-of-9.

### 3. `fetchPiotroskiScoreFn` — apiService.functions.ts

`createServerFn` com `sanitizeTicker`. Fail-soft: retorna `score: null` em
qualquer falha, nunca lança exceção para o cliente.

### 4. `piotroskiScoreQueryOptions(ticker)` — queryOptions.ts

`staleTime: 7 dias`, `gcTime: 14 dias`. Dado anual — não muda diariamente.

### 5. Instrumentação de ingestão

`fetchWithRetry` auto-loga `PASSED`/`FAILED`/`ERROR` — nenhuma instrumentação
adicional necessária (taxonomia de ingestão já fechada antes deste prompt).

---

## Gate de Qualidade

| Gate | Resultado |
|------|-----------|
| `npx tsc --noEmit` | ✅ 0 erros |
| `npx vitest run` | ✅ 199 testes passados, 31 suítes, 0 falhas |

### Testes unitários — piotroski.test.ts

| Caso | Esperado | Resultado |
|------|---------|-----------|
| Empresa passando todos os critérios | score 9 | ✅ 9 |
| Empresa falhando em todos | score 0 | ✅ 0 |
| Dados esparsos (< 6 critérios calculáveis) | score null | ✅ null |
| Exatamente no limiar (6/9 critérios disponíveis) | score 6 | ✅ 6 |

---

## Evidência Real — AAPL e MSFT

Script executado em 2026-08-11 contra `data.sec.gov` (API pública).

### AAPL (CIK: 0000320193) — **F-Score: 8/9**

FY 2025 (2025-09-27) vs FY 2024 (2024-09-28)

| Campo | FY 2025 |
|-------|---------|
| Net Income | $112,010,000,000 |
| Total Assets | $359,241,000,000 |
| Operating Cash Flow | $111,482,000,000 |
| Long-Term Debt | $78,328,000,000 |
| Current Assets | $147,957,000,000 |
| Current Liabilities | $165,631,000,000 |
| Shares Outstanding | 14,773,260,000 |
| Gross Profit | $195,201,000,000 |
| Revenues | $416,161,000,000 |

| Critério | Resultado | Nota |
|---------|-----------|------|
| F1 positiveNetIncome | ✅ | Lucro $112B |
| F2 positiveOperatingCashFlow | ✅ | CFO $111B |
| F3 roaImproving | ✅ | ROA melhorou |
| **F4 cashFlowExceedsNetIncome** | **❌** | CFO $111,482M < NI $112,010M (delta: -$528M, 0.5%) |
| F5 leverageDecreasing | ✅ | LTD/Assets reduziu |
| F6 currentRatioImproving | ✅ | Current ratio melhorou |
| F7 noNewShares | ✅ | Buybacks contínuos |
| F8 grossMarginImproving | ✅ | Margem bruta subiu |
| F9 assetTurnoverImproving | ✅ | Giro de ativos melhorou |

> **F4 AAPL:** CFO levemente abaixo do NI em 0.5%. Matematicamente correto que F4 = false.
> Em anos anteriores AAPL tinha CFO > NI; FY2025 é exceção marginal.

---

### MSFT (CIK: 0000789019) — **F-Score: 6/9**

FY 2026 (2026-06-30) vs FY 2025 (2025-06-30)

| Campo | FY 2026 |
|-------|---------|
| Net Income | $133,749,000,000 |
| Total Assets | $758,376,000,000 |
| Operating Cash Flow | $182,935,000,000 |
| Long-Term Debt | $31,067,000,000 |
| Current Assets | $207,710,000,000 |
| Current Liabilities | $168,825,000,000 |
| Shares Outstanding | 7,427,000,000 |
| Gross Profit | $225,465,000,000 |
| Revenues | $331,839,000,000 |

| Critério | Resultado | Nota |
|---------|-----------|------|
| F1 positiveNetIncome | ✅ | NI $133B |
| F2 positiveOperatingCashFlow | ✅ | CFO $182B |
| F3 roaImproving | ✅ | ROA melhorou |
| F4 cashFlowExceedsNetIncome | ✅ | CFO $182B >> NI $133B (excelente qualidade de accrual) |
| F5 leverageDecreasing | ✅ | LTD caiu de ~$53B para $31B |
| **F6 currentRatioImproving** | **❌** | Current ratio piorou (maior capex/cloud) |
| F7 noNewShares | ✅ | Buybacks ativos |
| **F8 grossMarginImproving** | **❌** | Margem bruta caiu (custos IA subiram) |
| **F9 assetTurnoverImproving** | **❌** | Giro caiu (assets +$200B com investimentos em IA vs revenue +$42B) |

> **Contexto MSFT FY2026:** Score 6/9 reflete ciclo de reinvestimento pesado em Azure/IA.
> F6, F8, F9 pioraram como consequência do capex de plataforma — comportamento esperado
> e consistente com a estratégia publicada da empresa.

---

## Verificação Manual — Cálculos Spot

| Critério | Cálculo | Resultado esperado |
|---------|---------|-------------------|
| AAPL F4 | CFO 111,482M > NI 112,010M? | Não → ❌ correto |
| MSFT F9 | Rev/Assets FY26 = 331,839/758,376 = **0.437x** | < FY25 ratio → ❌ correto |
| MSFT F8 | GP/Rev FY26 = 225,465/331,839 = **67.94%** | < FY25 margin → ❌ correto |

---

## Próximos Passos (fora de escopo desta Fase 1)

- **UI:** Exibir F-Score no Comparador de Ativos — prompt separado.
- **BR/CVM:** Piotroski para ativos BR exige ETL de Dados Abertos CVM — item separado, mais caro.
