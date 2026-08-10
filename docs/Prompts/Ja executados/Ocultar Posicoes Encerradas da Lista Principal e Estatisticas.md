# Relatório de Execução — Ocultar Posições Encerradas da Lista Principal e Estatísticas

## Contexto e Causa Raiz

Um ativo com histórico de transações que resultavam em quantidade líquida zero (ex: `ABEV3` com compra de 100 cotas em 2023 e venda de 100 cotas em 2025) continuava aparecendo no grid principal da Watchlist ("Todos 93") e contando nas estatísticas agregadas de oportunidade ("81 de 93 ativos abaixo do teto") como se fosse uma posição aberta.

---

## Regra de Negócio & Solução Implementada

Diferenciamos de forma rigorosa os dois cenários de quantidade zero:
1. **Posição Encerrada (`isClosedPosition === true`)**: O ativo possui 1 ou mais transações registradas no histórico (`hasTransactions === true`) **E** a quantidade calculada líquida é exatamente `0`.
   - **Ação**: Ocultado do grid principal da Watchlist e excluído do cálculo das estatísticas agregadas (`contextStats` de teto e contagem de ativos nos filtros e KPIs).
2. **Ativo Watch-Only (`isClosedPosition === false`)**: O ativo possui quantidade `0` simplesmente porque o usuário nunca registrou transações para ele (`hasTransactions === false`), servindo apenas para monitorar preço teto/margem.
   - **Ação**: Mantido visível normalmente no grid principal e nas estatísticas.
3. **Escopo Preservado**:
   - O histórico de transações em si e o cálculo de IRR/Cash Flow histórico permanecem intactos.
   - As transações do ativo encerrado continuam completamente acessíveis no drawer de detalhes (`AssetDetailSheet` → aba "Transações").

---

## Alterações Técnicas

1. **`src/lib/useValuedPortfolio.ts`**:
   - Adicionada a propriedade `isClosedPosition: boolean` ao tipo `ValuedWatchlistItem`.
   - Calculado `isClosedPosition = hasTransactions && computed.quantity === 0` no `baseItems`.
   - Repassado `isClosedPosition` para `valuedItems`.
   - Ignorados ativos com `isClosedPosition === true` no loop de `totals` (evitando inflar contagens de ativos BRL/USD).

2. **`src/components/ceiling/Watchlist.tsx`**:
   - Derivado `activeValuedItems = valuedItems.filter(it => !it.isClosedPosition)`.
   - Utilizado `activeValuedItems` para `useAssetFilterSort`, `contextStats`, `concentrationViolators`, `topAndWorst`, `WatchlistKpiSection` e `WatchlistAssetGrid`.

3. **Sugestão para Futuras Fases (Sem UI adicionada)**:
   - *Nota*: Seria trivial adicionar no futuro um filtro/toggle "Posições Encerradas" na barra de ferramentas da Watchlist para o usuário visualizar ativos já vendidos com 1 clique. Nenhuma UI nova foi criada nesta etapa conforme as regras do prompt.

---

## Validação por Testes Unitários

Novos testes em `src/lib/__tests__/watchlist.test.ts`:
- **`Test 1`**: Ativo com transações positivas (`QTY > 0`) → `isClosedPosition === false` (visível na lista).
- **`Test 2`**: Ativo com transações zeradas (cenário ABEV3: 100 compras - 100 vendas = 0) → `isClosedPosition === true` (oculto da lista e estatísticas).
- **`Test 3`**: Ativo watch-only sem nenhuma transação → `isClosedPosition === false` (visível normalmente na lista).
- **`Test 4`**: Transações do ativo encerrado continuam completas e acessíveis no drawer de histórico.

---

## Evidências Literais de Validação dos Gates

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **184 passed** / 4 skipped (30 suítes de teste aprovadas, incluindo os novos testes de `watchlist.test.ts`).
3. **`npm run build`**: Bundle Client & SSR compilados com sucesso em 995ms.

---

## Screenshots de Validação Visual

![Posição Encerrada Oculta do Grid Principal](file:///C:/Users/paulo/.gemini/antigravity/brain/926262f3-ea40-43d7-a03a-e733ed105d39/closed_pos_hidden_1786368326734.jpg)

![Ativo Watch-Only Visível Normalmente](file:///C:/Users/paulo/.gemini/antigravity/brain/926262f3-ea40-43d7-a03a-e733ed105d39/watch_only_visible_1786368342642.jpg)
