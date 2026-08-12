# RESULTADO — 78 — Trajetória Histórica do Horizonte FI

## Investigação de viabilidade do backfill de valor de mercado

`fetchAssetPriceHistoryFn` (`src/lib/apiService.functions.ts`) é uma
`createServerFn` que recebe `{ ticker, fromDate, toDate }`, formata o ticker
pro padrão Yahoo Finance (`formatYahooTicker`, sufixo `.SA` pra ativos BR de
4 letras + 1-2 dígitos) e delega pra `fetchYahooBenchmarkSeries`, retornando
a série diária de retorno acumulado no intervalo. `assetPriceHistoryQueryOptions`
(`src/lib/queryOptions.ts`) envolve isso em `useQuery` com `staleTime` de 24h,
já usado hoje só pelo gráfico de desempenho do Comparador
(`ComparatorPerformanceChart.tsx`), que busca no máximo alguns tickers por
vez, escolhidos manualmente pelo usuário na tela de comparação.

Fatores que pesaram contra o backfill completo (opção a — custo E valor de
mercado real):

1. **Volume de chamadas**: o backfill precisaria de 1 chamada por ticker
   distinto já detido pelo usuário (não por data — a função já retorna a
   série inteira do intervalo de uma vez), mas multiplicado por todos os
   usuários que acionarem o backfill, com fromDate potencialmente de anos
   atrás. Cada chamada depende de uma API externa (Yahoo Finance) sem SLA
   nem rate limit conhecido/documentado no projeto.
2. **Cobertura incerta pra ativos BR de baixa liquidez**: FIIs pequenos,
   ativos delistados/fundidos, ou ativos com ticker trocado ao longo do
   tempo (ex.: renomeação de fundo) têm alta chance de série incompleta ou
   ausente no Yahoo Finance, que não é uma fonte com garantia de cobertura
   pra esse segmento — isso geraria backfill parcial e inconsistente
   (alguns ativos com preço real, outros sem, dentro do mesmo snapshot),
   sem forma simples de sinalizar isso ao usuário sem complexidade adicional
   significativa (precisaria de um flag por ativo por dia, não só por
   snapshot).
3. **Complexidade de reconciliação por ativo**: a data de entrada de cada
   ativo na carteira do usuário varia — backfill uniforme por ticker exigiria
   rastrear a janela de detenção de cada ativo separadamente e ainda tratar
   splits/agrupamentos (`corporate_action`) refletidos tanto na quantidade
   quanto no preço histórico, dobrando a superfície de bugs possíveis.
4. **Esforço estimado**: pelo menos 2-3x o esforço do backfill de custo (que
   é só aritmética sobre dados já carregados localmente), com risco real de
   qualidade de dado no melhor caso e nenhuma forma barata de validar
   cobertura sem testar contra tickers reais de usuários.

## Decisão tomada: opção (b)

Implementado o backfill **só de `totalInvestedBRL`** (capital investido,
100% reconstruível de `Transaction[]` sem depender de nenhuma API externa).
`totalValueBRL` fica **`null`/ausente** em todo documento de backfill —
nunca inventado, interpolado ou aproximado por preço atual. `totalValueBRL`
só existe a partir da data em que o snapshot diário real
(`usePortfolioSnapshot`, não alterado) realmente gravou o documento em
produção.

Justificativa: opção (b) é sempre precisa, não depende de disponibilidade/
cobertura de terceiros, não tem custo de API, e ainda assim entrega valor
real — o usuário passa a ver a evolução do capital investido (linha de
"quanto botei") desde o início do histórico de transações, com a linha de
valor de mercado real aparecendo a partir de quando o app começou a gravar.
Isso fica documentado explicitamente no código (`portfolioSnapshotBackfill.ts`)
e na sparkline (que cai pra `totalInvestedBRL` nos dias sem valor de mercado,
sem fingir que é preço de mercado).

Limitação adicional documentada: a conversão de ativos em USD pro backfill
usa a taxa de câmbio **atual** (não uma taxa histórica por data) —
simplificação aceitável dado que o valor reconstruído já é só custo/capital
investido, não valor de mercado; uma versão futura poderia buscar câmbio
histórico diário se isso virar prioridade.

## Arquivos criados

- `src/lib/horizonteTrajectory.ts` — `buildTrajectorySeries` (função pura,
  ordena e normaliza documentos de `portfolioSnapshots` em pontos de
  trajetória) + `useHorizonteTrajectory()` (hook de leitura, `useQuery` sobre
  `getDocs` ordenado por `date`, sem escrita).
- `src/lib/portfolioSnapshotBackfill.ts` — `computeBackfillSnapshots` (função
  pura, reconstrói `totalInvestedBRL` dia a dia a partir de `Transaction[]`,
  pulando datas já existentes) + `useHorizonteBackfill()` (hook de ação
  explícita, lê datas existentes, calcula o que falta e grava em lotes de até
  400 documentos via `writeBatch`).
- `src/lib/__tests__/horizonteTrajectory.test.ts` — 6 testes cobrindo
  ordenação, preservação de `totalValueBRL`/`totalInvestedBRL`, `null` em
  documentos de backfill, defaults e filtragem de datas inválidas.
- `src/lib/__tests__/portfolioSnapshotBackfill.test.ts` — 7 testes cobrindo
  reconstrução dia a dia, `totalValueBRL` sempre `null`, exclusão de datas já
  existentes, efeito de venda no custo, soma multi-ativo com conversão
  USD→BRL, ausência de transações e não-emissão de dias com posição zerada.

## Arquivos alterados

- `src/components/horizonte/HorizonteHero.tsx` — consome
  `useHorizonteTrajectory()`, adiciona `HorizonteTrajectorySparkline`
  (SVG `<polyline>` discreto, 240x32) exibido só quando
  `hasEnoughDataForSparkline` (≥7 pontos), abaixo do canvas do horizonte.
- `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` — nova chave
  `home.trajectorySparklineLabel` nos três idiomas.
- `docs/SSOT.md` — item 5.6 atualizado (ver abaixo).

## Arquivos NÃO alterados (por decisão explícita do prompt)

- `src/lib/portfolioSnapshot.ts` — mecanismo diário intacto, só consumido.
- Nenhuma rotina de limpeza/TTL foi adicionada em nenhum lugar.

## Resultado da verificação

1. `npx tsc --noEmit` — **limpo**, sem erros.
2. `npm run test` — **282 passed | 4 skipped** (42 arquivos passados, 1
   skipped — pré-existente, não relacionado a este trabalho). Inclui os 13
   testes novos deste prompt.
3. `npm run build` — **build concluído com sucesso** (client + SSR). Warning
   pré-existente de chunk grande (`auth-provider-*.js` > 500kB) não
   relacionado a este trabalho.

## Pendência de confirmação visual

Este ambiente não tem browser real disponível pra capturar screenshot da
sparkline renderizada no `HorizonteHero`. A implementação foi verificada por
tipo (`tsc`), teste unitário (`vitest`) e build (`vite build`), mas a
confirmação visual final (alinhamento, cor, comportamento em tema claro/
escuro) fica pendente de checagem manual do usuário rodando `npm run dev` e
abrindo `/app` com um usuário que tenha ≥7 dias de snapshot (real ou via
backfill).
