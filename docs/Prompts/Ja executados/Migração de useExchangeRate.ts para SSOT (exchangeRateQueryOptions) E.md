### Migração de `useExchangeRate.ts` para SSOT (`exchangeRateQueryOptions`) ✅ CONCLUÍDO E VERIFICADO

- **Contexto**: Migração do hook órfão `useExchangeRate.ts` (que chamava a API da AwesomeAPI diretamente do client) para a SSOT `exchangeRateQueryOptions()` (`fetchExchangeRatesFn` via Yahoo `BRL=X`, fallback `{ USDBRL: 5.5 }`).
- **Busca Textual Obrigatória (`grep_search`)**:
  A busca por `useExchangeRate` em `src/` revelou 5 componentes consumidores:
  1. `src/components/ceiling/Watchlist.tsx`
  2. `src/components/ceiling/FIProgressCard.tsx`
  3. `src/components/ceiling/SmartAllocation.tsx`
  4. `src/components/ceiling/watchlist/AllocationChart.tsx`
  5. `src/components/ui/CurrencyToggle.tsx`
- **Output Literal do Comando de Verificação Final (`grep_search`)**:
  ```text
  No results found
  ```
- **Ajuste em `CurrencyToggle.tsx`**:
  - Utilizado `dataUpdatedAt` exposto pelo `useQuery(exchangeRateQueryOptions())` para formatar a hora da cotação (`cotação de HH:MM`) via `Intl.DateTimeFormat(toIntlLocale(locale), { hour: "2-digit", minute: "2-digit" })`, eliminando o parsing manual frágil de strings.
- **Deleção**:
  - Arquivo `src/lib/useExchangeRate.ts` removido do repositório com 0 dependências restantes.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped test file para emulator).
  2. **`npm run build`**: Compilação limpa do cliente (4098 módulos) e SSR (251 módulos).

---