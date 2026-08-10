### Segmentar IRR Card por Moeda (CDI+Selic / S&P 500) ✅ CONCLUÍDO E VERIFICADO

- **Implementação & Funcionalidades**:
  1. **Filtro por Moeda em Cashflows (`src/lib/portfolioIrr.ts`)**:
     - `buildCashFlowsFromPortfolio` atualizada com o parâmetro `targetCurrency?: Currency | null`.
     - Filtra transações e eventos de proventos por moeda (`BRL` ou `USD`) e desativa conversão cambial (`rate = 1`) para rentabilidade em moeda nativa.
  2. **Função Pura de Anualização `annualizeReturn` (`src/lib/benchmark.ts`)**:
     - Anualiza o retorno acumulado por juros compostos: `((1 + cumulativeReturnPct / 100) ^ (365 / days) - 1) * 100`.
     - Isolado em `benchmark.ts` para segurança de import em componentes Client, enquanto fetchers assíncronos residem em `benchmark.server.ts`.
  3. **Reformulação do `PortfolioIrrCard.tsx`**:
     - **Toggle BRL**: Grid de 3 blocos (`IRR (BRL)`, `CDI`, `Selic`). Badge de diferença principal comparado contra o **CDI**.
     - **Toggle USD**: Grid de 2 blocos (`IRR (USD)`, `S&P 500`). Badge de diferença comparado contra o **S&P 500**.
     - **Estado Vazio**: Card limpo com ícone `Percent` e mensagem contextualizada quando não há ativos na moeda selecionada.
  4. **Chaves de Tradução i18n (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`)**:
     - `cdiBenchmark`: `"Benchmark (CDI)"` (PT/EN) / `"Referencia (CDI)"` (ES)
     - `spxBenchmark`: `"Benchmark (S&P 500)"` (PT/EN) / `"Referencia (S&P 500)"` (ES)
     - `irrBrlLabel`: `"IRR (BRL)"` (PT/EN) / `"TIR (BRL)"` (ES)
     - `irrUsdLabel`: `"IRR (USD)"` (PT/EN) / `"TIR (USD)"` (ES)
     - `irrEmptyStateTitle`: `"Sem ativos em {{currency}} nesta carteira"` (PT) / `"No {{currency}} assets in this portfolio"` (EN) / `"Sin activos en {{currency}} en este portafolio"` (ES)
     - `irrEmptyStateDesc`: `"Adicione transações de ativos denominados em {{currency}} para calcular o IRR nesta moeda."` (PT) / `"Add transactions for {{currency}} assets to calculate the IRR in this currency."` (EN) / `"Añada transacciones de activos en {{currency}} para calcular la TIR en esta moneda."` (ES)
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **172 passed** | 4 skipped (30 arquivos de teste aprovados).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `e1504f1` (`feat(cashflow): segmenta IRR card por moeda (CDI/Selic para BRL e SP500 para USD)`).

---