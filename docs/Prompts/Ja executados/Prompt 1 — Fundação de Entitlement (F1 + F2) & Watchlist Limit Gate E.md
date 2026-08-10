### Prompt 1 — Fundação de Entitlement (F1 + F2) & Watchlist Limit Gate ✅ CONCLUÍDO E VERIFICADO

- **Contexto**: Correção dos achados críticos F1 (`isPro: true` hardcoded em `src/lib/subscription.tsx`) e F2 (ausência de módulo centralizado de `FEATURE_GATES`). Separação arquitetural entre **Entitlement do Usuário** (`users/{uid}.subscriptionStatus`) e **Configuração do Gate** (`config/featureGates`), com Firestore `onSnapshot` em tempo real.
- **Arquivos Criados/Alterados**:
  1. `src/lib/subscription.tsx` (Reescrito): Lê `users/{uid}.subscriptionStatus` via `onSnapshot`. Fail-safe: `subscriptionStatus !== 'pro'` ou guests -> `'free'`. `isPro` deriva de `tier === 'pro'`.
  2. `src/lib/featureGates.ts` (Novo): Hook `useFeatureGates()` (lê `config/featureGates` em tempo real com fallback para `DEFAULT_FEATURE_GATES = { freeAssetLimit: 8 }`) e função pura `resolveFeatureGate(tier, gatesConfig, key)`.
  3. `src/lib/useFeatureGate.ts` (Novo): Hook único e público de consumo que combina `useSubscription()` e `useFeatureGates()` via `resolveFeatureGate`.
  4. `firestore.rules` (Atualizado): Adicionada regra para `match /config/featureGates` (`allow read: if request.auth != null; allow write: if false;`).
  5. `scripts/seed-feature-gates.ts` (Novo): Script idempotente via Firebase Admin SDK para popular o doc `config/featureGates`.
  6. `src/lib/__tests__/featureGates.test.ts` (Novo): Testes unitários para `resolveFeatureGate` (8 testes passando).
  7. `src/components/ceiling/AddToWatchlistDialog.tsx` (Atualizado): Substituído limite hardcoded `5` por `useFeatureGate('freeAssetLimit')` e adicionadas chaves de i18n traduzidas com interpolação `{{limit}}`.
  8. `dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (Atualizados): Atualizada a chave `limitReachedDesc` nos 3 dicionários para utilizar `{{limit}}` dinâmico.

- **Evidências de Validação**:

**Output de `npm run test`**:
```
 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro

 ✓ src/lib/__tests__/formatters.test.ts (3 tests) 17ms
 ✓ src/lib/__tests__/investor-profile.test.ts (10 tests) 3ms
 ✓ src/lib/__tests__/realizedIncome.test.ts (12 tests) 24ms
 ✓ src/lib/__tests__/nasdaq.test.ts (3 tests) 20ms
 ✓ src/lib/__tests__/calc.test.ts (6 tests) 3ms
 ✓ src/lib/__tests__/secEdgar.test.ts (5 tests) 4ms
 ✓ src/lib/__tests__/dataExport.test.ts (4 tests) 5ms
 ✓ src/lib/__tests__/portfolioIrr.test.ts (6 tests) 7ms
 ✓ src/lib/__tests__/cashflow.test.ts (5 tests) 12ms
 ✓ src/lib/__tests__/allocation.test.ts (12 tests) 6ms
 ✓ src/lib/__tests__/suggestedAllocation.test.ts (8 tests) 10ms
 ✓ src/lib/__tests__/watchlist.test.ts (3 tests) 3ms
 ✓ src/lib/__tests__/fiiPaymentRules.test.ts (6 tests) 4ms
 ✓ src/lib/__tests__/br-business-calendar.test.ts (5 tests) 4ms
 ✓ src/lib/__tests__/classify.test.ts (4 tests) 6ms
 ✓ src/lib/__tests__/accountDeletion.test.ts (3 tests) 6ms
 ✓ src/lib/__tests__/transactions.test.ts (6 tests) 3ms
 ✓ src/lib/__tests__/featureGates.test.ts (8 tests) 6ms
 ✓ src/lib/__tests__/cvm.test.ts (3 tests) 3ms
 ✓ src/lib/__tests__/corporate-events.test.ts (4 tests) 4ms
 ✓ src/lib/__tests__/pdf-parser.test.ts (18 tests) 10ms
 ✓ src/lib/__tests__/issuerTickerMappings.test.ts (2 tests) 86ms

 Test Files  22 passed (22)
      Tests  136 passed (136)
   Start at  20:58:56
   Duration  2.48s
```

**Output de `npm run build`**:
```
vite v8.1.3 building client environment for production...
transforming...✓ 2344 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 2.40s
vite v8.1.3 building ssr environment for production...
transforming...✓ 252 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 716ms
```

---