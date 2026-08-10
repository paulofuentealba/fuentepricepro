### Desenho de Solução: Design System Unificado de Cores (SSOT) ✅ CONCLUÍDO E VERIFICADO

- **Implementação & Padronização**:
  - Criado e registrado o token `--realized` (`oklch(0.68 0.19 160)`) em `src/styles.css` para métricas de proventos pagos/efetivados.
  - Varridos e migrados todos os componentes da aplicação para consultar exclusivamente tokens semânticos nomeados (`--primary`, `--success`, `--comparison`, `--warning`, `--danger`, `--muted-foreground`, `--border`).
  - Eliminados wrappers sintaticamente inválidos de `hsl(var(--token-oklch))` e valores inline de `oklch(...)` ou `rgb/rgba/hex` em componentes e gráficos.
- **Gate Estático Automatizado (`src/lib/__tests__/design-tokens.test.ts`)**:
  - Implementado teste estático que roda dentro do `npm run test` e valida 100% dos arquivos `.tsx` em `src/components/` e `src/routes/`.
  - Garante ausência de wrappers inválidos `hsl()`, impede `oklch()` hardcoded fora de `styles.css` e bloqueia `rgb/rgba/hex` inline em gráficos Recharts.
  - Lista de exceções do teste zerada (0 exceções).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **154 passed** | 4 skipped (26 arquivos de teste aprovados, incluindo `design-tokens.test.ts`).
  3. **`npm run build`**: Client e SSR compilados com sucesso.

---