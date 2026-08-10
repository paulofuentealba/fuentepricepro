### Unificar Todos os Inputs de Data no Padrão Calendar com Dropdown ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Unificados os 4 campos de seleção de data do sistema (`TransactionForm`, `InvestingSinceField`, `startDate` e `maturityDate` no `FixedIncomeWizardSheet`) para utilizarem o padrão `Popover` + `Calendar` com `captionLayout="dropdown"`.
- **Decisão Arquitetural**: Criado o componente compartilhado `DatePicker` em `src/components/ui/date-picker.tsx` para evitar a duplicação de estrutura por campo, padronizar o parsing/formatação de datas de/para formato local ISO `"YYYY-MM-DD"`, tratar fuso horário sem inconsistências e aceitar intervalos predefinidos de navegação (`rangeMode="past"` para até 15 anos atrás ou `rangeMode="future"` para até 40 anos no futuro para vencimento de títulos de Renda Fixa).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **184 passed** | 4 skipped (31 suítes de teste aprovadas).
  3. **`npm run build`**: Client e SSR compilados com sucesso.