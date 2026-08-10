### Item 10: Registrar Exportação/Benchmark no Backlog ✅ CONCLUÍDO (APENAS DOCUMENTAÇÃO)


- **Decisão Estratégica de Monetização**:
  - Desligamento de todos os paywalls/cadeados em produção mantendo a arquitetura de entitlement (`SubscriptionProvider`, `useFeatureGate`, `firestore.rules`) 100% preservada.
- **Detalhamento Tecnológico**:
  - **Reversibilidade**: `DEFAULT_FEATURE_GATES` em `featureGates.ts` mantido com os valores originais (`freeAssetLimit: 8`). `DISABLE_PAYWALLS` mantido como `false`.
  - **Atualização Dinâmica no Firestore**: Criado o script `scripts/update-feature-gates-permissive.ts` que atualiza o documento `config/featureGates` no Firestore via Admin SDK (`.set(..., { merge: true })`):
    - Valores Originais: `{ freeAssetLimit: 8 }`
    - Valores Permissivos Aplicados: `{ freeAssetLimit: 999999, cashflowUnlocked: true, smartAllocationUnlocked: true, customTaxUnlocked: true, sliderUnlocked: true, strategiesUnlocked: true }`.
  - **Mapeamento de Usos Diretos de `isPro`**: Mapeados 8 componentes que consultam `isPro` diretamente (`Header`, `SmartAllocation`, `Watchlist`, `Sidebar`, `AssetCard`, `TargetYieldSlider`, `cashflow.tsx`, `smartallocation.tsx`).
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **146 passed** | 4 skipped (25 arquivos de teste aprovados).
  3. **`npm run build`**: Client (4097 módulos em 1.45s) e SSR (251 módulos em 791ms) compilados limpos.

---