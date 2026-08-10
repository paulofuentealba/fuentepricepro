### Prompt 14 — Refino do fluxo "Update Holdings" + consolidação do campo Investing Since ✅

- **Componente Único `InvestingSinceField.tsx`**: Criado componente compartilhado em `src/components/ceiling/shared/InvestingSinceField.tsx`.
- **Modo Read-Only Automático**: Quando o ativo possui transações lançadas (`firstTransactionDate != null`), o campo `investingSince` é exibido em formato estático `mmm/yyyy` com um `InfoTooltip` indicando `t.form.investingSinceReadOnlyHint` ("Data do primeiro lançamento"). Em ativos sem transações, mantém o Popover+Calendar editável.
- **Substituição de Implementações Duplicadas**: `EditItemDialog.tsx` e `AssetDetailSheet.tsx` (`AssetHoldings`) refatorados para utilizar o componente único e a mesma lógica SSOT de filtro de transações do ticker (`transactions.filter(tx => tx.ticker === item.ticker)`).
- **Ajustes de UI/i18n**:
  - `form.avgPrice`: Atualizado de `"Average price (optional)"` para `"Average price"` em EN, `"Preço médio"` em PT-BR e `"Precio medio"` em ES.
  - `form.investingSinceReadOnlyHint`: Adicionado nos 3 dicionários.
  - `transactions.add`: Atualizado de `"Log Transaction"` para `"Add Transaction"` (EN) e `"Agregar Transacción"` (ES).
  - Em `EditItemDialog.tsx`, removido o parágrafo `<p>` fixo abaixo do preço médio e substituído por `InfoTooltip` ao lado do Label quando houver transações.
- **Validação e Build**: Testes unitários (41/41) e build Vite production concluídos com sucesso.

---