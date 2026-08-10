### Fix Crash "Invalid language tag: ptBR" + Consolidação de Locale ✅ CONCLUÍDO E VERIFICADO

- **Contexto**: Relatório de erro de runtime em `TransactionForm.tsx:110` (e `TransactionsPanel.tsx:87`), onde clicar em "Lançar Transação" acionava o `ErrorBoundary` com `RangeError: Invalid language tag: ptBR` vindo de `new Intl.DateTimeFormat(locale, ...)`.
- **Causa Raiz**: O estado da aplicação em `useI18n()` fornece o código interno de idioma `"en" | "ptBR" | "es"`. `Intl.DateTimeFormat` exige uma tag de idioma BCP 47 válida (`"pt-BR"`, `"en-US"`, `"es-ES"`). A ausência de hífen em `"ptBR"` causava `RangeError` imediato em `Intl.DateTimeFormat(locale, ...)`. Adicionalmente, diversos componentes possuíam ternários manuais incompletos (`locale === "en" ? "en-US" : "pt-BR"`) que faziam com que o idioma espanhol (`"es"`) sofresse fallback para o locale brasileiro (`"pt-BR"`).
- **Alterações Realizadas**:
  1. Criada a função pura exportada `toIntlLocale(locale: Locale): string` em `src/lib/formatters.ts`:
     `return locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";`
  2. Re-exportada `toIntlLocale` em `src/lib/i18n.ts`.
  3. Criado arquivo de testes unitários `src/lib/__tests__/formatters.test.ts` cobrindo `toIntlLocale`, `formatPercent` e `formatNumber`.
  4. Atualizadas as chamadas `formatPercent` e `formatNumber` em `src/lib/formatters.ts` para utilizar `toIntlLocale(locale)`.
  5. Atualizadas todas as chamadas cruas de `new Intl.DateTimeFormat(locale, ...)` e `new Intl.NumberFormat(locale, ...)` em todo a aplicação:
     - `src/components/ceiling/watchlist/TransactionForm.tsx:110`
     - `src/components/ceiling/watchlist/TransactionsPanel.tsx:87`
     - `src/components/ceiling/shared/InvestingSinceField.tsx:36, 53`
     - `src/components/ui/CurrencyToggle.tsx:22`
  6. Consolidados todos os ternários parciais em todo a codebase para utilizar `toIntlLocale(locale)`:
     - `src/lib/resultCard.ts:24`
     - `src/lib/realizedIncome.ts:261`
     - `src/components/ceiling/watchlist/AssetMonthlyDividendChart.tsx:18`
     - `src/components/ceiling/GoalPlanner.tsx:47`
     - `src/components/ceiling/SnowballSimulator.tsx:219`
     - `src/components/ceiling/cashflow/CashFlowSummary.tsx:206`
     - `src/components/ceiling/watchlist/AssetDetailSheet.tsx:75`
     - `src/components/ceiling/watchlist/FixedIncomePanel.tsx:39`
     - `src/components/ceiling/watchlist/GoalProgressBar.tsx:35`
     - `src/components/ceiling/watchlist/NextPaymentBanner.tsx:77`
     - `src/components/ceiling/watchlist/assetCard/AssetCardFinancials.tsx:43`
     - `src/components/ceiling/watchlist/utils.ts:12`
- **Evidências de Validação**:

**Output de `npm run test`**:
```
 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro

 ✓ src/lib/__tests__/formatters.test.ts (3 tests) 15ms
 ✓ src/lib/__tests__/nasdaq.test.ts (3 tests) 22ms
 ✓ src/lib/__tests__/portfolioIrr.test.ts (6 tests) 6ms
 ✓ src/lib/__tests__/realizedIncome.test.ts (12 tests) 23ms
 ✓ src/lib/__tests__/calc.test.ts (6 tests) 7ms
 ✓ src/lib/__tests__/dataExport.test.ts (4 tests) 6ms
 ✓ src/lib/__tests__/allocation.test.ts (12 tests) 6ms
 ✓ src/lib/__tests__/suggestedAllocation.test.ts (8 tests) 5ms
 ✓ src/lib/__tests__/cashflow.test.ts (5 tests) 12ms
 ✓ src/lib/__tests__/secEdgar.test.ts (5 tests) 6ms
 ✓ src/lib/__tests__/accountDeletion.test.ts (3 tests) 3ms
 ✓ src/lib/__tests__/investor-profile.test.ts (10 tests) 8ms
 ✓ src/lib/__tests__/classify.test.ts (4 tests) 3ms
 ✓ src/lib/__tests__/fiiPaymentRules.test.ts (6 tests) 4ms
 ✓ src/lib/__tests__/watchlist.test.ts (3 tests) 5ms
 ✓ src/lib/__tests__/br-business-calendar.test.ts (5 tests) 3ms
 ✓ src/lib/__tests__/transactions.test.ts (6 tests) 3ms
 ✓ src/lib/__tests__/cvm.test.ts (3 tests) 3ms
 ✓ src/lib/__tests__/pdf-parser.test.ts (18 tests) 11ms
 ✓ src/lib/__tests__/corporate-events.test.ts (4 tests) 3ms
 ✓ src/lib/__tests__/issuerTickerMappings.test.ts (2 tests) 88ms

 Test Files  21 passed (21)
      Tests  128 passed (128)
   Start at  18:03:16
   Duration  1.94s (transform 1.21s, setup 0ms, import 4.21s, tests 244ms, environment 1.32s)
```

**Output de `npm run build`**:
```
vite v8.1.3 building client environment for production...
transforming...✓ 2344 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 2.48s
vite v8.1.3 building ssr environment for production...
transforming...✓ 250 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 809ms
```

---