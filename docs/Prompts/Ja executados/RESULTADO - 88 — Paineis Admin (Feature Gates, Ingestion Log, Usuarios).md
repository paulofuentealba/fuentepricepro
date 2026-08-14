# RESULTADO — 88 — Painéis do `/admin` (Feature Gates, Ingestion Log, Usuários)

## Escopo executado

### `createServerFn`s (`src/lib/api/admin.ts`)
- `getFeatureGatesFn` — lê `config/featureGates` via Admin SDK, fallback `DEFAULT_FEATURE_GATES`.
- `updateFeatureGatesFn` — merge em `config/featureGates`; valida o payload contra um allow-list estrito (`KNOWN_FEATURE_GATE_KEYS`, derivado de `FeatureGatesConfig`) e o tipo por campo (`freeAssetLimit` número ≥ 0; demais booleanos). Chave desconhecida ou tipo errado → `Error("400: ...")`, sem gravar nada.
- `getIngestionLogFn` — coleção `ingestionLog`, `orderBy("updatedAt","desc").limit(30)`, filtrado em memória para as últimas 48h.
- `listUsersFn` — paginado via `adminAuth.listUsers(pageSize, pageToken)` (máx. 50/página), cruzado com `getAll()` em lote no Firestore só para `subscriptionStatus`.

**Nota de arquitetura:** o arquivo foi nomeado `admin.ts`, não `admin.server.ts`, mesmo contendo só `createServerFn`s — mesmo padrão de `apiService.functions.ts`. O plugin `import-protection` do TanStack Start bloqueia qualquer import direto de um arquivo `*.server.*` a partir do cliente, e os 3 componentes de UI precisam chamar essas funções diretamente. Os módulos genuinamente server-only (`requireAdmin.server.ts`, `integrations/firebase/admin.ts`) mantiveram o sufixo e só são importados de dentro de `.server.ts`/`admin.ts`, nunca do cliente — confirmado quebrando o build antes da correção e passando depois (`npm run build`).

### Minimização de dado — `listUsersFn`
- Campos retornados: **exatamente** `displayName`, `email`, `subscriptionStatus`, `createdAt`, `lastLoginAt`, `providerId` — **sem `uid`** (leitura literal do prompt: "somente os campos" lista 6, `uid` não está entre eles).
- Montagem extraída para função pura `mapAuthUserToAdminRow()`, testada em `admin.test.ts` com um mock que também carrega `phoneNumber`/`customClaims` — o teste falha se qualquer campo extra vazar (`Object.keys(row)` tem que bater exatamente com os 6, `not.toHaveProperty("uid")` etc.).
- Paginação real via `adminAuth.listUsers(pageSize, pageToken)` — nunca lê a base inteira numa chamada.
- **Decisão registrada:** os 5 campos de identidade (`displayName`, `email`, `createdAt`, `lastLoginAt`, `providerId`) vivem no Firebase Auth, não no documento `users/{uid}` (que hoje só grava `subscriptionStatus` + dados de portfólio). Por isso `listUsersFn` usa `adminAuth.listUsers()` como fonte primária desses campos, cruzando com Firestore apenas para `subscriptionStatus`, em vez de ler literalmente só `users/{uid}` — o contrato de saída (6 campos, nada além) foi mantido.

### UI — 3 abas em `/admin`
- **Feature Gates** (`FeatureGatesTab.tsx`): `Switch`/`Slider` do Radix já existentes no projeto; slider de `freeAssetLimit` (faixa 1–50); botão "Salvar" com toast `sonner`; estado otimista com rollback para o último estado confirmado pelo servidor se a gravação falhar.
- **Ingestion Log** (`IngestionLogTab.tsx`): tabela com badges de status. Adicionadas variantes `success`/`warning` ao `Badge` já existente (`src/components/ui/badge.tsx`), reaproveitando os tokens `--success`/`--warning` já definidos em `styles.css` — nenhum componente de badge novo criado.
- **Usuários** (`UsersTab.tsx`): tabela 100% leitura, busca client-side por nome/email sobre os dados já paginados, botão "Carregar mais".
- **Custos de Nuvem** (`CloudCostsCard.tsx`, item 2.4): card estático, sem fetch, só link para `https://console.cloud.google.com/billing`.
- Tokens do design system em todas as abas — zero cor/hex hardcoded.
- Mobile-first: `IngestionLogTab`/`UsersTab` alternam tabela (`hidden md:block`) por cards empilhados (`md:hidden`) abaixo de 768px.
- i18n: nova seção `admin.*` nos 3 dicionários (`dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts`), com `satisfies typeof en` garantindo paridade estrutural (tsc falha se faltar/sobrar chave).

