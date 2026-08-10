### Divergências de Legenda, Terminologia e Cor no Cash Flow ✅ CONCLUÍDO E VERIFICADO

- **Diagnóstico de Causas Raízes & Correções**:
  1. **Divergência 1 (Terminologia do Tooltip vs Legenda)**:
     - **Causa Raiz**: Legenda exibe 2 categorias ("Realizado" e "Projetado"), mas tooltip renderizava até 4 linhas soltas (`Realizado`, `Pago`, `Provisionado`, `Projetado`).
     - **Decisão Tomada (Opção A)**: Tooltip reestruturado em 2 blocos principais alinhados à legenda ("Realizado / Confirmado" e "Projetado"), exibindo o detalhamento fino como sub-itens indentados (`• Realizado`, `• Pago`, `• Provisionado`) apenas se houver mais de uma parcela presente.
  2. **Divergência 2 (Cor do Total no Tooltip)**:
     - **Causa Raiz**: Classe Tailwind `text-success` sofria com especificidade/herança de cor do container `<ChartTooltip>` do Recharts sobre barras de projeção.
     - **Correção**: Aplicada a cor diretamente via `style={{ color: isBest ? "var(--warning)" : isWorst ? "var(--muted-foreground)" : "var(--success)" }}`, garantindo verde constante (`var(--success)`).
  3. **Divergência 3 (Total do Tooltip vs Soma das Linhas)**:
     - **Causa Raiz**: O total do cabeçalho lia a projeção estática `payload[0].payload.amount` (`b.amount`) em vez da soma efetiva dos proventos do mês.
     - **Correção**: Total do mês recalculado dinamicamente no tooltip como `effectiveTotal = realizedConfirmedSum + projectedSum`, garantindo matemática exata.
  4. **Divergência 4 (Cards de Resumo Hardcoded em `CashFlowSummary.tsx`)**:
     - **Causa Raiz**: Ternários `isEn` com strings em PT/EN hardcoded sem i18n/ES e ambiguidade no rótulo "Annual Projected".
     - **Correção**: Criadas as chaves em `tabs.cashflow.summary.*` e `tabs.chart.realizedAndConfirmed` em `dict.ptBR.ts`, `dict.en.ts` e `dict.es.ts`. Rótulo atualizado para "Total Anual (Realizado + Projetado)".
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **155 passed** | 4 skipped (26 arquivos de teste aprovados).
  3. **`npm run build`**: Client e SSR compilados com sucesso.

---