# RESULTADO - 77 — Discovery: Controle de Acesso para `/admin`

Status: **discovery concluído, aguardando decisão/revisão de Paulo**. Nenhum código foi alterado nesta rodada.

## 1. Estado atual confirmado no repositório

- Não existe nenhum conceito de "usuário admin" no código. Nenhum Custom
  Claim, nenhuma lista de UIDs, nenhuma checagem de papel/role em
  qualquer lugar (`src/`, `firestore.rules`, `scripts/`).
- `config/featureGates` (`src/lib/featureGates.ts`) já existe e é lido
  em tempo real pelo client via `useFeatureGates()` (listener
  `onSnapshot`). Escrita hoje só acontece via scripts locais
  (`scripts/seed-feature-gates.ts`, `scripts/update-feature-gates-permissive.ts`)
  rodando com Admin SDK, fora da aplicação.
- `ingestionLog/{source}_{date}` (`src/lib/api/ingestionLog.server.ts`)
  já é escrito automaticamente pelos conectores de dados (`brapi`,
  `yahoo`, `cvm`, `secEdgar`, `nasdaq`, `benchmark`) via
  `reportIngestionStatus`, fire-and-forget, usando o Admin SDK
  (`getAdminFirestore`). Item 13 do SSOT — pronto para um consumidor
  visual, mas hoje sem nenhuma leitura server-side exposta ao client.
- **Achado crítico fora do escopo original, mas relevante para a
  decisão**: `firestore.rules` (linhas 35-43) hoje libera **leitura
  direta do client** para `config/featureGates` e `ingestionLog/*`
  para **qualquer usuário autenticado** (`allow read: if request.auth
  != null`), não apenas admin:

  ```
  match /config/featureGates {
    allow read: if request.auth != null;
    allow write: if false; // só via Admin SDK
  }
  match /ingestionLog/{docId} {
    allow read: if request.auth != null;
    allow write: if false; // só via Admin SDK
  }
  ```

  Isso significa que, mesmo implementando o painel `/admin` com
  `createServerFn` protegidas, qualquer usuário logado já pode ler
  esses dados hoje diretamente via SDK do Firestore no client
  (bypassando qualquer UI). Não é um problema introduzido por este
  prompt, mas **precisa ser corrigido junto** com a criação do painel:
  as regras de leitura devem também restringir a admin (via custom
  claim, se essa for a abordagem escolhida — `request.auth.token.isAdmin
  == true`), não só `request.auth != null`. Isso é evidência adicional
  a favor de Custom Claims (ver seção 2): com UID fixo em variável de
  ambiente do servidor, as Firestore Rules (que rodam no Firestore, não
  no seu server) não têm como enxergar essa lista sem duplicá-la nas
  regras.
- Não existe hoje nenhum `createServerFn` que valide autenticação/
  autorização de usuário (os que existem — busca de ativos, cotações —
  são endpoints públicos e não autenticados). Ou seja, também não há
  precedente no código para "como verificar o usuário logado dentro de
  um `createServerFn`" — isso precisa ser desenhado do zero (ver seção
  3).

## 2. Custom Claims vs. UID fixo

### Opção A — Custom Claims do Firebase Auth (`isAdmin: true` no token)

Prós:
- Verificável tanto no client (`auth.currentUser.getIdTokenResult()`)
  quanto no server (`getAuth().verifyIdToken(token)` retorna o claim
  decodificado), e também dentro das **Firestore Security Rules**
  (`request.auth.token.isAdmin == true`). É a única das duas opções que
  fecha o buraco identificado na seção 1 sem duplicar a lista de admins
  em três lugares (server env var + rules + client).
- Não exige hardcode de UID em variável de ambiente nem redeploy para
  trocar quem é admin — é setado uma vez por usuário via Admin SDK.
  Sobrevive a redeploys, funciona igual em todos os ambientes
  (dev/preview/prod) desde que o claim tenha sido setado naquele
  projeto Firebase.
- Escala trivialmente se um dia houver mais de 1 admin (não é o caso
  agora, mas é grátis).

Contras:
- Setar o claim exige rodar código com Admin SDK (não tem UI no
  Firebase Console para "marcar usuário como admin" com um clique — ver
  seção 4). É um passo manual único, mas não é zero-código.
- Claims ficam embutidos no ID token e só atualizam depois que o
  token é renovado (o client precisa forçar
  `getIdToken(true)`/logout-login após o claim ser setado pela primeira
  vez, ou esperar o refresh natural ~1h).
- Mais uma peça de infraestrutura de auth para entender/manter (embora
  seja um padrão do próprio Firebase, não algo customizado).

### Opção B — Lista de UID fixo em variável de ambiente

Prós:
- Mais simples de implementar imediatamente: nenhuma chamada a
  `setCustomUserClaims`, só comparar `event.user.uid` contra
  `process.env.ADMIN_UIDS.split(",")` dentro do handler do
  `createServerFn`.
- Fácil de auditar lendo uma env var.

Contras:
- **Não fecha o buraco das Firestore Rules** (seção 1): as Rules não
  têm acesso a variáveis de ambiente do servidor Node, então não dá
  para expressar "só este UID pode ler" nas Rules sem colar o UID
  literal dentro do arquivo `firestore.rules` — duplicando a fonte de
  verdade (env var no server + UID hardcoded nas rules) e criando risco
  de desincronização.
- Trocar quem é admin exige redeploy (mudar env var e publicar).
- Não escala — cada admin novo é mais uma edição de env var + redeploy.

### Recomendação

