# 76 — Discovery: Webhook Stripe (Idempotente, Server-Side) (P0)

## 🛑 Modo de operação: discovery, não implementação

Pagamento real envolve segurança/dinheiro de verdade — desenho primeiro,
execução só depois de revisão.

## Contexto

Fundação de entitlement já pronta (SSOT Seção 5): `SubscriptionProvider`
via `onSnapshot`, `useFeatureGate(key)`, escrita de tier reservada pra
rota server-side. O webhook Stripe é a peça que falta pra essa fundação
ter propósito real.

## Escopo do discovery

### 1. Endpoint e verificação de assinatura

Desenhar o `createServerFn`/rota que recebe o webhook do Stripe —
**verificação de assinatura obrigatória** (`stripe.webhooks.constructEvent`
com o webhook secret, nunca confiar no payload sem validar a assinatura
— um endpoint de webhook sem essa checagem é uma porta aberta pra
qualquer um se promover a Pro forjando o payload).

### 2. Idempotência por Event ID

Já mencionado no SSOT como requisito ("idempotente, dedupe por event
ID"). Desenhar: nova coleção Firestore (ex: `processedStripeEvents/{eventId}`)
gravada **antes** de processar o evento, checada no início — se o
`eventId` já foi processado, retornar sucesso sem reprocessar (Stripe
reenvia webhooks em caso de timeout, então duplicata é esperada, não
exceção).

### 3. Mapeamento de eventos Stripe → estado de entitlement

Listar quais eventos Stripe importam (`checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`) e o que cada um deveria escrever em
`users/{uid}.subscriptionStatus`/`tier` — propor a máquina de estados
completa (ex: pagamento falho vira "past_due", não cancela
imediatamente; quantos dias de graça antes de rebaixar pra Free).

### 4. Chaves e segredos

Onde `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` vivem (variável de
ambiente do Cloud Run, nunca commitada) — confirmar que não existe
nenhum resquício de chave de teste hardcoded em lugar nenhum do
repositório antes de prosseguir.

### 5. Vínculo `uid` ↔ `stripeCustomerId`

Desenhar como o webhook sabe pra qual usuário Firestore aplicar a
mudança — geralmente via metadata do Checkout Session (`client_reference_id`
ou `metadata.uid`) setada no momento da criação da sessão de checkout
(que também não existe ainda — esse discovery deveria cobrir os dois
lados: criar a sessão de checkout E processar o webhook de volta).

## Regras obrigatórias

- Não implementar nada nesta rodada — só o desenho.
- Não assumir preço/plano específico — o discovery é sobre mecânica de
  pagamento, não sobre valor (isso é decisão de produto separada, ainda
  pendente do item 75).

## Entregável esperado

Documento markdown com o desenho completo: endpoint, verificação de
assinatura, idempotência, máquina de estados de evento→entitlement,
gestão de segredos, e fluxo de criação de Checkout Session — pra revisão
de Paulo antes de qualquer prompt de execução.
