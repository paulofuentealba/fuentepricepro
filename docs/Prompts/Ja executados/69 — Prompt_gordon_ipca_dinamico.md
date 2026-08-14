# Prompt para Claude Code — IPCA Médio de 5 Anos como Taxa Terminal do Gordon

## Contexto e decisão de Paulo (não reabrir)

`GORDON_TERMINAL_GROWTH_RATE = 0.03` (`src/lib/calculations.ts`) está
marcada como "PENDENTE DE VALIDAÇÃO DE MODELAGEM FINANCEIRA" desde a
implementação do Gordon 2-Estágios. Decisão tomada: em vez de um valor
fixo, usar a **inflação média (IPCA) dos últimos 5 anos**, mantida
atualizada automaticamente a cada nova divulgação do IPCA — não mais uma
constante hardcoded.

`GORDON_HIGH_GROWTH_YEARS = 5` (horizonte de transição) **confirmado,
mantém 5 anos, não mexer**.

`gordonConfidence` quando `"low"` **confirmado como só sinal visual**,
sem alterar o cálculo do consenso — já está assim hoje, não precisa de
nenhuma mudança de código pra isso.

## Escopo técnico

### 1. Nova função de busca — IPCA médio de 5 anos

Em `src/lib/benchmark.server.ts` (ou arquivo dedicado, decidir e
reportar): criar `fetchIpcaFiveYearAverage(): Promise<number | null>`.

**Não reaproveitar `fetchBcbBenchmarkSeries`** — ela assume composição de
taxa **diária** (`calculateDailyCompoundedReturn`), mas o IPCA (BCB SGS
série 433) é publicado como **variação mensal**. Precisa de lógica
própria:
- Buscar os últimos 60 meses da série 433
  (`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?dataInicial=...&dataFinal=...`,
  reaproveitar `fetchWithRetry`/formatação de data já existentes em
  `benchmark.server.ts`).
- Compor a taxa anualizada média via média geométrica dos 60 valores
  mensais: `((1+m1%)×(1+m2%)×...×(1+m60%))^(12/60) - 1`.
- Fallback gracioso: se a busca falhar ou vierem menos de ~48 meses de
  dado (tolerar pequenas lacunas, mas não computar com dado muito
  incompleto), retornar `null` — o caller decide o fallback (ver item 3).
- Instrumentar com `reportIngestionStatus` (`PASSED`/`INVALID`/`ERROR`),
  mesmo padrão já usado nas outras funções deste arquivo.

### 2. Query options com cache longo

`ipcaFiveYearAverageQueryOptions()` em `queryOptions.ts`:
`staleTime` de 30 dias (IPCA é publicado mensalmente, não precisa
recalcular a cada sessão) — se preferir um valor diferente, justificar.

### 3. Threading do valor — mesmo padrão já usado pra `selicPct`

`getAssetValuation`/`gordonPrice` (`calculations.ts`) ganham um novo
parâmetro opcional `terminalGrowthRate?: number` (nome sugerido, ajustar
se fizer mais sentido). Continuam **funções puras, sem I/O** — o valor
chega de fora, já resolvido.

Atualizar os **9 pontos de chamada** de `getAssetValuation` (confirmados:
`AssetCard.tsx`, `BrokerNoteUploader.tsx`, `EditItemDialog.tsx`,
`useWatchlistCsvImport.ts`, `DividendRadar.tsx`, `AssetComparator.tsx`
(2x), `buildWatchlistItem.ts`, `useValuedPortfolio.tsx`) pra passar
`terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE` —
**exatamente o mesmo padrão já usado hoje pra `selicPct: selic ?? 10.5`**
nesses mesmos arquivos. Onde o arquivo já busca `selic` via hook,
adicionar a busca de `ipcaAvg` do mesmo jeito, ao lado. Onde não busca
(ex: alguns desses arquivos podem não ter acesso a hook de query — nesse
caso, usar diretamente `GORDON_TERMINAL_GROWTH_RATE` como estava, e
reportar quais arquivos ficaram sem o dado dinâmico e por quê).

### 4. Atualizar o comentário da constante

`GORDON_TERMINAL_GROWTH_RATE` deixa de ser "pendente de validação" — o
comentário passa a explicar que é o **valor de fallback** usado quando o
IPCA de 5 anos não está disponível (falha de rede, cache frio na
primeira carga), não mais uma decisão em aberto.

## Regras obrigatórias

- `gordonPrice`/`getAssetValuation` continuam funções puras — toda busca
  de dado (IPCA, Selic) acontece fora, nunca dentro do motor de cálculo.
- Não alterar `GORDON_HIGH_GROWTH_YEARS` nem a lógica de
  `gordonConfidence`/peso no consenso — ambos já confirmados como estão.
- Não quebrar nenhum teste existente de `calc.test.ts` — os testes atuais
  provavelmente chamam `gordonPrice`/`getAssetValuation` sem passar
  `terminalGrowthRate`; confirmar que o fallback pro valor da constante
  mantém esses testes passando sem alteração.

## Testes obrigatórios

1. Teste de `fetchIpcaFiveYearAverage` com dado sintético (12 meses
   variando, não 60, pra facilidade de teste — confirmar composição
   geométrica correta com uma conta simples verificável à mão).
2. Teste confirmando que `gordonPrice`/`getAssetValuation` usam
   `terminalGrowthRate` quando fornecido, e caem no valor da constante
   quando `undefined`.
3. Reconfirmar teste de regressão KNCR11 (guard de singularidade) — não
   pode quebrar com a mudança.

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Resultado real de `fetchIpcaFiveYearAverage()` contra a API real do
   BCB (não mock) — reportar o valor obtido, pra eu conferir se é
   plausível (IPCA médio dos últimos 5 anos no Brasil deve estar
   grosseiramente entre 4-6% a.a., dado o histórico recente — se vier
   muito fora disso, investigar antes de aprovar)

## Ao terminar

Atualizar `docs/SSOT.md`, marcando o item "Guard do Gordon" como
totalmente resolvido (causa raiz matemática já estava corrigida antes
desta rodada; esta rodada resolveu o parâmetro de taxa terminal
dinâmico). Trabalhar em `dev`.
