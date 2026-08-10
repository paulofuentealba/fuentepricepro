### Tornar Idempotente o Import CSV de Transações ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Removida a geração aleatória de IDs (`Math.random()`) em `useWatchlistCsvImport.ts` e implementado o padrão determinístico `tx-csv-${uppercaseTicker}-${txTimestamp}-${quantity}-${pricePerShare}` alinhado ao parser de notas de corretagem em PDF (`BrokerNoteUploader.tsx`).
- **Comportamento Verificado**: Reimportar o mesmo arquivo CSV sobrescreve os registros via ID determinístico sem duplicar posições nem distorcer a quantidade total ou preço médio.
- **Novos Testes Unitários Adicionados**:
  - `csvImportTransactions.test.ts` (Cenário 4): Simulação de reimportação sequencial do mesmo CSV 2x mantendo strict idempotency (quantidade e total inalterados).
  - `csvImportTransactions.test.ts` (Cenário 5): Simulação de adição de nova compra real ao CSV criando novo registro determinístico.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **180 passed** | 4 skipped (30 suítes de teste aprovadas).
  3. **`npm run build`**: Client e SSR compilados com sucesso em 962ms.
  4. **Git Commit Local (Branch `dev`)**: `d491604` (`refactor(watchlist): torna idempotente o import CSV de transacoes via IDs deterministicos`).

---