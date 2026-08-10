### Fix Crítico de Segurança: `subscriptionStatus` Gravável pelo Client ✅ CONCLUÍDO, VERIFICADO COM EMULATOR E DEPLOYADO

- **Contexto & Causa Raiz**: A regra pré-existente `allow read, write: if request.auth != null && request.auth.uid == userId;` em `match /users/{userId}` permitia escrita irrestrita pelo client em todos os campos do documento `users/{uid}`, permitindo que qualquer usuário autenticado executasse `updateDoc(doc(db, "users", uid), { subscriptionStatus: "pro" })` diretamente via console do navegador e se concedesse Pro gratuitamente.
- **Correção Aplicada (`firestore.rules`)**:
  - Separados os fluxos de `allow create`, `allow update`, `allow delete` e `allow read`.
  - `allow create`: Proíbe expressamente a presença de `subscriptionStatus` ou `stripeCustomerId` no primeiro `setDoc` do client no cadastro.
  - `allow update`: Valida via `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscriptionStatus', 'stripeCustomerId'])` para impedir que o client altere ou adicione esses campos.
  - `allow delete` / `allow read`: Preservados para `request.auth.uid == userId`.
- **Setup de Infraestrutura de Teste de Regras**:
  - Instalado `@firebase/rules-unit-testing` como `devDependency`.
  - Configurado `firebase.json` com bloco `emulators` (`firestore` porta 8080).
  - Adicionado script `"test:rules": "npx firebase-tools emulators:exec --only firestore \"vitest run src/lib/__tests__/firestoreRules.test.ts\""` no `package.json`.
  - Criada a suíte `src/lib/__tests__/firestoreRules.test.ts` (executada exclusivamente via `test:rules`, ignorada no `npm run test` padrão).

- **Evidências de Validação Comportamental**:

1. **`npm run test:rules` (4 testes executados contra o Firestore Emulator)**:
```text
i  Running script: vitest run src/lib/__tests__/firestoreRules.test.ts

 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro

 ✓ src/lib/__tests__/firestoreRules.test.ts (4 tests) 2474ms
     ✓ 1. DENIES authenticated client updateDoc adding or updating subscriptionStatus or stripeCustomerId  1006ms
     ✓ 2. ALLOWS authenticated client updating legitimate fields (settings, investorProfile, issuerTickerMappings)
     ✓ 3. ALLOWS initial account creation without protected fields, but DENIES creation with subscriptionStatus or stripeCustomerId
     ✓ 4. ALLOWS Admin SDK context (rules disabled) to read and write subscriptionStatus and stripeCustomerId

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:50:22
   Duration  3.65s (transform 44ms, setup 0ms, import 1.01s, tests 2.47s, environment 0ms)

+  Script exited successfully (code 0)
```

2. **`npm run test` (Suíte Padrão de Testes de Unidade, sem emulator)**:
```text
 Test Files  22 passed | 1 skipped (23)
      Tests  136 passed | 4 skipped (140)
   Start at  21:50:33
   Duration  2.26s
```

3. **`npm run build` (Compilação Limpa)**:
```text
vite v8.1.3 building client environment for production...
✓ 2344 modules transformed.
✓ built in 3.19s
vite v8.1.3 building ssr environment for production...
✓ 252 modules transformed.
✓ built in 1.74s
```

4. **Deploy Real em Produção (`npx firebase-tools deploy --only firestore:rules`)**:
```text
=== Deploying to 'fuente-price-pro'...

i  deploying firestore
i  firestore: ensuring required API firestore.googleapis.com is enabled...
+  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
+  firestore: released rules firestore.rules to cloud.firestore

+  Deploy complete!
```

---