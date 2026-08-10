### UI/i18n: Reposicionamento, Padronização e Nomenclatura do Botão "Add to My Portfolio" ✅ CONCLUÍDO E VERIFICADO

- **Motivação & Decisão de UX**:
  - Reposicionamento do CTA de adição para o topo do `AssetCard` (logo abaixo da seção de Preço Atual), aplicando o estilo padronizado primário verde esmeralda (`variant="default"`), e atualizando a nomenclatura de "Add to Watchlist" para "Add to My Portfolio" / "Adicionar à Minha Carteira".
- **Alterações**:
  - `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`:
    - Chaves `t.watchlist.addBtn` e `t.watchlist.addTitle` atualizadas para `"Adicionar à Minha Carteira"` (PT) / `"Add to My Portfolio"` (EN) / `"Añadir a Mi Portafolio"` (ES).
  - `src/components/ceiling/AddToWatchlistDialog.tsx`:
    - Botão gatilho alterado de `variant="secondary"` para `variant="default"` (usando o estilo esmeralda padronizado com texto branco e sombra de elevação).
  - `src/components/shared/AssetCard.tsx`:
    - Removido o botão no rodapé do `SearchVariant` e reposicionado no `CardHeader`, na coluna da direita logo abaixo do Preço Atual.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.33s) e SSR (251 módulos em 795ms).

---