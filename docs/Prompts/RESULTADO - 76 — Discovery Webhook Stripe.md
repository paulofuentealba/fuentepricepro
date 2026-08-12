# RESULTADO - 76 — Discovery: Webhook Stripe (Idempotente, Server-Side)

**Status: discovery concluído, aguardando revisão/decisão de Paulo. Nada foi implementado nesta rodada — nenhum arquivo de código foi criado ou alterado.**

## 0. Fundação existente (investigada no repo real)

- `src/lib/subscription.tsx` — `SubscriptionProvider` lê `users/{uid}.subscriptionStatus`
  via `onSnapshot` (client SDK), expõe `tier: "free" | "pro"`. Fail-safe: qualquer valor
  != `"pro"` cai em `"free"`. Fallback do hook `useSubscription()` fora de um Provider
  retorna `isPro: true` (usado em contexto de storybook/teste, não em produção real).
- `src/lib/featureGates.ts` — `FeatureGatesConfig` lido de `config/featureGates`
  (Firestore, global, não por usuário). Hoje todos os gates estão abertos por padrão
  em produção (decisão de produto documentada na SSOT Seção 5).
- `src/lib/useFeatureGate.ts` — hook público único (`useFeatureGate(key)`), combina
  `tier` (por usuário) + `gates` (global) via `resolveFeatureGate`. Componentes nunca
  devem chamar `useSubscription()`/`useFeatureGates()` diretamente.
