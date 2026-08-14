# RESULTADO — 51 — Horizonte FI: Dashboard v2 (Horizonte + cards de resumo)

## O que foi implementado

Substituído o placeholder de `src/routes/app-v2/index.tsx` (prompt 49) por um
dashboard real:

- **`HorizonteHero`** (já criado no prompt 50, `src/components/horizonte/HorizonteHero.tsx`)
  renderizado no topo, sem alterações — já cobria o empty state ("registre
  seu primeiro aporte...") e o loading via `useValuedPortfolio().isAppLoading`.
- **Grid de 3 cards de resumo** abaixo do hero, usando os tokens `--h-*`
  (`--h-paper-raised`, `--h-line`, `--h-radius-xl`, `--h-shadow-sm`,
  `--h-font-display`, `--h-ink`, `--h-ink-soft`, `--h-success`, `--h-danger`):
  1. **Patrimônio total** — `totals.consolidatedNetWorth` de `useValuedPortfolio()`.
  2. **Proventos recebidos (ano)** — `computeRealizedIncomeSummary(realizedEvents).currentYear`,
     onde `realizedEvents` é calculado com `calculateRealizedIncome()`
     (`src/lib/realizedIncome.ts`), replicando o mesmo padrão já usado em
     `CashFlowCalendar.tsx` (v1): `useTransactions()` +
     `getEffectiveTransactions()` (`src/lib/portfolioIrr.ts`) +
     `assetQueryOptions()` por ticker para obter `dividendEvents`.
  3. **Maior posição** — selector puro `getLargestPosition(valuedItems)`.
     Esse selector **já existia** em `src/lib/selectors/largestPosition.ts`
     (criado em prompt anterior) e foi reaproveitado sem alterações — ordena
     por valor de mercado (`currentPrice * quantity`), excluindo posições
     fechadas (`isClosedPosition`) e valores <= 0.
- **Delta do dia na maior posição**: checado o hook `useValuedPortfolio()`
  antes de assumir o campo — `ValuedWatchlistItem` **não** carrega
  `changePct`; esse dado só existe no mapa `quotes` (tipo `LiveQuote`,
  `src/lib/api/types.ts`), retornado separadamente pelo hook. O card usa
  `quotes[largestPosition.item.ticker]?.changePct`, e omite o badge de delta
  quando esse valor é `null`/indisponível (nenhum cálculo inventado).
- **Skeleton states**: reaproveitado `Skeleton` de `src/components/ui/skeleton.tsx`
  (mesmo componente da v1), condicionado a `isAppLoading` de
  `useValuedPortfolio()`. Nenhum novo componente de loading foi criado.
- **Empty state**: já resolvido pelo próprio `HorizonteHero` (prompt 50), que
  detecta `items.length === 0` e mostra o convite "Registre seu primeiro
  aporte para começar sua jornada" em vez de 0% travado. Os cards de resumo
  abaixo simplesmente mostram valores zerados/"—" nesse caso (não há dado
  mockado nem estado de erro).

## Arquivos alterados

- `src/routes/app-v2/index.tsx` — reescrito por completo: placeholder →
  dashboard real (`HorizonteHero` + grid de 3 `SummaryCard`).

## Arquivos reaproveitados (não alterados)

- `src/components/horizonte/HorizonteHero.tsx` (prompt 50)
- `src/lib/selectors/largestPosition.ts` (já existia, conforme spec previa
  "criar... se não existir equivalente" — o equivalente já existia)
- `src/lib/useValuedPortfolio.ts`
- `src/lib/realizedIncome.ts`
- `src/lib/portfolioIrr.ts` (`getEffectiveTransactions`)
- `src/lib/cashflow.ts` (tipo `DividendEventsMap`)
- `src/components/ui/skeleton.tsx`
- `src/lib/formatters.ts` (`formatCurrency`, `formatPercent`)

## Resultado dos testes/build

### `npm run test`

```
 Test Files  34 passed | 1 skipped (35)
      Tests  221 passed | 4 skipped (225)
   Duration  3.34s
```

Nenhum teste novo foi adicionado (o prompt não pediu testes específicos para
esta tela; os selectors/hooks reaproveitados já têm cobertura própria
existente). Suíte completa passou sem regressões.

### `npm run build`

Build client + SSR concluído com sucesso (`✓ built in 1.46s` client,
`✓ built in 817ms` server). Nenhum erro de TypeScript ou de bundling. Apenas
o aviso pré-existente de chunks > 500kB (não relacionado a esta mudança).

## Verificação manual dos números

Não foi possível abrir o app com um usuário real de dados (nem emulador
Firebase local ativo) nesta execução — a verificação ficou restrita a:
checagem estática de que os campos consumidos (`totals.consolidatedNetWorth`,
`computeRealizedIncomeSummary(...).currentYear`, `getLargestPosition(...)`)
são exatamente os mesmos SSOTs que a v1 usa hoje (`CashFlowCalendar.tsx` usa
`totals.consolidatedNetWorth` e o mesmo pipeline de `calculateRealizedIncome`
+ `computeRealizedIncomeSummary`; o card "maior posição" usa o mesmo
`valuedItems` de `useValuedPortfolio()` que a v1 usa para a Watchlist), e ao
`npm run build`/`npm run test` passando limpo. **Recomenda-se validação
visual com login real antes do merge**, comparando os três números com a
v1 (`/app`).

## Desvios do plano original

Nenhum desvio de escopo. Único ponto de atenção documentado no próprio spec
foi seguido à risca: o delta percentual da maior posição usa `changePct` de
`quotes` (não de `valuedItems`, que não carrega esse campo) e é omitido
quando indisponível, em vez de calculado de forma não verificada.

Tabela de carteira, cash flow, radar, comparador e screener permanecem fora
de escopo e continuam apontando para a v1, conforme prompt 49.

## Commit

```
Horizonte FI 51 - Dashboard v2 (hero + cards de resumo)
```
