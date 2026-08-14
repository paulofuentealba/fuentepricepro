# PROMPT 87 — Fundação de Auth Admin (Custom Claims + Correção Firestore Rules)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

**Plano de Implementação Obrigatório (Regra 8) — esta é uma atividade de
risco Alto.** Apresente o plano descrito na seção "Plano — apresentar
antes de codar" e AGUARDE aprovação explícita de Paulo antes de tocar em
qualquer arquivo. Não codar direto.

---

## Contexto e Referências Obrigatórias

- Ler o documento de discovery `RESULTADO - 77 — Discovery Admin
  Controle de Acesso.md` (em `docs/Implementation Plans/` ou
  equivalente) ANTES de começar. Ele já mapeou:
  - Estado atual do repo (nenhum conceito de admin existe hoje).
  - A decisão entre Custom Claims vs UID fixo.
  - **Achado crítico**: `config/featureGates` e `ingestionLog/*` hoje
    são legíveis por QUALQUER usuário autenticado nas Firestore Rules
    (`allow read: if request.auth != null`), não apenas admin.
- Referência visual/funcional: protótipo HTML `admin_panel_prototype.html`
  (compartilhado por Paulo) — reflete o layout, os tokens visuais
  (petroleo #2C6B63, Fraunces+Inter, glassmorphism) e o fluxo esperado
  do painel `/admin`. **NÃO copiar o HTML/CSS/JS do protótipo
  diretamente** — ele é vanilla JS sem TypeScript, sem shadcn/ui, sem
  os tokens reais do projeto. Use-o só como referência de UX/layout.
  Este prompt (87) não constrói a UI do painel — só a fundação de auth.
  A UI vem no Prompt 88, depois deste ser aprovado e mergeado.

## Decisão Já Tomada — Não Reabrir Discussão

**Custom Claims do Firebase Auth** (`isAdmin: true`) é a abordagem
aprovada — não UID fixo em variável de ambiente. Motivo já documentado
no discovery: é a única opção que protege consistentemente Firestore
Rules + server + client com uma única fonte de verdade (o token do
usuário), sem duplicar a lista de admins em múltiplos arquivos.

---

## Tarefas

### 1. Script de setup (fora da aplicação)
- Criar `scripts/set-admin-claim.ts`, seguindo o mesmo padrão de
  `scripts/seed-feature-gates.ts` (uso do Admin SDK, script standalone).
- Uso único, local, roda contra o projeto Firebase e seta
  `setCustomUserClaims(uid, { isAdmin: true })` para o UID de Paulo
  (receber o UID como argumento de linha de comando, não hardcoded).
- Não expor como rota nem `createServerFn`. Documentar no topo do
  arquivo, em comentário, como e quando rodar
  (ex: `npx tsx scripts/set-admin-claim.ts <uid>`).

### 2. Helper de validação server-side
- Criar `src/lib/api/requireAdmin.server.ts` com a função:
  ```ts
  export async function requireAdmin(request: Request) {
    const idToken = extractBearerToken(request);
    if (!idToken) throw new Error("401: não autenticado");
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (decoded.isAdmin !== true) throw new Error("403: acesso negado");
    return decoded;
  }
  ```
- Antes de criar `extractBearerToken` do zero, verificar se já existe
  utilitário equivalente em `src/lib/api/` (Regra 1 — reusabilidade
  primeiro). Se não existir, criar isolado neste arquivo.
- Reaproveitar a inicialização existente de `getAdminAuth()` /
  `getAdminFirestore()` — não inicializar o Admin SDK uma segunda vez
  em paralelo ao que já existe no projeto.

### 3. Correção obrigatória das Firestore Rules (Regra 3 / achado do discovery)
- Em `firestore.rules`, alterar as regras de `config/featureGates` e
  `ingestionLog/{docId}`:
  - De: `allow read: if request.auth != null;`
  - Para: `allow read: if request.auth != null && request.auth.token.isAdmin == true;`
- Rodar `npm run test:rules` (suite do Firebase Emulator) e confirmar
  que testes existentes de leitura não-admin agora falham como
  esperado — ajustar ou criar teste novo que comprove explicitamente o
  bloqueio (`assertFails` para usuário sem claim, `assertSucceeds` para
  usuário com `isAdmin: true`).
- **Este item não é opcional nem separável do resto do prompt.** Sem
  ele, o painel `/admin` do Prompt 88 protegeria a UI mas deixaria os
  dados abertos por baixo via SDK direto do client.

### 4. Rota `/admin` com guard de navegação
- Criar `src/routes/admin.tsx` (ou estrutura de layout equivalente,
  seguindo o padrão já usado em `src/routes/app.tsx`).
- `beforeLoad` que verifica o claim do usuário logado (via
  `auth.currentUser.getIdTokenResult()`) e redireciona para `/app` (ou
  tela de acesso negado) se `isAdmin !== true`.
- Documentar explicitamente em comentário no código que este guard é
  **conveniência de navegação** — a segurança real está nos itens 2 e
  3 acima, não aqui. Um usuário mal-intencionado pode contornar isso
  chamando a `createServerFn` diretamente.
- Não construir nenhuma UI de conteúdo do painel ainda — só o guard e
  uma página vazia/placeholder ("Painel Admin — em construção").

---

## Plano — Apresentar Antes de Codar

Antes de escrever qualquer código, responda e apresente para aprovação:
1. Onde `getAdminAuth()` / `getAdminFirestore()` já são inicializados
   no projeto hoje (arquivo + linha).
2. Se já existe algum utilitário de extração de Bearer token
   reaproveitável, e onde.
3. Lista exata dos testes que serão adicionados/alterados em
   `test:rules` para os dois documents (`config/featureGates` e
   `ingestionLog/{docId}`).
4. Estrutura de arquivo proposta para `src/routes/admin.tsx` (layout
   único ou pasta `admin/` com sub-rotas, considerando que o Prompt 88
   vai adicionar 3 abas dentro dela).

---

## Gate de Saída

1. `npx tsc --noEmit` — 0 erros.
2. `npx vitest run` — suite completa passando.
3. `npm run test:rules` — incluindo os testes novos/ajustados do item 3.
4. `npm run build` — build limpo.
5. **Teste manual obrigatório, com resultado reportado explicitamente:**
   - Logar com uma conta SEM o claim `isAdmin`.
   - Navegar direto para `/admin` digitando a URL (não pelo menu) —
     confirmar redirecionamento.
   - Abrir o DevTools Console do navegador e tentar ler o documento
     diretamente via SDK do Firestore:
     `getDoc(doc(db, "config/featureGates"))` — confirmar que a
     chamada falha com `permission-denied`.
   - Reportar o resultado literal desse teste (sucesso/falha + mensagem
     de erro recebida) no relatório de execução. Este é o teste que
     prova que a Regra 3 foi de fato fechada, não só que a UI foi
     escondida.

## Proibido Nesta Rodada
- Nenhuma UI de conteúdo do painel (Feature Gates, Ingestion Log,
  Usuários) — isso é o Prompt 88, que só pode rodar depois deste ser
  aprovado e mergeado.
- Nenhuma tela ou função de "gerenciar admins" (adicionar/remover outros
  admins) — fora de escopo para 1 usuário admin.
- Não fazer commit/push automaticamente sem antes reportar o resultado
  do teste manual do item 5 acima.
