### Camada Compartilhada de Benchmark Histórico (CDI/Selic/IBOV/S&P 500) ✅ CONCLUÍDO E VERIFICADO

- **Confirmação de Séries Oficiais do BCB SGS**:
  - **CDI Diário (% a.d.)**: **Série 12** (`https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados`)
  - **Selic Diária (% a.d.)**: **Série 11** (`https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados`)
  - **IBOVESPA & S&P 500**: Tickers `^BVSP` e `^GSPC` via Yahoo Finance Chart API (`v8/finance/chart/{symbol}`).
- **Implementação & Funcionalidades**:
  1. **Calculadores de Retorno Acumulado (`src/lib/benchmark.ts`)**:
     - `calculateDailyCompoundedReturn`: Composição diária de juros compostos ($F_t = F_{t-1} \times (1 + r_t / 100)$), iniciando em 0% na data base.
     - `calculatePriceCumulativeReturn`: Variação percentual acumulada de preços de fechamento ($((P_t / P_0) - 1) \times 100$).
  2. **Server Function TanStack Start (`fetchBenchmarkHistoryFn`)**:
     - `fetchBenchmarkHistoryFn({ data: { benchmark, fromDate, toDate } })` em `src/lib/apiService.functions.ts`.
     - **Fallback Gracioso**: Retorna array vazio `[]` em caso de erro HTTP ou falha de rede sem interromper a execução nem lançar exceção.
  3. **Query Options (`benchmarkHistoryQueryOptions`)**:
     - `benchmarkHistoryQueryOptions(benchmark, fromDate, toDate)` em `src/lib/queryOptions.ts` com cache `staleTime: 24h` (`86.400.000 ms`).
  4. **Suíte de Testes Automatizados (`src/lib/__tests__/benchmarkHistory.test.ts`)**:
     - Testes unitários para composição de juros diários (3 dias de 0,05% compõem para `0.150075%`), variação de preços (IBOV/SPX) e fallback gracioso em falhas simuladas.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **169 passed** | 4 skipped (29 arquivos de teste aprovados, incluindo `benchmarkHistory.test.ts`).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `ffe6775` (`feat(benchmark): implementa camada compartilhada de dados historicos SSOT`).

---