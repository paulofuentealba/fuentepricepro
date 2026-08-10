### Fix: Badge de Concentração com Rótulo Errado (Colisão Semântica) ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz**:
  - `src/components/shared/AssetCard.tsx` utilizava a chave `t.smartAllocation.concentrationViolation` ("Acima do teto" / "Above ceiling") para indicar alerta de alta concentração de carteira, gerando colisão semântica com o veredito de valuation de preço (preço acima do preço teto).
  - O badge utilizava `position: absolute left-2 top-2 z-20` com fundo vermelho `bg-danger/90`, sobrepondo o ticker do ativo e competindo visualmente com o badge de veredito de valuation.
- **Auditoria de Usos de `concentrationViolation`**:
  - Busca textual confirmou que `concentrationViolation` era utilizada exclusivamente neste badge. A chave original foi mantida intacta nos 3 dicionários para usos de preço teto.
- **Alterações**:
  1. `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`: adicionada chave nova `smartAllocation.concentrationLimitBadge` ("Concentração alta" em PT/ES, "High concentration" em EN).
  2. `src/components/shared/AssetCard.tsx`:
     - Removido o badge absoluto do canto superior esquerdo e alterada a borda de destaque ao violar limite para tom âmbar (`border-amber-500/60 ring-1 ring-amber-500/30`).
     - Passado a prop `isConcentrationViolated` para o componente `<AssetCardTags />`.
  3. `src/components/ceiling/watchlist/assetCard/AssetCardTags.tsx`:
     - Renderizada a nova pill de concentração em tom âmbar (`bg-amber-500/10 text-amber-400 ring-amber-500/30`) no fluxo natural flex das tags do card, com ícone `ShieldAlert`.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos) e SSR (251 módulos).

---