# Diagnóstico e Correção: Smart Allocation Vazio & Artefatos Visuais no Cash Flow

> [!NOTE]
> Documentação técnica da investigação ao vivo e correções de causas raízes confirmadas para a alocação inteligente zerada e as riscas vermelhas no gráfico do Cash Flow.

---

## 1. Bug 1: Smart Allocation não mostra sugestão de alocação (Suggested Allocation Vazio)

### 🔍 Causa Raiz Confirmada
1. **Desalinhamento de Estado Assíncrono no Handler**:
   - Ao clicar no botão *"Suggested Allocation"*, `handleSuggestAllocation` em [`SmartAllocation.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/SmartAllocation.tsx) calculava as metas sugeridas e chamava `handleTargetsChange(suggested)`.
   - Em seguida, no mesmo loop de eventos, executava `handleGenerate()`, que verificava `Object.values(targets).reduce(...) !== 100`.
   - Como o estado `targets` do React é assíncrono e ainda mantinha a closure do render anterior (com soma 0 ou diferente de 100), `handleGenerate()` abortava imediatamente sem definir `setGenerated(true)`. O resultado de alocação permaneceu nulo e a UI zerada.
2. **Score Zerado em Estratégias Defensivas**:
   - Em [`allocation.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/allocation.ts), a função `scoreFor` para a estratégia `defensive` retornava `0` caso um ativo não possuísse `paymentMonths` populados ou apresentasse margem de segurança negativa. O filtro `.filter((x) => x.score > 0)` descartava todos os candidatos da carteira, retornando `empty: true`.

### 🛠️ Correção Aplicada
1. **Helper `doGenerate` Direto**:
   - Em `SmartAllocation.tsx`, extraída a função `doGenerate(effectiveTargets)` que recebe o dicionário de metas atualizado diretamente, sem depender da closure de estado estático do React.
2. **Baseline Positivo de Score Defensivo**:
   - Em `allocation.ts`, atualizada a estratégia defensiva para garantir `Math.max(consistency + marginBonus, 0.05)`, assegurando que ativos válidos com proventos nunca sejam descartados com score zero.

---

## 2. Bug 2: Riscas Vermelhas nos Gráficos de Cash Flow

### 🔍 Causa Raiz Confirmada
- **Aliasing Subpixel de Padrão SVG em GPU Chromium**:
  - Em [`CashFlowChart.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/cashflow/CashFlowChart.tsx), a barra `announcedAmount` utilizava `fill="url(#striped)"` configurada com `patternTransform="rotate(45)"`.
  - Em renderizadores Chromium no Windows (com aceleração de hardware GPU), a rotação de 45 graus sobre um padrão fino de 4px gera artefatos de subpixel RGB (fringing), visualizados como riscas/rabiscos vermelhos sobre as barras do gráfico.

### 🛠️ Correção Aplicada
1. **Padrão SVG sem Rotação**:
   - Substituído `patternTransform="rotate(45)"` por um padrão de listras verticais limpas de 6px (`width="6" height="6"` com retângulos de 3px), eliminando o aliasing subpixel e removendo completamente as riscas vermelhas.
2. **Alinhamento de Contraste ("Regra 6 WOW Effect")**:
   - Substituídas as cores hardcoded em `oklch(...)` no gráfico por variáveis do Design System (`hsl(var(--border) / 0.4)` para linhas de grade, `hsl(var(--muted-foreground))` para eixos e rótulos), elevando a nitidez e o contraste visual.

---

## 3. Evidências Literais de Validação

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **150 passed** | 4 skipped (25 arquivos de teste aprovados).
3. **`npm run build`**: Client e SSR compilados com sucesso.
