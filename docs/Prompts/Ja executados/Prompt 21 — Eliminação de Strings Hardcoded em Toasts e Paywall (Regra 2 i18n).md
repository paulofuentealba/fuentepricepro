### Prompt 21 — Eliminação de Strings Hardcoded em Toasts e Paywall (Regra 2 i18n) ✅

- **Objetivo**: Eliminar todas as chamadas de `toast.*` e textos de Paywall que continham strings em texto puro (violação da Regra 2 do `AGENTS.md`), integrando-as nos dicionários i18n (`dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts`).
- **Chaves de i18n Adicionadas/Atualizadas**:
  - **`toasts`**: `assetSaved`, `assetRemoved`, `watchlistCleared`, `imageGenerated`, `mockDataRestored`, `emptyWatchlist`, `exportSuccess`, `exportFailed`, `noValidRowsCsv`, `importComplete`, `importFailed`, `importAdded`, `importUpdated`, `importFailedCount`, `noChanges`, `assetsUpdatedCount`, `adjustAllocationTarget100`.
  - **`errors`**: `copyFailed`, `imageGenerationFailed`, `syncFailedPrefix`, `saveAssetFailedPrefix`, `deleteAssetFailedPrefix`, `clearAssetsFailedPrefix`, `saveBatchFailedPrefix`, `updateAssetFailedPrefix`.
  - **`authModal`**: `welcomeBack`, `authFailed`, `signInFailed`, `googleSignInFailed`.
  - **`smartAllocation`**: `paywallTitle`, `paywallDesc`.
- **Arquivos Refatorados**:
  - `src/components/shared/AssetCard.tsx` (toasts de cópia e geração/compartilhamento de imagem com fallback corrigido).
  - `src/components/ceiling/watchlist/DataManagement.tsx` (restauração de dados mock).
  - `src/components/ceiling/watchlist/WatchlistIO.tsx` (toasts de exportação/importação CSV com interpolação de contagem).
  - `src/components/ceiling/watchlist/WatchlistTable.tsx` (toast de atualização em massa).
  - `src/components/ceiling/SmartAllocation.tsx` (alerta de alocação 100% e PaywallDialog).
  - `src/lib/watchlist.ts` (mutações de save, delete, clear, batch e sync).
  - `src/lib/auth-modal.tsx` & `src/routes/auth.tsx` (termos de uso e callbacks de auth).
- **Varredura Final**: Varredura por `toast.(error|success|warning|info)("[^"]{4,}"` em `src` retornou **0 ocorrências**.
- **Validação**: Testes totais (53/53) e build de produção SSR/Client executados com 100% de sucesso.

---