### Unificar Import no "Add Asset" + Coluna Tipo (Compra/Venda) ✅ CONCLUÍDO E VERIFICADO

- **Implementação & Funcionalidades**:
  1. **Coluna `Tipo` (Compra/Venda) no Template Avançado**:
     - `parseTransactionTemplateCsv` em `src/lib/csv.ts` estendido para reconhecer variações multilíngues (`Compra`/`Venda` PT, `Buy`/`Sell` EN, `Compra`/`Venta` ES).
     - Valores normalizados internamente para `"buy"` ou `"sell"`.
     - Caso a coluna esteja ausente ou o valor seja irreconhecível, assume `"buy"` como fallback padrão (compatibilidade retroativa).
     - Modelo de exemplo `buildTransactionTemplateCsv()` atualizado para incluir a coluna `Tipo` (`VALE3,2024-03-15,100,62.50,Compra`).
  2. **Extração do Hook Compartilhado (`useWatchlistCsvImport.ts`)**:
     - Criado `src/components/ceiling/watchlist/useWatchlistCsvImport.ts`, unificando a detecção de formato (Fase 1 vs Fase 3), parsing, requisição de ativos, lançamento de transações via SSOT (`useTransactions`), recálculo de holdings e alertas de toast.
     - `WatchlistIO.tsx` refatorado para consumir este hook sem duplicação de código.
  3. **4ª Opção no Dropdown `+ Add Asset`**:
     - Adicionada a opção "Trazer meu arquivo" (`t.watchlist.addAssetDropdownImportFile`) com ícone `FileSpreadsheet` e subtítulo `"CSV/Excel"`.
     - Renderizada como 4ª opção na ordem: Add Equity, Add Fixed Income, Import Broker Note, Trazer meu arquivo.
     - `onClick` dispara o `triggerImport()` do mesmo hook `useWatchlistCsvImport`.
  4. **Testes Automatizados (`src/lib/__tests__/transactionTemplateCsv.test.ts`)**:
     - Suíte criada com 5 testes verificando geração do modelo CSV com `Tipo`, parsing dos 3 idiomas (PT/EN/ES) e fallback para `"buy"`.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **165 passed** | 4 skipped (28 arquivos de teste aprovados, incluindo `transactionTemplateCsv.test.ts`).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `4f5d2c0` (`feat(watchlist): unifica importacao CSV no Add Asset e adiciona coluna Tipo Compra/Venda`).

---