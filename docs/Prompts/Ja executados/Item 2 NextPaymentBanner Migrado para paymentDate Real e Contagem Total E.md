### Item 2: NextPaymentBanner Migrado para paymentDate Real e Contagem Total ✅ CONCLUÍDO E VERIFICADO

- **Investigação Empírica de Dados Reais de API**:
  - **Brapi API**: No plano gratuito sem token (ou fora dos 4 tickers de teste), requisições com `dividends=true` retornam HTTP 403 `FEATURE_NOT_AVAILABLE` ("Seu plano não tem acesso a dados de dividendos"). Além disso, os parâmetros `range=5y&interval=1mo` retornavam HTTP 400 `INVALID_RANGE` / `INVALID_INTERVAL`.
  - **Yahoo Finance API (Fallback Canônico do Projeto)**: Retorna os eventos reais de dividendos em `KNCR11.SA` com status HTTP 200. Dados reais obtidos:
    - `2026-08-03`: R$ 1,25 (Ex-date / data-com em 03/08/2026)
    - `2026-07-01`: R$ 1,10
    - `2026-06-01`: R$ 1,10
  - **Dados de Ativos no Brapi (PETR4, VALE3, ITUB4)**:
    - **ITUB4**: Data-com `2026-07-31` (já passada), Pagamento `2026-09-01` (futuro, R$ 0,018182 JCP). *Pela regra antiga baseada em exDate, ITUB4 era descartado. Pela nova regra baseada em paymentDate, ITUB4 é exibido normalmente.*
    - **PETR4**: Data-com `2026-06-01` (há 2 meses), Pagamento `2026-08-20` (em 12 dias, R$ 0,35048637 JCP). *Pela regra antiga, PETR4 era descartado. Pela nova regra, PETR4 é exibido.*
    - **VALE3**: Data-com `2026-08-11`, Pagamento `2026-09-02` (R$ 1,5687 JCP + R$ 0,4620 Dividendo).
- **Implementação**:
  1. **`WatchlistKpiSection.tsx`**: Constrói `dividendEventsMap` em paralelo via `useQueries(assetQueryOptions)` com cache do TanStack Query (`staleTime = 5min`). Passa para `NextPaymentBanner`.
  2. **`NextPaymentBanner.tsx`**: Filtra eventos onde `paymentDate > now` (em vez de `exDividendDate`). Utiliza o valor real declarado por cota (`amountPerShare`). Se não houver data de pagamento futura, utiliza o fallback com flag `isEstimated: true` e selo `(est.)`.
  3. **Rótulo Dinâmico com Contagem Total**: Se houver mais de 4 pagamentos futuros, exibe os 4 mais próximos e ajusta o cabeçalho para `"4 de {{total}} Próximos Pagamentos"` via i18n (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`).
  4. **Deduplicação de Múltiplos Eventos Futuros por Ticker**: Refatorado `computeUpcomingPayments` para filtrar e ordenar eventos com `paymentDate > now`, selecionando estritamente **apenas o evento de pagamento mais próximo por ticker** (evitando duplicatas de ativos como PETR4 com múltiplos pagamentos anunciados).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **142 passed** | 4 skipped (24 test files passed). Inclui novo arquivo de testes `nextPaymentBanner.test.ts` validando a seleção única do evento mais próximo.
  3. **`npm run build`**: Client (4097 módulos em 1.49s) e SSR (251 módulos em 1.33s) compilados limpos.

---