### Simplificar Legenda Mensal (Pago/Projetado) e Corrigir Cores do Tooltip Investido vs Recebido ✅ CONCLUÍDO E VERIFICADO

- **Implementação & Ajustes Visuais**:
  1. **Gráfico Mensal — Legenda**: Atualizada a legenda de "Realizado" (`t.tabs.chart.realized`) para **"Pago"** (`t.tabs.chart.confirmed`), reutilizando a chave i18n existente sem criar novas entradas.
  2. **Gráfico Mensal — Tooltip (`CustomTooltip`)**:
     - Removido o agrupamento com sub-itens indentados (`• Realizado`, `• Pago`, `• Provisionado`).
     - Simplificado para 2 linhas diretas e limpas: `Pago` (`text-success` com ícone `CheckCircle`) e `Projetado` (`text-comparison` com ícone `TrendingUp`), renderizando condicionalmente apenas se o valor for `> 0`.
     - Preservados o total do cabeçalho (`effectiveTotal`) e sua regra de cor (`isBest` / `isWorst` / `var(--success)`).
  3. **Gráfico Investido vs. Recebido — Tooltip (`InvestedVsReceivedTooltip`)**:
     - Atualizada a cor do valor de `item.invested` para `text-success` (verde, correspondendo à barra de Investido `COLOR_BAR`).
     - Atualizada a cor do valor de `item.received` para `text-comparison` (azul, correspondendo à barra de Recebido `COLOR_INVESTED`).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **156 passed** | 4 skipped (26 arquivos de teste aprovados).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `0ad5022` (`fix(cashflow): simplifica legenda e tooltip para Pago/Projetado e corrige cores de Investido vs Recebido`).

---