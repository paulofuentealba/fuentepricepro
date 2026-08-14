# 78 — Trajetória Histórica do Horizonte FI (Snapshot Diário + Backfill)

## Contexto e decisões já tomadas por Paulo (não reabrir)

1. **Granularidade**: reaproveitar o snapshot diário já existente
   (`usePortfolioSnapshot`, `users/{uid}/portfolioSnapshots/{YYYY-MM-DD}`)
   — não criar mecanismo de gravação novo.
2. **Retenção**: guardar histórico completo pra sempre — nenhuma
   rotina de limpeza/TTL deve ser adicionada.
3. **Backfill**: reconstruir snapshots retroativos a partir do
   `Transaction[]` já existente, para usuários que já têm meses de
   histórico.

## ⚠️ Investigar antes de implementar o backfill (limitação técnica real)

`totalInvestedBRL` (custo/capital investido) é **100% reconstruível**
a partir do histórico de transações — não depende de preço de mercado
em datas passadas, só de quantidade × preço pago em cada transação.

`totalValueBRL` (valor de mercado) em uma data passada **depende do
preço de cada ativo naquela data específica** — isso não é trivial:
- `fetchAssetPriceHistoryFn`/`assetPriceHistoryQueryOptions` já existem
  (construídos pro gráfico de desempenho do Comparador) e conseguem
  buscar série histórica de preço por ticker via Yahoo Finance — em
  tese, viabilizam backfill de valor de mercado real, não só custo.
- Mas: cobertura pode ser incompleta pra ativos BR de baixa liquidez
  (FIIs pequenos, ativos delistados), o volume de chamadas pra
  reconstruir múltiplos anos × múltiplos ativos × cada usuário pode ser
  caro/lento, e a data de início de cada ativo na carteira do usuário
  varia (não dá pra backfill uniforme).

**Investigar e reportar antes de implementar**: qual dos dois caminhos é
viável dentro de um esforço razoável —
(a) backfill completo (custo E valor de mercado real, via
`fetchAssetPriceHistoryFn`), com as limitações de cobertura reportadas
caso a caso, ou
(b) backfill só de `totalInvestedBRL` (sempre preciso), com
`totalValueBRL` disponível só a partir da data em que o snapshot
diário realmente começou a rodar em produção (marcado explicitamente
como "sem dado de valor de mercado antes desta data" no gráfico, não
inventado/interpolado).

Reportar a recomendação com esforço estimado antes de implementar
qualquer backfill em massa — não implementar (a) achando que é simples
sem confirmar a cobertura de dado real primeiro.

## Escopo técnico

### 1. Leitura da série (não precisa de gravação nova pro dia-a-dia)

Criar `useHorizonteTrajectory()` (ou nome equivalente) lendo
`users/{uid}/portfolioSnapshots/*` (query ordenada por data), retornando
a série pra plotar.

### 2. Sparkline no `HorizonteHero.tsx`

Adicionar uma visualização discreta de evolução (sparkline, não um
gráfico grande — o hero já tem o canvas do horizonte como elemento
principal) mostrando a trajetória de `coveragePercent`/`totalValueBRL`
ao longo do tempo disponível. Se houver menos de ~7 dias de dado, omitir
a sparkline (mostrar só quando fizer sentido visualmente).

### 3. Backfill (função separada, não parte do carregamento normal da tela)

Implementar como uma ação explícita (ex: acionada uma vez, não em todo
carregamento de página) que varre o `Transaction[]` do usuário e cria os
documentos de snapshot retroativos que ainda não existem — seguindo a
decisão tomada na investigação acima (custo-only ou custo+valor real).

## Regras obrigatórias

- Não adicionar nenhuma lógica de expiração/limpeza de snapshot antigo.
- Não implementar o backfill de valor de mercado sem antes confirmar
  viabilidade de cobertura de dado, conforme a investigação obrigatória
  acima.
- Não alterar `usePortfolioSnapshot.ts` (o mecanismo diário já existe e
  está correto, guard de DEV incluído) — só consumir a coleção que ele já
  escreve.

## Testes obrigatórios

1. Teste de `useHorizonteTrajectory` com série sintética.
2. Teste do backfill (escopo decidido na investigação) com histórico de
   transações sintético, confirmando reconstrução correta de
   `totalInvestedBRL` no mínimo.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Relatório da investigação de viabilidade do backfill de valor de
   mercado, com recomendação clara antes de implementar em massa
3. Screenshot da sparkline no hero

## Ao terminar

Atualizar `docs/SSOT.md`, item 5.6. Trabalhar em `dev`.