- `src/integrations/firebase/admin.ts` — Firebase Admin SDK já existe e já é usado
  server-side (`getAdminFirestore()`), com detecção de ambiente Cloud Run via
  `K_SERVICE`/`GOOGLE_CLOUD_PROJECT`/`GCP_PROJECT` e suporte a
  `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON inline ou path de arquivo). **Este é o cliente
  Firestore que o webhook deve usar** — nunca o client SDK (`src/integrations/firebase/client.ts`),
  que roda sob as Firestore Security Rules do usuário e não tem permissão de escrever
  `subscriptionStatus` (ver regra a seguir).
- `src/lib/apiService.functions.ts` — padrão real de `createServerFn` já em uso no
  projeto (TanStack Start / `@tanstack/react-start`), com `.validator()` +
  `.handler(async ({ data }) => ...)`. O webhook deve seguir o mesmo padrão de arquivo
  (`*.server.ts` em `src/lib/api/`), mas com uma ressalva importante coberta na Seção 1.
- Regra de negócio já declarada na SSOT (Seção 5): "Escrita de tier reservada para rota
  server-side (webhook Stripe), nunca client SDK." As Firestore Security Rules (não lidas
  neste discovery em detalhe, mas referenciadas em `src/lib/__tests__/firestoreRules.test.ts`)
  devem já negar (ou devem ser ajustadas para negar) escrita de `subscriptionStatus`/`tier`
  a partir do client — isso é responsabilidade do webhook + Admin SDK, que ignora as
  regras de segurança do client.
- **Confirmado por busca no repositório inteiro**: nenhuma ocorrência de
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `sk_test_`, `sk_live_` ou `whsec_` em
  nenhum arquivo (código, `.env.example`, docs, configs). Não há nenhum resquício de
  chave de teste hardcoded. `.env.example` ainda não tem placeholder para variáveis
  Stripe (a acrescentar na implementação real).
- Precedente de gestão de segredo server-side já existe: `RESEND_API_KEY` é citado
  explicitamente no `Dockerfile` como "server-side runtime secret... configurado
  diretamente no Cloud Run service (env var ou Secret Manager), não embutido na
  imagem." Esse é o padrão que o Stripe deve seguir.

## 1. Endpoint / `createServerFn` e verificação de assinatura

### Por que `createServerFn` sozinho não é suficiente aqui

O padrão `createServerFn` do TanStack Start existente no projeto (`apiService.functions.ts`)
é pensado para chamadas RPC vindas do próprio client da aplicação (o `.validator()` recebe
um objeto JS já desserializado). O webhook do Stripe é diferente em um ponto crítico: a
verificação de assinatura (`stripe.webhooks.constructEvent`) **exige o corpo bruto (raw
body) da requisição como string/Buffer, byte a byte, antes de qualquer parsing JSON**. Se o
framework já desserializou o body para JSON antes de chegar no handler (o que
`createServerFn` provavelmente faz via seu pipeline de serialização RPC), a assinatura não
bate e a verificação falha sempre.

**Recomendação de desenho**: expor o webhook como uma rota de API "crua" fora do mecanismo
RPC do `createServerFn` — no TanStack Start isso é uma **Server Route** (arquivo de rota
com `export const Route = createFileRoute(...)` usando `server: { handlers: { POST: ... } }`,
ou, dependendo da versão do framework, um handler Nitro/H3 dedicado em algo como
`src/routes/api/webhooks/stripe.ts`). O ponto inegociável: o handler precisa de acesso ao
raw body antes de qualquer `JSON.parse` automático. Isso deve ser confirmado contra a
versão exata de `@tanstack/react-start`/Nitro em uso no projeto durante a implementação
(não confirmado neste discovery — é o primeiro item a validar tecnicamente antes de
escrever código).

### Fluxo do endpoint

1. Recebe `POST /api/webhooks/stripe` com header `stripe-signature` e raw body.
2. Chama `stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET)`.
   Se lançar exceção (assinatura inválida, secret errado, payload adulterado, timestamp
   fora da tolerância) → responde `400` imediatamente, **não processa nada**, loga a
   tentativa (sem dados sensíveis) para monitoramento de abuso.
3. Nunca confia em nenhum campo do payload (`event.data.object...`) antes desse passo 2
   ter sucesso. Esse é o ponto de segurança central: sem a verificação, qualquer request
   HTTP externo poderia forjar um `checkout.session.completed` e se auto-promover a Pro.
4. Segue para a checagem de idempotência (Seção 2).
5. Roda no runtime Node.js do Cloud Run (não em edge/serverless sem acesso a
   `firebase-admin`), usando `getAdminFirestore()` já existente em `admin.ts`.
6. Responde `200` rapidamente (Stripe espera resposta em poucos segundos; processamento
   pesado, se necessário, deveria ser desacoplado — mas o volume esperado aqui é uma
   escrita simples de documento Firestore, então processar inline é aceitável).

## 2. Idempotência por Event ID

Nova coleção: `processedStripeEvents/{eventId}` (usar diretamente `event.id`, formato
`evt_...` do Stripe, como ID do documento).

Ordem de operações dentro do handler, após a assinatura ser validada:

1. **Checar primeiro**: `db.collection("processedStripeEvents").doc(event.id).get()`.
   Se o documento já existe → responder `200` imediatamente, sem reprocessar (idempotência
   pura — Stripe reenvia webhooks em caso de timeout ou erro 5xx anterior, isso é esperado,
   não uma anomalia).
2. **Gravar o marcador antes de processar o efeito colateral** (o passo mais importante do
   desenho, conforme pedido no prompt): usar uma transação Firestore ou, no mínimo,
   `set()` do marcador com um campo `status: "processing"` antes de tocar em
   `users/{uid}`, e depois atualizar para `status: "done"` ao final. Isso evita a janela de
   corrida onde dois retries simultâneos do mesmo evento (Stripe pode reenviar em paralelo
   sob certas condições) processam o efeito duas vezes. Alternativa mais simples e robusta:
   envolver a leitura do marcador + escrita do marcador + escrita em `users/{uid}` em uma
   **única transação Firestore** (`runTransaction`), garantindo atomicidade real —
   recomendado sobre a versão em dois passos.
3. Documento armazena: `eventId`, `type` (tipo do evento Stripe), `receivedAt`
   (timestamp), `uid` afetado (quando resolvido), `status`. Retenção: não há necessidade de
   TTL agressivo — dados pequenos, úteis para auditoria/debug de disputas de cobrança;
   decisão de TTL fica para a implementação (ex: 1 ano via Firestore TTL policy).

## 3. Mapeamento de eventos Stripe → estado de entitlement

Campos propostos em `users/{uid}`:

- `subscriptionStatus`: `"free" | "pro" | "past_due"` — hoje o código só reconhece `"pro"`
  vs. qualquer-outra-coisa-vira-free (`subscription.tsx` linha 47). **Isso é uma decisão de
  produto pendente**: se `"past_due"` for introduzido como estado intermediário, o
  fail-safe atual do `SubscriptionProvider` (`status === "pro" ? "pro" : "free"`) já o trata
  como Free automaticamente — o que é seguro, mas significa que, sem alterar
  `subscription.tsx`, não há como dar um "período de graça" com acesso Pro mantido durante
  `past_due`. Ver decisão proposta abaixo.
- `stripeCustomerId`: string, vínculo permanente Stripe ↔ Firestore (Seção 5).
- `stripeSubscriptionId`: string, id da assinatura ativa (para consultas futuras/portal do
  cliente).
- `subscriptionCurrentPeriodEnd`: timestamp, útil para UI ("sua assinatura renova em X").
- `pastDueSince`: timestamp, gravado quando entra em `past_due`, usado para calcular a
  janela de graça.

### Máquina de estados proposta

```
                 checkout.session.completed
                 (assinatura criada/paga)
    [free] ─────────────────────────────────────▶ [pro]
                                                     │
                              invoice.payment_failed │
                                                     ▼
                                              [past_due]
                                            (mantém acesso Pro
                                             durante janela de graça)
                                                     │
                        ┌────────────────────────────┼─────────────────────────┐
                        │ pagamento recuperado        │ janela de graça expira   │
                        │ (invoice paga OU              │ (job/checagem, OU        │
                        │  subscription.updated          │  subscription.updated   │
                        │  status volta a "active")      │  status = "unpaid"/     │
                        ▼                              │  "canceled")             │
                     [pro]                              ▼                        │
                                                      [free]                      │
                                                                                   │
                 customer.subscription.deleted                                   │
                 (cancelamento, imediato ou fim do ciclo)                        │
    [pro] / [past_due] ──────────────────────────────────────────────────────▶ [free]
