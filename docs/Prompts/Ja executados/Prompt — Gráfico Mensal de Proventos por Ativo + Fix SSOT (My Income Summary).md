### Prompt — Gráfico Mensal de Proventos por Ativo + Fix SSOT ("My Income Summary") ✅

- **Objetivo**: Eliminar a duplicação de lógica de renda recebida em `DividendsHistoryPanel.tsx` consumindo a função SSOT `calculateRealizedIncome`, e integrar um gráfico mensal compacto de proventos no card *My Income Summary*.
- **Implementação Técnica**:
  - **Função Pura `groupRealizedIncomeByMonth` (`realizedIncome.ts`)**: Agrupa `RealizedIncomeEvent[]` por `YYYY-MM`, somando os valores líquidos (`amountNet`). Filtra estritamente eventos futuros com `date > referenceDateStr` (hoje), incluindo proventos com `paymentDateEstimated: true`. Retorna no máximo 12 meses mais recentes com pagamentos efetivos, sem inserção artificial de meses zerados.
  - **Componente `AssetMonthlyDividendChart.tsx`**: Gráfico de barras compacto em Recharts com altura ~140px, cor Emerald (`rgb(16, 185, 129)`), tooltip com valor líquido formatado e suporte a i18n/locales.
  - **Refatoração `DividendsHistoryPanel.tsx`**: Removido o cálculo local bruto. Passou a chamar `calculateRealizedIncome(transactions, dividendEventsMap, assetMetaMap)` para derivar "Last Received", "Past 12 Months" e alimentar o gráfico com valores líquidos (`amountNet`) pós-tributação.
- **Testes Unitários (`realizedIncome.test.ts`)**:
  - `groupRealizedIncomeByMonth`:
    1. Agrupamento correto por mês e soma de `amountNet`, descartando eventos futuros.
    2. Garantia de não preenchimento artificial com zeros para ativos com histórico < 12 meses (2 meses retornam exatamente 2 buckets).
    3. Limitação máxima a 12 meses mais recentes para ativos com longo histórico.
- **Validação**:
  - `npm run test`: **106/106 testes unitários aprovados** em 17 arquivos de teste.
  - `npm run build`: Compilação Client/SSR 100% limpa.

---