Item 2.3 (aba "Guarda de Acesso") **não implementado**, conforme instrução explícita do prompt.

### `requireAdmin.server.ts` — ajuste necessário
A assinatura original dependia de `Request` bruto, indisponível dentro de `.handler()` de `createServerFn` neste projeto (sem `getWebRequest()` em uso em nenhum outro lugar). Refatorada para aceitar `idToken: string` diretamente — cliente obtém via `user.getIdToken()` (`useAdminIdToken()`), enviado como campo validado de cada `createServerFn`. Validação 401/403 e checagem do custom claim `isAdmin` preservadas integralmente. Não havia nenhum caller de `requireAdmin` antes deste prompt — refactor não quebrou nada existente (confirmado por teste dedicado).

## Testes adicionados
- `src/lib/api/__tests__/requireAdmin.server.test.ts` — 4 casos (sem token → 401; sem claim → 403; token inválido → 401; token de admin válido → resolve).
- `src/lib/api/__tests__/admin.test.ts` — 7 casos para `validateFeatureGatesPayload` + 3 casos para `mapAuthUserToAdminRow` (shape exato de 6 campos).

## Gate de saída
1. `npx tsc --noEmit` — 0 erros nos arquivos deste prompt. Há 2 erros pré-existentes e não relacionados (`HorizonteHero.tsx:262`, `MobileBottomNav.tsx:18`), em arquivos não tocados aqui — fora de escopo.
2. `npx vitest run` — **335 testes passados**, 9 pulados, 0 falhas.
3. `npm run build` — build limpo (incluindo a checagem do `import-protection` que originalmente pegou o problema descrito acima).
4. **Teste manual das 3 abas logado como admin — parcialmente bloqueado.** Este ambiente não tem credenciais do Firebase Admin SDK configuradas nem conta com custom claim `isAdmin: true`. Não foi possível abrir o Network tab e inspecionar o payload real de `listUsersFn` (verificação pedida explicitamente no prompt), nem confirmar persistência real dos toggles/slider após reload, nem confirmar que o Ingestion Log mostra dado real. O que foi verificado: `npm run build` limpo e `/admin` redireciona corretamente para `/` quando deslogado (sem erro de console, testado no navegador). A minimização de campos está garantida por TypeScript (`AdminUserRow` só declara os 6 campos) e por teste automatizado que falha se algum campo extra aparecer.
   **Ação pendente para Paulo:** repetir esse passo com login real de admin + Network tab antes de considerar o item 2.1 100% validado em produção.
5. Cobertura i18n: 3 dicionários, paridade garantida por `satisfies typeof en`. Mobile 375px: `IngestionLogTab`/`UsersTab` usam cards empilhados abaixo de `md`; `FeatureGatesTab` é coluna única (sem tabela).

## Decisões registradas (não silenciosas)
- Renomeação `admin.server.ts` → `admin.ts`, necessária para o build (import-protection).
- `listUsersFn` usa `adminAuth.listUsers()` + Firestore só para `subscriptionStatus`, em vez de ler somente `users/{uid}`.
- Faixa do slider `freeAssetLimit` ampliada de 3–20 (protótipo de referência) para 1–50.
- Item 2.3 e expansão dos campos de `listUsersFn`: não implementados, conforme proibições explícitas do prompt.
