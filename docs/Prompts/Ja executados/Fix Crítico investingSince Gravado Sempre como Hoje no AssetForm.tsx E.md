### Fix Crítico: `investingSince` Gravado Sempre como "Hoje" no `AssetForm.tsx` ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz**:
  - `src/components/ceiling/AssetForm.tsx` prometia um seletor de data na descrição da modal de confirmação de cadastro de ativo (`t.form.confirmDesc`), porém nenhum seletor era renderizado.
  - O clique no botão "Concluído" (`Done`) gravava `investingSince: Date.now()` hardcoded, atribuindo a data de hoje como início de investimento para qualquer novo ativo adicionado via este fluxo.
- **Alterações**:
  - `src/components/ceiling/AssetForm.tsx`:
    - Importado o componente reutilizável `InvestingSinceField` de `@/components/ceiling/shared/InvestingSinceField`.
    - Adicionado estado local `investingSinceDate` inicializado com `Date.now()`.
    - Renderizado `<InvestingSinceField value={investingSinceDate} onChange={(d) => setInvestingSinceDate(d.getTime())} firstTransactionDate={null} className="w-full" />` no bloco de confirmação de cadastro.
    - Atualizada a submissão para enviar `investingSince: investingSinceDate` selecionado pelo usuário.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.33s) e SSR (251 módulos em 852ms).

---