# Relatório de Execução — Piotroski F-Score (US-only, Fase 1: Camada de Dados) ✅ CONCLUÍDO E VERIFICADO

> Executa `docs/Prompts/prompt_piotroski_fscore_us_only.md`. Só camada de
> dados/cálculo, sem UI. F-Score BR/CVM fica fora desta rodada.

## Resumo

- **`fetchSecEdgarCompanyFacts(cik)`** em [secEdgar.server.ts](../../../src/lib/api/secEdgar.server.ts):
  consome `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
  (reaproveitando `fetchWithRetry`/`SEC_USER_AGENT` já existentes) e extrai
  os últimos 2 anos fiscais completos (10-K, `fp: "FY"`) de 9 tags XBRL,
  cada uma independentemente `number | null`.
- **`calculatePiotroskiFScore()`** (SSOT, [calculations.ts](../../../src/lib/calculations.ts)):
  função pura que recebe 2 anos de `PiotroskiYearInput` e retorna os 9
  critérios binários (`boolean | null`) + `score` (0-9 ou `null`) +
  `criteriaAvailable`.
- **`fetchPiotroskiScoreFn`** em [apiService.functions.ts](../../../src/lib/apiService.functions.ts)
  + **`piotroskiScoreQueryOptions(ticker)`** em [queryOptions.ts](../../../src/lib/queryOptions.ts)
  (`staleTime: 7 dias`).
- Instrumentado com a taxonomia de ingestão (`reportIngestionStatus`) —
  decisão da Abordagem A já estava fechada quando este prompt rodou, então
  a chamada nova já sai instrumentada (`PASSED`/`ERROR`/`INVALID`), sem
  pendência.

## Tags XBRL usadas (com fallback)

| Critério precisa de       | Tag primária                                            | Fallback                                                                     |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Lucro líquido               | `NetIncomeLoss`                                          | —                                                                               |
| Ativos totais (ROA)         | `Assets`                                                  | —                                                                               |
| Fluxo de caixa operacional  | `NetCashProvidedByUsedInOperatingActivities`              | `NetCashProvidedByUsedInOperatingActivitiesContinuingOperations`               |
| Dívida de longo prazo       | `LongTermDebtNoncurrent`                                  | `LongTermDebt`                                                                  |
| Ativo circulante            | `AssetsCurrent`                                           | —                                                                               |
| Passivo circulante          | `LiabilitiesCurrent`                                      | —                                                                               |
| Ações em circulação         | `CommonStockSharesOutstanding` (us-gaap)                  | `EntityCommonStockSharesOutstanding` (dei)                                     |
| Receita                     | `Revenues`                                                | `RevenueFromContractWithCustomerExcludingAssessedTax`                          |
| Lucro bruto                 | `GrossProfit`                                             | Derivado: `Revenues - CostOfGoodsAndServicesSold` (ou `CostOfRevenue`)         |

**Bug real encontrado e corrigido durante a verificação com dados reais**:
a primeira versão do fallback escolhia a primeira tag da lista que tivesse
*qualquer* dado, não a mais recente. A Apple parou de reportar `Revenues`
em 2018 (migrou pra `RevenueFromContractWithCustomerExcludingAssessedTax`
no XBRL taxonomy ASC 606), mas a tag antiga ainda existe no `companyfacts`
com dados de 2017/2018 — o fallback estava silenciosamente devolvendo
receita de 8 anos atrás em vez de cair pro tag atual. Corrigido em
`pickTag()`: agora compara o `end` mais recente de cada tag candidata e
usa a série mais recente, não a primeira com dado.

## Limitações de cobertura conhecidas

1. **`longTermDebt: null` é ambíguo** — indistinguível entre "empresa não
   reporta essa tag" e "empresa não tem dívida de longo prazo" (valor
   zero implícito). Não há como resolver isso só com XBRL sem uma
   segunda fonte.
2. **Alinhamento de ano fiscal por data exata de `end`** — os anos são
   ancorados em `NetIncomeLoss` (fallback `Assets`/`AssetsCurrent`), e as
   outras tags são casadas por igualdade exata da data de `end`. Uma
   empresa que mudasse o calendário fiscal no meio da série poderia
   desalinhar um campo específico num ano específico (raro na prática).
3. **Corte de disponibilidade**: `score` só é calculado quando pelo menos
   `PIOTROSKI_MIN_CRITERIA_AVAILABLE = 6` dos 9 critérios têm dado —
   abaixo disso, `score: null` em vez de um score parcial enganoso (ex:
   "3 de 9" quando na real só 4 critérios tinham dado disponível).

## Testes obrigatórios

1. `src/lib/__tests__/piotroski.test.ts` — `calculatePiotroskiFScore` com
   dados sintéticos: score 9/9 (todos os critérios passando), score 0/9
   (todos falhando), corte para `null` com dado insuficiente, e um caso
   exatamente no limiar de 6/9 confirmando que ainda produz um score
   numérico.
2. `src/lib/__tests__/secEdgar.test.ts` (novo `describe` bloco) —
   `fetchSecEdgarCompanyFacts` com fixture real: valores extraídos
   diretamente de `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
   (Apple Inc., baixado ao vivo em 2026-08-11), incluindo o caso real de
   `GrossProfit` derivado via `Revenues - CostOfGoodsAndServicesSold`.
   Mais 3 testes de fail-soft (sem `us-gaap`, HTTP falho, erro de rede).

