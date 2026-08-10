### Fix & Governança: Correção dos 19 Erros do `tsc --noEmit` e Inclusão de Gate Obrigatório ✅ CONCLUÍDO E VERIFICADO

- **Grupo A (investingSince em WatchlistItem)**:
  - Adicionado `investingSince: existing?.investingSince ?? Date.now()` em `AddToWatchlistDialog.tsx` e `WatchlistIO.tsx`, `investingSince: Date.now()` em `FixedIncomeWizardSheet.tsx`, e fixtures atualizados em `allocation.test.ts` e `suggestedAllocation.test.ts`.
- **Grupo B (AssetMetrics.bvps)**:
  - Incluído `bvps?: number | null;` na interface `AssetMetrics` em `domain.ts`, visto que é ativamente populado por `apiService.functions.ts` via SEC EDGAR e CVM.
- **Grupo C (Entitlement & Feature Gates)**:
  - Ajustados tipos de `FeatureGatesConfig` e `useFeatureGate.ts` para eliminar incompatibilidades de `string | number | boolean`.
- **Grupo D (Diversos)**:
  - Ajustado `locale` padrão para `Locale` (`"ptBR"`) em `realizedIncome.ts` e `AssetMonthlyDividendChart.tsx`.
  - Corrigida a chamada `pick(hit)` em `AssetForm.tsx` e adicionado `realizedAmount: 0` em `cashflow.test.ts`.
- **Item 12 (Gate Obrigatório de Governança)**:
  - Atualizado `docs/AGENTS.md` (Regra 8) e `skills/fuente-architecture-review/SKILL.md` para exigir a aprovação dos 3 gates (`npx tsc --noEmit`, `npm run test`, `npm run build`). `MANIFEST.json` regravado via `scripts/check.py`.
- **Evidências de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (output completamente limpo).
  2. **`npm run test`**: 136 passed (0 falhas).
  3. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 9.98s) e SSR (251 módulos em 896ms).
  4. **`npm run test:rules`**: 4 passed (Firebase Emulator - Firestore Security Rules).

---