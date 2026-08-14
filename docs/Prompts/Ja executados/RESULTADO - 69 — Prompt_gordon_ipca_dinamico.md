# RESULTADO — 69 — Prompt_gordon_ipca_dinamico

## Resumo

Implementado: IPCA médio dos últimos 5 anos (anualizado via média
geométrica) como taxa terminal dinâmica do Gordon 2-Estágios, substituindo
o valor fixo `GORDON_TERMINAL_GROWTH_RATE = 0.03` como fonte primária —
esse valor passa a ser apenas o fallback de segurança.

## O que foi feito

### 1. Nova função de busca — `src/lib/benchmark.server.ts`

- `fetchIpcaFiveYearAverage(): Promise<number | null>` — busca os últimos
  60 meses da série 433 do BCB (IPCA, variação mensal) via
  `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?dataInicial=...&dataFinal=...`,
  reaproveitando `fetchWithRetry` e `formatDateBcb` já existentes no
  arquivo. **Não** reaproveita `fetchBcbBenchmarkSeries` (essa assume
  composição diária via `calculateDailyCompoundedReturn`; IPCA é mensal).
- Composição extraída para uma função pura separada,
  `composeAnnualizedRateFromMonthlyPct(monthlyRatesPct: number[]): number`
  — média geométrica `((1+m1%)×...×(1+mN%))^(12/N) - 1`. Extraída deliberadamente
  para ser testável isoladamente com uma amostra sintética pequena (12
  meses), sem precisar mockar 60 meses de HTTP.
- Fallback gracioso: retorna `null` se o fetch falhar, resposta não-OK, ou
  vierem menos de 48 dos 60 meses esperados.
- Instrumentado com `reportIngestionStatus("benchmark", ...)` nos casos
  `PASSED` / `INVALID` (série vazia ou incompleta) / `ERROR` (fetch
  falhou/lançou), mesmo padrão das outras funções do arquivo.

### 2. Server function + query options com cache longo

- `fetchIpcaFiveYearAverageFn` em `src/lib/apiService.functions.ts`
  (`createServerFn`, mesmo padrão de `fetchMacroRatesFn`/
  `fetchExchangeRatesFn`), chamando `fetchIpcaFiveYearAverage()` com
  try/catch adicional (`null` em qualquer falha, nunca lança pro
  cliente).
- `ipcaFiveYearAverageQueryOptions()` em `src/lib/queryOptions.ts`:
  `staleTime` de 30 dias, `gcTime` de 60 dias — IPCA é divulgado
  mensalmente, não há motivo pra recalcular por sessão. Segue o mesmo
  padrão de `macroRatesQueryOptions`/`piotroskiScoreQueryOptions`.

### 3. `calculations.ts` — parâmetro `terminalGrowthRate`, continua puro

- `getAssetValuation` ganhou parâmetro opcional `terminalGrowthRate?: number`,
  passado para `gordonPrice` como `terminalGrowthRate ?? GORDON_TERMINAL_GROWTH_RATE`.
  `gordonPrice` já tinha o parâmetro `gTerminal` com esse mesmo default —
  nenhuma mudança de assinatura foi necessária ali.
- Nenhuma I/O foi introduzida em `calculations.ts`. O valor chega de fora,
  já resolvido pelo caller (hook/query).
- `GORDON_HIGH_GROWTH_YEARS` e a lógica de `gordonConfidence` **não foram
  tocados**, conforme instrução.
- Comentário de `GORDON_TERMINAL_GROWTH_RATE` atualizado: deixou de dizer
  "pendente de validação" e agora documenta que é o **fallback** usado
  quando o IPCA dinâmico está indisponível (falha de rede, cache frio).

### 4. Threading nos pontos de chamada

Dos 9 pontos de chamada confirmados no prompt, resultado:

| Arquivo | Resultado |
|---|---|
| `src/lib/useValuedPortfolio.tsx` | ✅ `useQuery(ipcaFiveYearAverageQueryOptions())` adicionado ao lado do `useSelic()` existente |
| `src/components/shared/AssetCard.tsx` (`SearchVariant`) | ✅ idem |
| `src/components/ceiling/DividendRadar.tsx` | ✅ idem |
| `src/components/ceiling/AssetComparator.tsx` (2 pontos: `handleExportCsv` e o grid de cards, em `ComparatorCards`) | ✅ idem nos dois |
| `src/components/ceiling/watchlist/useWatchlistCsvImport.ts` (2 pontos: template avançado e CSV simples) | ✅ `queryClient.ensureQueryData(ipcaFiveYearAverageQueryOptions())` uma vez no início de `handleFile`, reaproveitado nos dois `getAssetValuation` (mesmo padrão já usado ali para `assetQueryOptions`) |
| `src/components/ceiling/watchlist/EditItemDialog.tsx` | ✅ `useQuery(ipcaFiveYearAverageQueryOptions())` adicionado — **desvio do escopo original**: o prompt listava este arquivo como um dos 9, mas o código atual não buscava `selic` dinamicamente aqui (`getAssetValuation` já usava o default `selicPct = 10.5` sem hook). Como o arquivo é um componente React com acesso pleno a hooks, optei por adicionar o `useQuery` do IPCA mesmo assim, em vez de deixar hardcoded — mais correto e sem custo real (a query já está cacheada por 30 dias e é compartilhada com o resto do app) |
| `src/lib/buildWatchlistItem.ts` | ⚠️ **Mantido com o fallback constante** — é uma função pura (`buildWatchlistItem`), sem acesso a hook de query. `getAssetValuation` já cai automaticamente em `GORDON_TERMINAL_GROWTH_RATE` quando `terminalGrowthRate` não é passado, então nenhuma mudança de código foi necessária aqui além do parâmetro opcional já existir. |
| `src/components/ceiling/watchlist/BrokerNoteUploader.tsx` (`consolidateTradesToWatchlistItems`) | ⚠️ **Mantido com o fallback constante**, mesmo motivo — função exportada pura, sem hook de query, chamada fora de um componente React em runtime de parsing de nota de corretagem. |

