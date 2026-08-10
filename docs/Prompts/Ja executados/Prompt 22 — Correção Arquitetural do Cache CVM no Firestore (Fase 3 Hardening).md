### Prompt 22 — Correção Arquitetural do Cache CVM no Firestore (Fase 3 Hardening) ✅

- **Problema Diagnosticado**:
  1. `fetchCvmEnrichedFacts` em `src/lib/api/cvm.server.ts` possuía uma checagem `if (typeof window !== "undefined")`, mas rodava em ambiente Node.js server (`createServerFn`), tornando o branch do Firestore código morto e forçando 100% dos dados pro fallback local `cvm_enriched.json`.
  2. O arquivo importava o Client SDK (`firebase/firestore` com IndexedDB localCache), inadequado para Node server.
  3. `firestore.rules` não possuía match explícito para `/enrichedFundamentals/{ticker}`.
  4. `scripts/ingest-cvm.ts` usava Client SDK sem carregar variáveis de ambiente, falhando silenciosamente no catch.

- **Soluções Implementadas**:
  1. **Dependências & Módulo Admin SDK**: Instalação do `firebase-admin`, `dotenv` e `tsx`. Criação de `src/integrations/firebase/admin.ts` exportando `getAdminFirestore()` com guard `isFirebaseAdminConfigured()` (evitando crashes de unhandled gRPC em execuções locais sem ADC).
  2. **Refatoração do `cvm.server.ts`**: Removida a checagem de `window`. Leitura via `firebase-admin` Firestore no servidor Node, com fallback gracioso para o JSON estático `cvm_enriched.json`.
  3. **Atualização do `firestore.rules`**: Adicionada regra explícita `match /enrichedFundamentals/{ticker} { allow read: if true; allow write: if false; }` (leitura pública, escrita restrita ao Admin SDK).
  4. **Atualização do `scripts/ingest-cvm.ts`**: Inclusão de `dotenv/config` e migração da escrita para Admin SDK (`adminDb.collection("enrichedFundamentals").doc(ticker).set(...)`).

- **Evidências de Execução e Verificação**:
  - Testes executados via `npx tsx scratch/test-cvm-server-read.ts` e `scratch/test-cvm-firestore-mock-key.ts`:
    - `BBSE3`: VPA = `5.3489`, LPA = `5.6358`
    - `HGLG11`: Vacância = `3.2785%`
  - Fallback gracioso testado ao simular falha/ausência de credenciais do Firestore.
  - Varredura em `src` confirmando que `enrichedFundamentals` é consumido exclusivamente via `fetchAssetFn` (SSOT mantido).
  - Testes unitários (`npm run test`): 53/53 testes aprovados. Build de produção (`npm run build`) executado com sucesso.

---