**Custom Claims.** Mesmo para 1 usuário nesta fase, é a única
abordagem que protege consistentemente as três camadas que hoje
existem ou vão existir (Firestore Rules, `createServerFn` no server,
e opcionalmente a UI do client para esconder o link) com uma única
fonte de verdade — o token do usuário — sem duplicar a lista de admins
em código/env var. O custo extra de implementação (rodar um script
Admin SDK uma vez para setar o claim) é pago uma única vez e é menor
que o risco de manter uma lista de UID sincronizada manualmente em
múltiplos arquivos.

## 3. Proteção real fica no servidor — nunca só no client

Regra confirmada e não negociável para a próxima fase de implementação:

- Esconder o link `/admin` no Sidebar (ex.: `if (!isAdmin) return
  null`) é apenas UX — **não é controle de acesso**. Qualquer usuário
  pode navegar direto para `/admin` digitando a URL, ou chamar o
  `createServerFn` diretamente via `fetch`, sem passar pela UI.
- A validação real precisa acontecer em **dois lugares
  independentes**, ambos fora do alcance do client:
  1. **Dentro do handler de cada `createServerFn`** do painel — decodifica
     o ID token do request, confere `isAdmin === true`, e só então
     executa a leitura/escrita. Se falhar, lança erro 403 antes de
     tocar no Firestore.
  2. **Nas Firestore Security Rules** — como camada de defesa em
     profundidade, caso algum código (atual ou futuro) tente ler/
     escrever `config/featureGates` ou `ingestionLog` diretamente do
     client via SDK do Firestore, sem passar pelo `createServerFn`.
     Isso é obrigatório à luz do achado da seção 1 (hoje qualquer
     usuário autenticado já consegue ler esses documentos direto do
     client).
- A rota `/admin` no TanStack Router também deve ter um `beforeLoad`
  ou guard equivalente que redireciona usuários não-admin — mas,
  reforçando, isso é conveniência de navegação, não segurança; a
  segurança real está nos dois pontos acima.

## 4. `createServerFn` necessárias e validação de admin em cada uma

Todas as funções abaixo seguem o mesmo padrão de guarda no início do
`handler`, antes de qualquer leitura/escrita no Firestore:

```ts
// pseudocódigo de referência — não implementado nesta rodada
async function requireAdmin(request: Request) {
  const idToken = extractBearerToken(request); // do header Authorization
  if (!idToken) throw new Error("401: não autenticado");
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  if (decoded.isAdmin !== true) throw new Error("403: acesso negado");
  return decoded;
}
```

| `createServerFn` proposta | Ação | Validação de admin |
|---|---|---|
| `getFeatureGatesFn` | Lê `config/featureGates` (Admin SDK, bypassa a regra `allow write: if false` porque o Admin SDK ignora Security Rules) | `requireAdmin()` no início do handler; sem isso, hoje já dá para ler via client direto (ver seção 1) — então **esta função só faz sentido depois de tornar a Rule de leitura também admin-only** |
| `updateFeatureGatesFn` | Escreve/faz merge em `config/featureGates` (liga/desliga gates, ajusta `freeAssetLimit`) | `requireAdmin()`; validar payload (chaves permitidas = as de `FeatureGatesConfig`, tipos corretos) antes de gravar |
| `getIngestionLogFn` | Lê os documentos `ingestionLog/{source}_{date}` mais recentes (ex.: últimos N dias, ou por source) para popular o dashboard de ingestão | `requireAdmin()` no início do handler |
| (opcional) `listAdminsFn` / `setAdminClaimFn` | Não recomendado nesta fase — gestão de quem é admin fica fora da aplicação (ver seção 4 abaixo), evitando construir uma superfície de escrita de claims dentro do próprio app com 1 usuário admin | N/A — não implementar agora |

Nenhuma dessas funções deve aceitar o UID/claim do próprio payload do
client como fonte de verdade — o admin sempre é derivado do ID token
verificado no server (`decoded.isAdmin`), nunca de um campo enviado
pelo client (que poderia ser forjado).

## 5. Onde a whitelist/claim de admin fica configurada

Para esta fase (1 usuário admin — Paulo), a recomendação é:

- **Setar o Custom Claim manualmente, uma única vez, via um script
  Node local usando o Admin SDK** (mesmo padrão já usado em
  `scripts/seed-feature-gates.ts`), não pelo Firebase Console (o
  Console não tem UI para editar custom claims — isso só é possível
  via Admin SDK/CLI, apesar do claim em si ser "config manual aceitável
  para 1 usuário" como pedido no prompt original).
  Exemplo de uso único, fora da aplicação:
  `getAuth().setCustomUserClaims(uid, { isAdmin: true })`.
- Esse script não faz parte da aplicação (não é uma rota, não é
  exposto), roda uma vez localmente contra o projeto Firebase e não
  precisa ser mantido — é comparável aos scripts de seed já existentes
  em `scripts/`.
- Não construir nenhuma tela ou `createServerFn` de "gerenciar admins"
  nesta fase — seria complexidade desnecessária para 1 usuário e uma
  superfície de risco extra (quem pode chamar essa função também
  precisaria ser admin, criando um problema circular). Se um dia
  houver mais de 1 admin, revisitar.

## Próximo passo

Este documento não deve ser tratado como aprovado para execução. Falta
decisão explícita de Paulo sobre:
1. Confirmar Custom Claims como abordagem (ou preferir UID fixo, com os
   trade-offs de rules descritos na seção 2).
2. Confirmar que a correção das `firestore.rules` (seção 1) entra no
   mesmo prompt de execução, já que sem ela o controle de acesso do
   painel `/admin` seria incompleto.

Só depois disso deve ser escrito o próximo prompt de execução (fundação
de auth admin + as três `createServerFn` + UI do painel).
