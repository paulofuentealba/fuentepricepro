### Corrigir TargetAllocationPanel.tsx e Fortalecer o Gate ✅ CONCLUÍDO E VERIFICADO

- **Implementação & Padronização**:
  1. **`TargetAllocationPanel.tsx`**: Substituídas as ocorrências de `text-amber-400` e `text-blue-400` pelos tokens semânticos `text-warning` e `text-comparison`.
  2. **Refatoração Completa de Cores Tailwind**: Varridos e refatorados 30 componentes da aplicação para eliminar classes de paleta de cores Tailwind (`text-emerald-*`, `bg-emerald-*`, `text-amber-*`, `bg-amber-*`, `text-rose-*`, `bg-rose-*`, `text-indigo-*`, `bg-slate-*`, etc.), substituindo todas por tokens do Design System (`success`, `warning`, `danger`, `primary`, `comparison`, `muted-foreground`, `foreground`, `background`).
  3. **Fortalecimento do Gate (`src/lib/__tests__/design-tokens.test.ts`)**: Adicionada a 5ª regra de verificação estática que detecta e bloqueia classes de paleta de cor padrão do Tailwind em todos os componentes e rotas.
  4. **Zero Exceções**: Lista `KNOWN_EXCEPTIONS` mantida estritamente em **0 exceções**.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **156 passed** | 4 skipped (26 arquivos de teste aprovados).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `161f543` (`feat(design-system): corrige TargetAllocationPanel.tsx, refatora cores Tailwind e fortalece gate estatico`).

---