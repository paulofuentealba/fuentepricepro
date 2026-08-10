### Item 13: Investigação e Correção de ETFs e STOCK_US no Cash Flow ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz Diagnosticada**:
  - `src/lib/cashflow.ts` possuía um filtro estático por moeda (`if (it.currency !== currency) continue;`), descartando qualquer ativo em `USD` (`STOCK_US` ou `ETF` em dólar) quando a moeda de exibição era `BRL` (a moeda padrão da aplicação).
  - Em carteiras compostas apenas ou majoritariamente por ativos US, a exibição de Cash Flow ficava com 0 de renda e renderizava o estado vazio (`CashFlowEmptyState`).
  - O motor `cashflow.ts` não possuía suporte a taxa de câmbio (`fxRate`), impossibilitando a consolidação multi-moeda.
- **Solução Implementada**:
  - Criada a função `getFxMultiplier` em `src/lib/cashflow.ts` para converter dinamicamente proventos de `USD` para `BRL` (e vice-versa).
  - Atualizadas as funções `buildMonthlyBuckets` e `computeInvestedVsReceived` para processar e converter ativos em moedas cruzadas.
  - Atualizado `CashFlowCalendar.tsx` para repassar a cotação `fxRate` em tempo real via TanStack Query (`exchangeRateQueryOptions()`).
  - Adicionado teste unitário em `cashflow.test.ts` validando a inclusão e conversão de ETFs e STOCK_US em USD.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **147 passed** | 4 skipped (25 arquivos de teste aprovados).
  3. **`npm run build`**: Client (4097 módulos em 1.54s) e SSR (251 módulos em 908ms) compilados limpos sem avisos.

---