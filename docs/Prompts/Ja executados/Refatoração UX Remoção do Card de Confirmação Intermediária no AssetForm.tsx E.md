### Refatoração UX: Remoção do Card de Confirmação Intermediária no `AssetForm.tsx` ✅ CONCLUÍDO E VERIFICADO

- **Motivação & Decisão de UX**:
  - Alinhamento de produto: ao pesquisar um ativo e clicar sobre ele (ou pressionar Enter), o fluxo do aplicativo deve exibir **imediatamente** as informações do ativo e o card de valuation (`AssetCard`), sem exigir uma etapa intermediária de confirmação com botões "Cancelar" / "Concluído" nem prompt de data.
- **Alterações**:
  - `src/components/ceiling/AssetForm.tsx`:
    - Removida a tela/card de confirmação intermediária (`confirmHit` e `if (confirmHit) { return ... }`).
    - Ao selecionar um ativo na busca (`pick(hit)`), o formulário define a seleção (`setSelected(hit)`), fecha a lista suspensa e dispara `onSubmit` instantaneamente com os dados do ativo e `investingSince: Date.now()`.
  - `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`:
    - Atualizada a chave `confirmDesc` para um texto genérico de confirmação nos 3 idiomas.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.45s) e SSR (251 módulos em 1.17s).

---