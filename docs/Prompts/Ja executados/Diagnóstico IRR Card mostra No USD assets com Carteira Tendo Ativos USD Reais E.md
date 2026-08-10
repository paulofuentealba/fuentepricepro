### Diagnóstico: IRR Card mostra "No USD assets" com Carteira Tendo Ativos USD Reais ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz Real Encontrada (com Evidência Empirical)**:
  1. **Ausência de Transações Explícitas para Ativos Cadastrados via Watchlist ou Importação Simples de Posição**:
     - Componentes visuais como os cards de resumo e o gráfico "Invested vs. Received" em `cashflow.ts` realizam fallback para a quantidade e preço do item da Watchlist (`item.quantity`) quando a lista `transactions` de `useTransactions()` não possui transações explícitas para aquele ticker.
     - O `PortfolioIrrCard.tsx` filtrava estritamente objetos de transação explícitos (`transactions.filter(...)`). Quando uma carteira continha ativos americanos em carteira (`MSFT`, `O`, `VYM`, `JNJ`) cadastrados via Watchlist sem histórico de compras manuais passadas, `filteredTransactions` retornava array vazio (`[]`), acionando o estado de "No USD assets in this portfolio".
  2. **Sensibilidade a Variações de Ticker**:
     - Variações de caixa/espaço ou falta/presença do sufixo `.SA` entre a transação e o mapa `assetCurrenciesMap` podiam impedir a localização da moeda do ativo.
- **Solução Arquitetural Aplicada**:
  1. **Transações Efetivas (`getEffectiveTransactions` em `src/lib/portfolioIrr.ts`)**:
     - Sintetiza temporariamente uma transação de compra baseline na data `investingSince`/`addedAt` para qualquer ativo da Watchlist com posição aberta (`quantity > 0`) que não possua transações explícitas registradas.
  2. **Classificação Robusta por Ticker (`isUsdAsset` em `src/lib/portfolioIrr.ts`)**:
     - Normaliza tickers e testa contra `assetCurrencies[norm]`, `assetCurrencies[normClean]` e `assetCurrencies["${normClean}.SA"]`.
  3. **Integração no `PortfolioIrrCard.tsx` e `CashFlowCalendar.tsx`**:
     - Ambos os componentes utilizam `getEffectiveTransactions` para garantir cálculo uniforme e alinhado do IRR e dos proventos realizados.
- **Relatório de Dados em Produção**:
  - **Migração no Firestore**: **NÃO É NECESSÁRIA**. A correção reside 100% na camada de computação de domínio do cliente e SSR, preservando intactos todos os documentos e coleções de produção.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **173 passed** | 4 skipped (30 arquivos de teste aprovados, incluindo novo teste de regressão em `portfolioIrr.test.ts`).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `c905e6c` (`fix(cashflow): resolve diagnostico de IRR card com ativos USD em carteira sem transacoes explicitas`).

---