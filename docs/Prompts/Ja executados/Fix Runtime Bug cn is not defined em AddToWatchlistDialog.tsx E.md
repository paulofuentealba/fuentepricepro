### Fix Runtime Bug: `cn is not defined` em `AddToWatchlistDialog.tsx` ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz**:
  - No refactor de padronização do botão, a função `cn` foi utilizada em `AddToWatchlistDialog.tsx` (`className={cn("gap-2", buttonClassName)}`), porém a importação `import { cn } from "@/lib/utils";` não estava presente no topo do arquivo. Isso gerava um erro de execução JavaScript (`ReferenceError: cn is not defined`), fazendo com que o `ErrorBoundary` capturasse a exceção e exibisse a mensagem `"Data unavailable. Please try again later."` ao buscar qualquer ativo (ex: `VALE3`).
- **Solução**:
  - Adicionada a importação `import { cn } from "@/lib/utils";` em `src/components/ceiling/AddToWatchlistDialog.tsx`.
- **Evidências de Validação**:
  1. **`npx tsc --noEmit`**: Erros de `cn` zerados.
  2. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  3. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 3.60s) e SSR (251 módulos em 2.05s).

---