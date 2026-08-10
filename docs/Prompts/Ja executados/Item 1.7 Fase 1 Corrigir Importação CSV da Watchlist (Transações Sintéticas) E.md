### Item 1.7 Fase 1: Corrigir Importação CSV da Watchlist (Transações Sintéticas) ✅ CONCLUÍDO E VERIFICADO

- **Implementação & Alinhamento SSOT**:
  1. **Refatoração do Manipulador de Importação em `WatchlistIO.tsx`**: Migrada a importação de CSV para gerar transações sintéticas via `useTransactions()`.
     - **Ativos Novos**: Cria a primeira transação sintética de compra (`buy`) com quantidade e preço médio importados, rotulada com `notes: t.transactions.csvImportAdjustment`.
     - **Ativos Existentes**: Calcula o delta de quantidade (`delta = importedQty - currentQty`). Cria transação sintética de compra (`buy`) para delta positivo com preço por cota/ação ajustado para derivar exatamente o Preço Médio importado, ou de venda (`sell`) para delta negativo.
  2. **Modelo de Transação & i18n**: Adicionado campo opcional `notes?: string | null` em `Transaction` (`src/lib/transactions.ts`) e chave `csvImportAdjustment` nos 3 dicionários ("Ajuste via importação CSV").
  3. **Testes Automatizados (`src/lib/__tests__/csvImportTransactions.test.ts`)**: Criada suíte validando os 3 cenários obrigatórios (delta de ativo existente, criação de novo ativo com 1ª transação e derivação exata de preço médio).
  4. **Backlog**: `docs/BACKLOG_V2.md` atualizado (Item 1.7 marcado como 🟡 Fase 1 Concluída).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **159 passed** | 4 skipped (27 arquivos de teste aprovados, incluindo `csvImportTransactions.test.ts`).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `783d67b` (`fix(watchlist): migra importacao CSV para transacoes sinteticas alinhando ao SSOT [Item 1.7 Fase 1]`).

---