## Verificação obrigatória (evidência real)

1. **`npx tsc --noEmit`**: 0 erros (Exit code 0).
2. **`npm run test`**: **199 passed** | 4 skipped (32 suítes).
3. **`npm run build`**: client + SSR compilados com sucesso.
4. **Rodada real contra AAPL e MSFT** (via `tsx`, mockando só `global.fetch`
   para servir os JSONs reais baixados de `data.sec.gov` — o resto do
   pipeline, incluindo `fetchSecEdgarCompanyFacts` e
   `calculatePiotroskiFScore`, rodou sem mock):

   **AAPL** (CIK 0000320193, FY2025 vs FY2024):
   ```json
   {
     "score": 8,
     "criteria": {
       "positiveNetIncome": true,
       "positiveOperatingCashFlow": true,
       "roaImproving": true,
       "cashFlowExceedsNetIncome": false,
       "leverageDecreasing": true,
       "currentRatioImproving": true,
       "noNewShares": true,
       "grossMarginImproving": true,
       "assetTurnoverImproving": true
     },
     "criteriaAvailable": 9
   }
   ```
   `cashFlowExceedsNetIncome: false` confere: CFO FY2025 = $111.48B <
   Net Income FY2025 = $112.01B.

   **MSFT** (CIK 0000789019, FY2026 vs FY2025 — MSFT fecha ano fiscal em
   30/jun, então o 10-K de FY2026 já estava disponível na data da
   verificação):
   ```json
   {
     "score": 6,
     "criteria": {
       "positiveNetIncome": true,
       "positiveOperatingCashFlow": true,
       "roaImproving": true,
       "cashFlowExceedsNetIncome": true,
       "leverageDecreasing": true,
       "currentRatioImproving": false,
       "noNewShares": true,
       "grossMarginImproving": false,
       "assetTurnoverImproving": false
     },
     "criteriaAvailable": 9
   }
   ```
   `currentRatioImproving`/`grossMarginImproving`/`assetTurnoverImproving`
   todos `false` refletem o forte crescimento de ativos/capex da MSFT
   (Assets quase +23% ano-a-ano) superando o crescimento de
   receita/margem no período.

## Pendências / fora de escopo

- UI (exibição do F-Score) — não implementada, conforme escopo do
  prompt.
- BR/CVM Dados Abertos — fora de escopo, item separado.
- Painel `/admin/ingestion` para visualizar o `ingestionLog` desta nova
  chamada — já discutido/decidido em rodada anterior, continua fora de
  escopo.

Trabalho realizado em `dev`.
