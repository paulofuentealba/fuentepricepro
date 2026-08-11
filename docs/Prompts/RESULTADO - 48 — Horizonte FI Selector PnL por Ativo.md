# RESULTADO — 48 — Horizonte FI: Selector de P&L por ativo

## O que foi implementado

Criado um selector puro `getAssetPnL(item: ValuedWatchlistItem)` que calcula
ganho/perda absoluto e percentual de uma posição a partir dos campos já
existentes em `ValuedWatchlistItem` (`currentPrice`, `averagePrice`,
`quantity`), sem tocar `useValuedPortfolio.ts` nem seu contrato.

- `pnlAbsolute = (currentPrice - averagePrice) * quantity`
- `pnlPercent = (currentPrice - averagePrice) / averagePrice`
- Guard: quando `averagePrice` é `null` ou `0` (posição sintética/legado sem
  preço médio), `pnlPercent` retorna `0` em vez de `Infinity`/`NaN` — mesmo
  padrão de guard usado em `calculateFixedIncomeBalance` (`calculations.ts`,
  linhas ~294-304, checagem `item.averagePrice == null`).

## Arquivos criados

- `src/lib/selectors/assetPnL.ts` — selector puro `getAssetPnL`.
- `src/lib/selectors/__tests__/assetPnL.test.ts` — 5 testes unitários:
  ganho, perda, posição zerada (quantity 0), `averagePrice === 0`,
  `averagePrice === null`.

Nenhum arquivo de produção da v1 foi alterado (confirmado via `git status`
antes do commit — apenas os dois arquivos acima foram adicionados por esta
tarefa).

## Verificação de campos existentes

Antes de implementar, `src/lib/useValuedPortfolio.ts` e
`src/lib/watchlist.ts` foram lidos para confirmar os campos reais:

- `ValuedWatchlistItem extends WatchlistItem`, e `WatchlistItem` já define
  `currentPrice: number`, `averagePrice: number | null`, `quantity: number`
  (`src/lib/watchlist.ts` linhas 32, 38-39).
- `useValuedPortfolio.ts` sobrescreve `currentPrice` com `livePrice` (preço ao
  vivo com fallback), então `item.currentPrice` no `valuedItems` já é o preço
  atual efetivo (linhas 78-94).
- Convenção de guard replicada de `calculateFixedIncomeBalance`
  (`src/lib/calculations.ts`).
- Convenção de teste (helper `makeItem` com overrides) replicada de
  `src/lib/__tests__/largestPosition.test.ts`, que testa o selector irmão
  `getLargestPosition` em `src/lib/selectors/largestPosition.ts`.

## Resultado real dos testes

```
npm run test -- assetPnL
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Suíte completa:

```
npm run test
 Test Files  34 passed | 1 skipped (35)
      Tests  221 passed | 4 skipped (225)
   Duration  3.68s
```

## Resultado real do build

```
npm run build
✓ 272 modules transformed.
✓ built in 844ms
```

Build SSR concluído sem erros.

## Desvios do plano original

- O caminho do teste especificado no prompt (`src/lib/selectors/__tests__/`)
  difere da convenção real do repositório, onde os testes do selector irmão
  (`getLargestPosition`) ficam em `src/lib/__tests__/largestPosition.test.ts`
  (fora de `src/lib/selectors/`). Optou-se por seguir literalmente o caminho
  indicado no prompt (`src/lib/selectors/__tests__/assetPnL.test.ts`), já que
  o prompt pede para seguir a especificação à risca; nenhuma pasta de teste
  pré-existente foi removida ou movida.
- Nenhum outro desvio. Nenhuma coluna de P&L foi adicionada às tabelas da v1
  (fora de escopo, conforme especificado).

## Commit

Commit gerado após esta execução (ver hash na mensagem de commit associada
a esta tarefa: "Horizonte FI 48 - Selector de P&L por ativo").