```

### Evento a evento

| Evento Stripe | Ação em `users/{uid}` |
|---|---|
| `checkout.session.completed` | Resolve `uid` via `client_reference_id`/`metadata.uid` (Seção 5). Grava `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus = "pro"`, `subscriptionCurrentPeriodEnd`. Este é o evento de "conversão" — a origem da verdade de que o pagamento inicial foi concluído (não usar `checkout.session.completed` para renovações, é um evento único de criação de sessão). |
| `customer.subscription.updated` | Evento mais genérico — dispara em qualquer mudança da assinatura (renovação, mudança de plano, `cancel_at_period_end`, reativação). Ler `event.data.object.status` do Stripe (`active`, `past_due`, `canceled`, `unpaid`, `trialing`, etc.) e mapear: `active`/`trialing` → `"pro"` (limpa `pastDueSince` se existir); `past_due` → `"past_due"` (grava `pastDueSince` se ainda não gravado); `canceled`/`unpaid` → `"free"`. Buscar `uid` via `stripeCustomerId` armazenado (não via metadata, que só existe no Checkout Session). |
| `customer.subscription.deleted` | Cancelamento definitivo (fim do ciclo ou imediato, dependendo de como a assinatura foi cancelada). Grava `subscriptionStatus = "free"` incondicionalmente — este evento é uma decisão final do Stripe, não deve ser suavizado por janela de graça. |
| `invoice.payment_failed` | Grava `subscriptionStatus = "past_due"` e `pastDueSince = now()` **apenas se ainda não estiver em `past_due`** (não resetar o relógio da graça a cada tentativa de retry automático do Stripe dentro do mesmo ciclo de cobrança falho). Não rebaixa para Free diretamente — decisão de produto proposta abaixo. |

### Janela de graça — proposta a decidir por Paulo

Stripe já tem sua própria lógica de retry de cobrança (Smart Retries, configurável no
Dashboard, tipicamente algumas tentativas ao longo de ~2 semanas antes de marcar a
assinatura como `unpaid`/cancelada). Duas opções de desenho:

- **Opção A (recomendada, mais simples)**: confiar inteiramente no relógio de retry do
  Stripe. `past_due` mantém acesso Pro até o Stripe decidir (via `customer.subscription.updated`
  com `status: "canceled"`/`"unpaid"`, ou `customer.subscription.deleted`) que a assinatura
  morreu — nesse ponto o webhook rebaixa para Free. Não exige job/cron adicional no lado do
  Fuente Price Pro; a "janela de graça" é inteiramente a configuração de Smart Retries do
  Stripe Dashboard.
- **Opção B (mais controle, mais complexidade)**: Fuente Price Pro define sua própria janela
  fixa (ex: 3 ou 7 dias) a partir de `pastDueSince`, independente do que o Stripe decidir, e
  um job periódico (Cloud Scheduler → Cloud Run endpoint, ou Cloud Function agendada)
  rebaixa para Free quem passou da janela e ainda está `past_due`. Motivo para considerar:
  não depender de o Stripe reenviar o webhook certo no momento certo; desvantagem: mais uma
  peça de infraestrutura (scheduler) e mais uma fonte de verdade sobre "quanto tempo é
  aceitável".

**Este discovery não decide entre A e B — fica para revisão de Paulo.** Opção A é o ponto de
partida mais simples e é o que a maioria dos SaaS pequenos usa antes de precisar de mais
controle.

## 4. Gestão de segredos

- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` devem ser variáveis de ambiente do serviço
  Cloud Run (via `gcloud run deploy --set-env-vars` ou, preferencialmente, via Secret
  Manager + `--set-secrets`, dado que são credenciais de pagamento, um nível acima em
  sensibilidade do que `RESEND_API_KEY`). **Nunca** copiadas para dentro da imagem Docker —
  mesmo padrão já documentado no `Dockerfile` para `RESEND_API_KEY` ("No .env is copied into
  the image on purpose... must be configured directly on the Cloud Run service").
- `STRIPE_SECRET_KEY` só é necessária se a criação da Checkout Session também acontecer
  server-side neste projeto (ver Seção 5) — não deve nunca ser exposta como `VITE_`-prefixed
  (isso a inlinaria no bundle client, catastrófico).
- `STRIPE_WEBHOOK_SECRET` é específica por endpoint configurado no Stripe Dashboard (ou via
  Stripe CLI para testes locais, que gera um secret diferente do de produção) — importante
  não confundir o secret de teste local com o de produção durante a implementação.
- **Confirmado nesta rodada**: busca por `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `sk_test_`, `sk_live_`, `whsec_` em todo o repositório não retornou nenhuma ocorrência
  além deste próprio documento de discovery e do prompt 76 original. Nenhum resquício de
  chave hardcoded existe hoje.
- `.env.example` deve ganhar, na implementação real, placeholders comentados
  (`# STRIPE_SECRET_KEY=`, `# STRIPE_WEBHOOK_SECRET=`) seguindo o padrão já usado para
  `BRAPI_TOKEN`/`RESEND_API_KEY` (comentado, com explicação do efeito de não configurar).

## 5. Vínculo `uid` ↔ `stripeCustomerId`

### Lado 1 — criação da Checkout Session (ainda não existe no repo, a construir)

Ao criar a sessão (`stripe.checkout.sessions.create(...)`), server-side (não pode ser
client-side, pois exige `STRIPE_SECRET_KEY`):

- Setar `client_reference_id: uid` (forma mais simples e nativa do Stripe para este caso) **e
  também** `metadata: { uid }` na própria sessão, por redundância — `client_reference_id` é o
  campo canônico documentado pelo Stripe para esse propósito, mas `metadata.uid` sobrevive
  de forma mais confiável em alguns webhooks derivados (ex: se for necessário ler `uid` a
  partir de um evento de `invoice` que carrega metadata copiada da subscription, dependendo
  de como a subscription foi criada). Gravar nos dois lugares custa nada e remove
  ambiguidade.
- Também é recomendável, no momento da criação da sessão, já resolver se este `uid` já tem
  um `stripeCustomerId` conhecido em `users/{uid}` (de uma tentativa anterior) e passar
  `customer: existingStripeCustomerId` para reaproveitar o Customer object do Stripe em vez
  de criar um novo a cada checkout — evita duplicar clientes no Stripe Dashboard para o
  mesmo usuário.
- O `uid` aqui vem da sessão de autenticação Firebase do usuário logado (mesmo `user.uid` já
  usado em `SubscriptionProvider`/`useAuth()`) — a rota que cria a Checkout Session precisa
  verificar que o usuário está autenticado (token Firebase Auth válido) antes de gerar a
  sessão, para não permitir que alguém crie uma sessão de checkout em nome de um `uid`
  arbitrário.

### Lado 2 — processamento do webhook de volta

- Em `checkout.session.completed`: `event.data.object.client_reference_id` (ou
  `event.data.object.metadata.uid` como fallback) dá o `uid` diretamente. Este é o único
  evento em que o `uid` está disponível de graça no payload — todos os eventos subsequentes
  (`customer.subscription.updated/deleted`, `invoice.payment_failed`) não carregam `uid`
  Firestore nenhum, só `customer` (o `stripeCustomerId`).
- Por isso é essencial que `checkout.session.completed` grave `stripeCustomerId` em
  `users/{uid}` **antes** de qualquer evento de subscription chegar — na prática isso é
  garantido pela ordem natural do fluxo Stripe (a Checkout Session é concluída antes de
  qualquer evento de ciclo de vida da subscription existir), mas o desenho deve ser robusto
  a fora-de-ordem: se `customer.subscription.updated` chegar antes de `checkout.session.completed`
  ter sido processado (corrida rara, mas Stripe não garante ordem de entrega), o webhook
  precisa de uma consulta reversa: `db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()`.
  Se não encontrar nenhum usuário (ainda não vinculado), a opção mais segura é logar e
  descartar o evento sem erro fatal (responder 200 mesmo assim, para não entrar em retry
  infinito do Stripe) — o próximo `customer.subscription.updated` natural (há sempre um
  após o `checkout.session.completed` processar) vai re-sincronizar o estado correto.
- Para todos os outros eventos (`customer.subscription.*`, `invoice.payment_failed`): resolver
  `uid` via essa mesma consulta reversa por `stripeCustomerId` (índice composto simples,
  `where` em campo único, não exige índice extra no Firestore).

## 6. Itens em aberto para decisão de Paulo antes da implementação

1. Opção A vs. B da janela de graça de `past_due` (Seção 3).
2. Confirmar se a Server Route "crua" (fora do pipeline `createServerFn`) é o mecanismo
   certo na versão atual de `@tanstack/react-start`/Nitro do projeto, ou se existe um jeito
   de acessar raw body dentro do próprio `createServerFn` que não foi identificado neste
   discovery (validação técnica rápida antes de codar).
3. Onde a Checkout Session é disparada no fluxo de produto (que tela/CTA, ainda não
   existente) — fora do escopo deste discovery (mecânica de pagamento), mas é pré-requisito
   de UX para o item 5 funcionar.
4. Retenção/TTL de `processedStripeEvents` (proposto 1 ano, não decidido).
5. Uso de Secret Manager vs. env var simples do Cloud Run para os dois secrets Stripe
   (Secret Manager recomendado dado que são credenciais de pagamento).

## 7. Não incluído neste discovery (fora de escopo, por instrução do prompt)

- Preço ou plano específico (pendente do item 75 do backlog).
- Qualquer código de implementação (`.ts`/`.tsx`).
- Alteração de Firestore Security Rules (mencionadas como pré-requisito, não desenhadas em
  detalhe aqui).
- Fluxo de cancelamento self-service / Customer Portal do Stripe (relacionado, mas não
  pedido no escopo dos 5 pontos do prompt 76).
