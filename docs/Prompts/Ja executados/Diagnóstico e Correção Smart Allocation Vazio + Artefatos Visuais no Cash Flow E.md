### Diagnóstico e Correção: Smart Allocation Vazio + Artefatos Visuais no Cash Flow ✅ CONCLUÍDO E VERIFICADO

- **Causas Raízes Identificadas e Corrigidas**:
  1. **Bug 1 (Smart Allocation Vazio)**:
     - **Causa Raiz**: O manipulador `handleSuggestAllocation` disparava `handleGenerate()` de forma síncrona no mesmo evento, avaliando a closure de estado estático `targets` (que tinha soma 0 antes da renderização do React). `handleGenerate()` abortava imediatamente sem definir `setGenerated(true)`. Além disso, a estratégia defensiva zerava o score de ativos com margem negativa ou sem histórico de meses de pagamento, descartando todos os candidatos em `.filter((x) => x.score > 0)`.
     - **Correção**: Criado o helper `doGenerate(effectiveTargets)` em `SmartAllocation.tsx` que utiliza as metas recém-calculadas diretamente. Adicionado baseline positivo `Math.max(..., 0.05)` no score defensivo em `allocation.ts`.
  2. **Bug 2 (Riscas Vermelhas no Cash Flow)**:
     - **Causa Raiz**: O padrão SVG `#striped` possuía `patternTransform="rotate(45)"`, causando aliasing de subpixel RGB (fringing) no renderizador Chromium em GPUs Windows. As cores hardcoded em `oklch(...)` também apresentavam baixo contraste.
     - **Correção**: Substituído o padrão por listras verticais limpas sem rotação em `CashFlowChart.tsx`. Atualizadas as cores de grid e eixos para os tokens do Design System (`hsl(var(--border) / 0.4)` e `hsl(var(--muted-foreground))`).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **150 passed** | 4 skipped (25 arquivos de teste aprovados).
  3. **`npm run build`**: Client e SSR compilados com sucesso.

---