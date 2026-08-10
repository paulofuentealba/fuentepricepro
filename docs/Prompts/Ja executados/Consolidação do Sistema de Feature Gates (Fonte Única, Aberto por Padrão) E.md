### Consolidação do Sistema de Feature Gates (Fonte Única, Aberto por Padrão) ✅ CONCLUÍDO E VERIFICADO

- **Decisão Arquitetural e Mudanças**:
  - Removido o switch mestre de código (`DISABLE_PAYWALLS = true`) em `src/lib/featureGates.ts` e `src/lib/subscription.tsx`.
  - `isPro` em `subscription.tsx` passa a refletir estritamente o `tier === "pro"` real do usuário.
  - `DEFAULT_FEATURE_GATES` em `featureGates.ts` atualizado para padrão aberto (fail-open: `freeAssetLimit: Infinity`, `cashflowUnlocked: true`, `smartAllocationUnlocked: true`, `customTaxUnlocked: true`, `sliderUnlocked: true`, `strategiesUnlocked: true`).
  - O documento `config/featureGates` no Firestore permanece a única fonte de verdade para bloqueios granulares sem necessidade de novos deploys.
- **Distinções Mapeadas de Consumidores `isPro`**:
  - **`Header.tsx` & `Sidebar.tsx` (User Profile Badges)**: Mantidos lendo `isPro` (tier real da assinatura) como indicativos visuais informativos de conta ("Pro" vs "Free"), não como bloqueios de acesso.
  - **Locks de Navegação & Feature Gates**: Migrados para consultar as flags de gates correspondentes via `useFeatureGate(key)`.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **150 passed** | 4 skipped (25 arquivos de teste aprovados).
  3. **`npm run build`**: Client e SSR compilados com sucesso.

---