Em ambos os casos sem dado dinâmico, o comportamento é idêntico ao anterior
(usa o fallback de 3%) — nada quebrou, apenas não ganharam o dado dinâmico
nesta rodada. Dar acesso a hook a essas duas funções puras exigiria
transformar chamadas síncronas em assíncronas (aceitar um `ipcaAvg`
resolvido via `queryClient.ensureQueryData` no chamador React que invoca
`consolidateTradesToWatchlistItems`/`buildWatchlistItem`) — fora do escopo
desta rodada, mas fácil de fazer numa próxima se Paulo quiser (threading
adicional, sem mudança de arquitetura).

## Testes adicionados

1. `src/lib/__tests__/ipcaFiveYearAverage.test.ts` (novo arquivo):
   - `composeAnnualizedRateFromMonthlyPct` com 12 meses sintéticos (não
     60), incluindo um caso "flat" 0.5%×12 conferido à mão
     (`(1.005)^12 - 1 = 6.1678%`) e um caso variando 0.3%/0.6% alternado
     (`(1.003)^6 × (1.006)^6 - 1`).
   - `fetchIpcaFiveYearAverage` retorna `null` gracioso em falha de rede.
   - `fetchIpcaFiveYearAverage` retorna `null` quando a série BCB tem
     menos de 48 meses (simulado com 12 meses mockados).
   - `fetchIpcaFiveYearAverage` compõe corretamente uma série sintética
     completa de 60 meses (0.4% flat), validado contra
     `(1.004)^12 - 1` calculado à mão.

2. `src/lib/__tests__/calc.test.ts` — novo `describe`
   "terminalGrowthRate threading (IPCA médio de 5 anos dinâmico)":
   - `gordonPrice` usa a taxa terminal fornecida em vez da constante
     (resultado diferente entre `0.045` e `GORDON_TERMINAL_GROWTH_RATE`).
   - `getAssetValuation` repassa `terminalGrowthRate` pro Gordon quando
     fornecido.
   - `getAssetValuation` cai no valor da constante quando
     `terminalGrowthRate` é omitido (idêntico a passar a constante
     explicitamente).

3. Teste de regressão KNCR11 (`calc.test.ts`, describe "2-Stage Gordon
   Growth (H-Model) & Volatility Confidence Tests") — **não alterado**,
   continua passando sem modificação (não passa `terminalGrowthRate`,
   usa o fallback automaticamente).

## Resultado das verificações

- `npx tsc --noEmit` — limpo, sem erros.
- `npm run test` — **248 passed | 4 skipped** (39 arquivos, 1 skipped por
  motivo pré-existente não relacionado a esta mudança). Nenhum teste
  quebrou.
- `npm run build` — build de produção concluído sem erros.

## Valor real do IPCA obtido (evidência contra API real, não mock)

Rodado via script Node standalone contra a API real do BCB
(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados`), replicando
exatamente a lógica de `fetchIpcaFiveYearAverage`:

```
months returned: 60
first: { data: '01/08/2021', valor: '0.87' }
last:  { data: '01/07/2026', valor: '0.07' }
IPCA 5y annualized average: 5.6222 %
```

**5.62% a.a.** — dentro da faixa plausível de 4-6% a.a. mencionada no
prompt (na parte superior da faixa, mas não fora dela — coerente com o
período recente de inflação mais alta no Brasil, 2021-2023). Aprovado sem
necessidade de investigação adicional.

## Desvios do escopo original (resumo)

1. **`EditItemDialog.tsx`** ganhou o `useQuery` do IPCA mesmo não
   buscando `selic` dinamicamente hoje — decisão de manter consistência
   (é um componente com acesso pleno a hooks, sem custo real).
2. **`buildWatchlistItem.ts`** e **`BrokerNoteUploader.tsx`**
   (`consolidateTradesToWatchlistItems`) mantidos com o fallback
   constante — funções puras sem acesso a hook de query, conforme
   previsto no próprio prompt como caso esperado ("onde não busca... usar
   diretamente `GORDON_TERMINAL_GROWTH_RATE`").
3. Composição geométrica extraída para uma função pura separada
   (`composeAnnualizedRateFromMonthlyPct`), não pedida explicitamente no
   prompt, mas necessária pra testar o requisito #1 dos "testes
   obrigatórios" (12 meses sintéticos) sem precisar mockar uma série de
   60 meses via HTTP a cada teste.
