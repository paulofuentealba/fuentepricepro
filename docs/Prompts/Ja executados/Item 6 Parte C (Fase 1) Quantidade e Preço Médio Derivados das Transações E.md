### Item 6 Parte C (Fase 1): Quantidade e Preço Médio Derivados das Transações ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz & O que foi corrigido**:
  - `useValuedPortfolio.ts` lia `item.quantity` e `item.averagePrice` diretamente do objeto do banco de dados (que nem sempre reflete o histórico de transações quando há edições manuais ou múltiplos aportes).
  - Integrado `useTransactions()` e `recalculateHoldingFromTransactions()` em `src/lib/useValuedPortfolio.ts` (SSOT), derivando dinamicamente `quantity` e `averagePrice` a partir das transações.
  - Implementado fallback gracioso: se o ativo não possui transações (posição puramente manual), utiliza `it.quantity` e `it.averagePrice` existentes sem quebrar.
- **Dependency Arrays Verificadas (Reatividade 100% Real-Time)**:
  - `txByTicker`: `useMemo(() => ..., [transactions])`
  - `baseItems`: `useMemo(() => ..., [items, globalYield, txByTicker])`
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **140 passed** | 4 skipped (23 test files passed).
  3. **`npm run build`**: Client (4097 módulos em 1.48s) e SSR (251 módulos em 1.28s) compilados limpos.
  4. **Teste de Integração (TRXF11)**: Teste automatizado em `watchlist.test.ts` comprova que 2 compras de TRXF11 (70 + 30 cotas) derivam exatamente **QTY 100** e Preço Médio R$ 101.50, alinhando "My Position" e "Transactions" em 100% das telas.

---