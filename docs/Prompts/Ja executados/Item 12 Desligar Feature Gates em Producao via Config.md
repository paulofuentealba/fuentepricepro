# Item 12: Desligamento dos Feature Gates via Firestore Config (Entitlement Intacto)

> [!NOTE]
> Relatório de execução do ajuste estratégico de monetização: os gates foram desligados dinamicamente via documento `config/featureGates` no Firestore com limite permissivo (`freeAssetLimit: 999999` e flags booleanas destravadas), sem alterar o fallback do código (`DEFAULT_FEATURE_GATES`) ou o modelo de regras de segurança (`firestore.rules`).

---

## 1. Mapeamento Completo de Usos do Entitlement na Aplicação

### A. Consumo via `useFeatureGate` (Padrão Recomendado)
- [`AddToWatchlistDialog.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/AddToWatchlistDialog.tsx): `useFeatureGate("freeAssetLimit")` lê o limite dinâmico do Firestore.

### B. Mapeamento de Usos Diretos de `useSubscription()` / `isPro` (Observação Arquitetural)
Identificados 8 componentes que consultam `isPro` diretamente da subscrição do usuário:
1. [`Header.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/Header.tsx): Renderiza badge visual `PRO`.
2. [`SmartAllocation.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/SmartAllocation.tsx): Consulta `isPro` para exibir ou ocultar `LockedPanel` nas estratégias.
3. [`Watchlist.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/Watchlist.tsx): Consulta `isPro` para exibição do banner promocional.
4. [`Sidebar.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/layout/Sidebar.tsx): Exibe ou oculta ícones com selo de cadeado/PRO.
5. [`AssetCard.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/shared/AssetCard.tsx): Desbloqueia formulário de alíquota customizada de JCP/WHT.
6. [`TargetYieldSlider.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ui/TargetYieldSlider.tsx): Desbloqueia alteração manual do slider de Yield-Alvo.
7. [`cashflow.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/routes/app/cashflow.tsx): Guarda de rota para Cash Flow.
8. [`smartallocation.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/routes/app/smartallocation.tsx): Guarda de rota para Smart Allocation.

---

## 2. Estrutura de Dados e Reversibilidade no Firestore

### A. Valores de Configuração
- **Valores Originais de Fallback (Mantidos em `DEFAULT_FEATURE_GATES` em `featureGates.ts`)**:
  ```ts
  {
    freeAssetLimit: 8
  }
  ```
- **Valores Permissivos Aplicados em `config/featureGates` no Firestore**:
  ```json
  {
    "freeAssetLimit": 999999,
    "cashflowUnlocked": true,
    "smartAllocationUnlocked": true,
    "customTaxUnlocked": true,
    "sliderUnlocked": true,
    "strategiesUnlocked": true
  }
  ```

### B. Script Idempotente de Atualização
- Criado o script [`scripts/update-feature-gates-permissive.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/scripts/update-feature-gates-permissive.ts) utilizando o Firebase Admin SDK (`getAdminFirestore()`). O script executa a atualização via `.set(..., { merge: true })`, preservando dados existentes e garantindo reversibilidade sem necessidade de deploy.

---

## 3. Preservação da Arquitetura e Segurança

1. **`firestore.rules`**: Permanece 100% intacto, impedindo qualquer modificação client-side em `subscriptionStatus` ou `config/featureGates`.
2. **`DEFAULT_FEATURE_GATES`**: Mantido com `freeAssetLimit: 8` como fallback nativo do código.
3. **Reversibilidade**: Caso o modelo de monetização seja reativado no futuro, basta reverter o documento `config/featureGates` via Admin SDK para `freeAssetLimit: 8` instantaneamente.

---

## 4. Evidências Literais de Validação

> [!TIP]
> Executados e aprovados com sucesso todos os 3 gates de qualidade.

1. **`npx tsc --noEmit`**: **0 erros** (Exit Code 0).
2. **`npm run test`**: **146 passed** | 4 skipped (25 arquivos de teste aprovados).
3. **`npm run build`**: Client (4097 módulos em 1.45s) e SSR (251 módulos em 791ms) compilados limpos.
