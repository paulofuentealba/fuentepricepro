# Prompt para Antigravity — Piotroski F-Score (US-only, Fase 1: Camada de Dados)

## 🛑 Modo de operação

Escopo desta rodada: **só a camada de dados e cálculo**, sem UI. F-Score
US-only (SEC EDGAR) — BR fica fora até resolvermos o ETL de CVM Dados
Abertos (item separado, mais caro).

## Contexto

`fuente-investidor-profissional` validou o modelo: 9 critérios binários,
score 0-9, precisa de 2 anos de Balanço/DRE/Fluxo de Caixa por empresa.
`secEdgar.server.ts` hoje já tem lookup de CIK por ticker (cacheado,
funcional) mas só extrai `bvps`. SEC EDGAR expõe a API `companyfacts`
com XBRL padronizado (taxonomia US-GAAP) contendo série histórica por
empresa — é essa API que vamos consumir.

## Escopo técnico

### 1. Nova função — `fetchSecEdgarCompanyFacts(cik)`

Em `secEdgar.server.ts`, adicionar função que busca
`https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json` (reaproveitar
`fetchWithRetry` e o `SEC_USER_AGENT` já existentes — SEC exige User-Agent
identificável, já está configurado certo).

Extrair as séries históricas (últimos 2 anos fiscais completos)
necessárias pros 9 critérios:
- `NetIncomeLoss` (lucro líquido)
- `Assets` (ativos totais — pra ROA)
- `NetCashProvidedByUsedInOperatingActivities` (fluxo de caixa operacional)
- `LongTermDebtNoncurrent` (dívida de longo prazo)
- `AssetsCurrent` / `LiabilitiesCurrent` (pra liquidez corrente)
- `CommonStockSharesOutstanding` (pra checar diluição)
- `GrossProfit` / `Revenues` (pra margem bruta)

**Atenção**: nem toda empresa reporta exatamente essas tags XBRL (podem
variar, ex: `GrossProfit` às vezes precisa ser derivado de
`Revenues - CostOfRevenue`). Implementar fallback de tags alternativas
onde for um padrão conhecido, e retornar `null` pro critério específico
(não pro F-Score inteiro) quando o dado realmente não existir — cada um
dos 9 critérios deve poder ser `true`/`false`/`null` (indisponível)
independentemente.

### 2. Função pura de cálculo — `calculatePiotroskiFScore()`

Em `src/lib/calculations.ts` (SSOT), função pura recebendo os dados de 2
anos e retornando:

```ts
interface PiotroskiResult {
  score: number | null; // 0-9, ou null se dados insuficientes (menos de X critérios calculáveis)
  criteria: {
    positiveNetIncome: boolean | null;
    positiveOperatingCashFlow: boolean | null;
    roaImproving: boolean | null;
    cashFlowExceedsNetIncome: boolean | null;
    leverageDecreasing: boolean | null;
    currentRatioImproving: boolean | null;
    noNewShares: boolean | null;
    grossMarginImproving: boolean | null;
    assetTurnoverImproving: boolean | null;
  };
  criteriaAvailable: number; // quantos dos 9 puderam ser calculados
}
```

Definir uma regra clara de quando `score` deve ser `null` em vez de um
número parcial (ex: se menos de 6 dos 9 critérios tiverem dado
disponível, `score = null` — não mostrar um "F-Score de 3/9" que na
real é "só consegui calcular 4 critérios, os outros 5 não tinham dado").
Reportar o corte escolhido antes de finalizar se houver dúvida.

### 3. Server function + query options

`fetchPiotroskiScoreFn` em `apiService.functions.ts` (mesmo padrão dos
outros `createServerFn`), e `piotroskiScoreQueryOptions(ticker)` em
`queryOptions.ts` com `staleTime` longo (dado fundamentalista anual —
sugestão 7 dias, maior que o de macro rates, já que isso não muda
diariamente).

### 4. Instrumentação com a taxonomia de ingestão

Se o discovery da taxonomia de ingestão (P1, rodando em paralelo) já
tiver decisão fechada até este prompt rodar, instrumentar essa nova
chamada com o padrão definido. Se ainda não tiver decisão, implementar
sem instrumentação por enquanto e sinalizar como pendência — não
bloquear este item esperando o outro.

## Regras obrigatórias

- Não implementar UI nenhuma nesta rodada — isso é só a camada de dado.
- Não expandir escopo pra BR/CVM nesta rodada.
- Retornar `null` por critério individual quando faltar dado, nunca
  assumir um valor.
- Não hardcode as tags XBRL sem verificar contra a documentação da SEC
  (`https://www.sec.gov/cgi-bin/browse-edgar` / XBRL taxonomy US-GAAP)
  se houver dúvida sobre o nome exato de uma tag.

## Testes obrigatórios

1. Teste de `calculatePiotroskiFScore` com dados sintéticos cobrindo:
   empresa passando em todos os 9 critérios (score 9), empresa falhando
   em todos (score 0), e um caso com dado parcial faltando (confirma
   que vira `null` conforme a regra de corte definida).
2. Teste de `fetchSecEdgarCompanyFacts` com mock de resposta real da API
   (buscar um exemplo real de resposta da SEC pra usar como fixture, não
   inventar formato).

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Rodar a função real contra 1-2 tickers US reais (ex: AAPL, MSFT) e
   reportar o resultado literal do F-Score calculado, pra eu conferir a
   matemática manualmente antes de aprovar

## Ao terminar

Atualizar `docs/PROMPTS_LOG.md` com o resumo, as tags XBRL usadas, e
qualquer limitação de cobertura de dado encontrada (empresas que não
reportam alguma tag). Trabalhar em `dev`.
