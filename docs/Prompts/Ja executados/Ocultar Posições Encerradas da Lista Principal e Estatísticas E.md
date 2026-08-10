### Ocultar Posições Encerradas da Lista Principal e Estatísticas ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Implementado o campo `isClosedPosition = hasTransactions && computed.quantity === 0` em `useValuedPortfolio.ts` e filtradas as posições encerradas (como ABEV3 com 100 compras - 100 vendas = 0) do grid principal da Watchlist e do cálculo de estatísticas agregadas (`contextStats`), preservando intactos os ativos watch-only (`hasTransactions === false`), o histórico de transações em `AssetDetailSheet` e o IRR/Cash Flow.
- **Novos Testes Unitários Adicionados**:
  - `watchlist.test.ts` (4 testes): Teste de posição aberta, posição encerrada, ativo watch-only sem transações e persistência de acesso às transações do ativo encerrado.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **184 passed** | 4 skipped (30 suítes de teste aprovadas).
  3. **`npm run build`**: Client e SSR compilados com sucesso em 995ms.
  4. **Git Commit Local (Branch `dev`)**: `feat(watchlist): oculta posicoes encerradas (net quantity 0 com transacoes) da lista principal e estatisticas`.

---