# RESULTADO — 92 — Corrigir regra do Firestore que bloqueia `config/featureGates` para usuários reais

## 1. Diff exato de `firestore.rules`

```diff
     match /config/featureGates {
-      allow read: if request.auth != null && request.auth.token.isAdmin == true;
-      allow write: if false; // só via Admin SDK (Firebase Functions/server), nunca client
+      // Leitura pública: é configuração de produto (flags/limites), não dado pessoal —
+      // useFeatureGates() é lido por TODO usuário, inclusive convidado (ver
+      // src/lib/featureGates.ts). Restringir a admin fazia todo mundo cair em
+      // permission-denied e nunca ler o valor real gravado pelo painel Admin.
+      allow read: if true;
+      allow write: if false; // só via Admin SDK (Firebase Functions/server), nunca client — nem admin
     }
```

`allow write: if false;` mantido exatamente como estava — nenhuma mudança na superfície de escrita.

## 2. Lista completa de `match /config/*` (item c da Seção 3 do prompt)

Grep completo em `firestore.rules` por `match /config/`: **apenas um resultado**, o próprio `config/featureGates` (linha 35). Não existe nenhum outro documento sob `config/*` no arquivo — nada mais precisava (ou precisa) desta mudança.

## 3. Teste de Segurança Obrigatório — os 4 casos, via emulador real

`npm run test:rules` (Firestore Emulator real, não mock) — output literal:

```
 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro/.claude/worktrees/fuente-price-pro-prompts-7f0385

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  10:57:41
   Duration  4.65s
+ Script exited successfully (code 0)
```

Os 4 casos pedidos, implementados em `src/lib/__tests__/firestoreRules.test.ts`:

1. **Deslogado consegue ler** → teste `5b` — `unauthenticatedContext()` → `assertSucceeds(getDoc(...))` — passou.
2. **Autenticado não-admin consegue ler** → testes `5` e `9` (reescritos: antes esperavam `assertFails`, agora `assertSucceeds`, refletindo o novo comportamento) — passou.
3. **Autenticado não-admin tentando escrever → falha** → teste novo `5c` — `assertFails(setDoc(...))` — passou.
4. **Admin tentando escrever via client SDK → também falha** → teste novo `5d` — `assertFails(setDoc(...))` mesmo com `isAdmin: true` — passou. Este comportamento (write bloqueado até para admin, só Admin SDK grava) já era o desenho original do Prompt 87/88 (a UI do painel Admin chama `updateFeatureGatesFn`, um `createServerFn` que usa o Admin SDK no servidor, nunca `setDoc` direto do client) — não houve conflito a sinalizar.

Teste `6` (admin lê com `isAdmin: true`) permanece válido trivialmente sob a nova regra pública.

## 4. Gates de Verificação Final — output literal

```
$ npx tsc --noEmit
src/components/horizonte/HorizonteHero.tsx(262,66): error TS2554: Expected 1 arguments, but got 2.
src/components/layout/MobileBottomNav.tsx(18,61): error TS2339: Property 'calculator' does not exist on type '{...}'.
```
2 erros pré-existentes, não relacionados a esta mudança (arquivos não tocados neste prompt — confirmado via `git status`, ambos já existiam antes desta sessão).

```
$ npm run test
 Test Files  50 passed | 1 skipped (51)
      Tests  340 passed | 12 skipped (352)
```
(`firestoreRules.test.ts` roda `describe.runIf(FIRESTORE_EMULATOR_HOST)` — pulado aqui porque essa env var só é setada por `test:rules`, não por `test` puro; os 12 testes desse arquivo já foram confirmados passando separadamente na Seção 3.)

```
$ npm run test:rules
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

```
$ npm run build
✓ built in 1.19s
```

**Os 4 comandos rodaram, sem exceção, sem contorno.**

## 5. Pontos de Atenção respondidos

- **Exposição de flags a visitante não-autenticado:** aceito, conforme o prompt — são flags de produto (`freeAssetLimit`, `cashflowUnlocked`, `smartAllocationUnlocked`, `customTaxUnlocked`, `sliderUnlocked`, `strategiesUnlocked`, todos definidos em `DEFAULT_FEATURE_GATES` / `FeatureGatesConfig` em `src/lib/featureGates.ts`), não segredo de negócio. **Confirmando para Paulo:** esses são os únicos campos hoje declarados no tipo — se um campo sensível for adicionado a esse mesmo documento no futuro, a regra precisa ser revisada de novo (registrado aqui como lembrete, não como ação desta rodada).
- **Outro `config/*` com a mesma trava:** confirmado — não existe (Seção 2).
- **Cobertura deslogado + logado:** os 4 casos da Seção 4 do prompt foram implementados, não só 2.

## 6. Governança de Roles (Regra 9)

Aplicado exatamente como o prompt definiu: `fuente-architecture-review`, `fuente-solution-architect`, `fuente-advogado-lgpd-gdpr` (config de produto, sensibilidade comum, sem consentimento adicional exigido), `fuente-product-manager`. Não aplicados, pelos mesmos motivos já listados no prompt: `fuente-ux-designer`, `fuente-investidor-iniciante`, `fuente-investidor-profissional`, `fuente-business-architect`, `fuente-product-marketing`.

## 7. Entregável

Commit `fix(firestore): allow public read on config/featureGates [Auditoria UX 1.2]`, push para `dev`. Não mergeado em `main` — aguardando aprovação de Paulo conforme instrução do prompt.
