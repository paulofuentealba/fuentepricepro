### Adição de Testes Unitários Faltantes para `formatYahooTicker` ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Criado o arquivo exclusivo de testes unitários `src/lib/__tests__/formatYahooTicker.test.ts` cobrindo 100% dos 5 cenários obrigatórios solicitados para a função `formatYahooTicker`.
- **Casos de Teste Verificados**:
  1. `PETR4` -> `PETR4.SA` (Anexa sufixo `.SA` para ativos B3).
  2. `PETR4.SA` / `vale3.sa` -> `PETR4.SA` / `VALE3.SA` (Não duplica sufixo `.SA`).
  3. `AAPL` / `MSFT` / `^GSPC` -> `AAPL` / `MSFT` / `^GSPC` (Preserva ativos US e símbolos de índice).
  4. `" aapl "` -> `AAPL` (Normaliza caixa alta e remove espaços).
  5. `""` / `null` / `undefined` -> `""` (Retorna string vazia sem lançar exceções).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **178 passed** | 4 skipped (30 suítes de teste ativas aprovadas, incluindo `formatYahooTicker.test.ts` com 5 testes).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `ce6f114` (`test(api): adiciona arquivo exclusivo de teste unitario para formatYahooTicker`).

---