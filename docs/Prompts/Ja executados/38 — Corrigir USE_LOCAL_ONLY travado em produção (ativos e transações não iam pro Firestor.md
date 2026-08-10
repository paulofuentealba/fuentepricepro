### 38 — Corrigir USE_LOCAL_ONLY travado em produção (ativos e transações não iam pro Firestore) ✅ CONCLUÍDO E CONFIRMADO

Problema levantado pelo usuário: ativo adicionado em produção não ia pro
banco de dados. Causa raiz confirmada por mim direto no código: tanto
`src/lib/watchlist.ts` quanto `src/lib/transactions.ts` tinham
`const USE_LOCAL_ONLY = true; // HOTFIX: Bloquear Firebase para QA local`
— fixo em `true` sem nenhuma condição de ambiente, inclusive em
produção. Todo upsert/remove/update ia só pro localStorage do navegador,
nunca tocava o Firestore, mesmo com o usuário logado.

**Já corrigi direto no código** (não precisa refazer, só validar):
- As duas flags agora são `const USE_LOCAL_ONLY = import.meta.env.DEV;`
  — automático pro ambiente (true só no `npm run dev` local, false em
  qualquer build de produção), nunca mais depende de alguém lembrar de
  trocar antes de um commit.
- Adicionei em `transactions.ts` a mesma lógica de migração
  local→nuvem que já existia em `watchlist.ts` (na primeira carga com
  usuário logado, migra o que estiver no localStorage pro Firestore via
  `writeBatch`, depois limpa o local) — o `useTransactions()` não tinha
  essa migração antes, e o usuário confirmou ter testado lançamento de
  transação em produção hoje, então há dado real preso no localStorage
  do navegador dele que precisa migrar.

```
38 — Validar correção do USE_LOCAL_ONLY + commit/push pra produção

Contexto: watchlist.ts e transactions.ts tinham USE_LOCAL_ONLY fixo em 
true (nunca escrevia no Firestore, nem em produção). Já corrigido pra 
import.meta.env.DEV nos dois arquivos, e adicionada migração 
local→nuvem em transactions.ts (mesma lógica que já existia em 
watchlist.ts). Esta tarefa é validar em dev, depois preparar e (com 
minha confirmação) subir pra produção.

TAREFA:

1. Teste em dev (npm run dev), confirmando isolamento continua correto:
   a. Abrir o app localmente, deslogado (modo convidado). Adicionar um 
      ativo. Confirmar que ele aparece só no localStorage do navegador 
      (Application > Local Storage no DevTools, chave 
      ceilingPricePro.watchlist.v1) — NÃO deve criar nada no Firestore 
      (conferir no Console do Firebase, coleção users/{seu uid}/assets, 
      que nada novo apareceu de um teste local).
   b. Logar com uma conta de teste local. Adicionar outro ativo. 
      Confirmar EXPLICITAMENTE se ele vai ou não pro Firestore nesse 
      cenário (import.meta.env.DEV é true tanto logado quanto 
      deslogado em npm run dev — reportar esse comportamento, já que 
      pode ser diferente do que o usuário espera: local-only vale pro 
      dev inteiro, não só modo convidado. Se isso não for o desejado, 
      não mudar sozinho — só reportar e perguntar antes de ajustar).
   c. Lançar uma transação de teste (Camada 3) logado em dev, e 
      confirmar o mesmo comportamento consistente com o item acima.

2. Rodar npm run build (build de produção real) e confirmar que 
   compila limpo. Não precisa rodar o app buildado localmente pra este 
   teste — só confirmar que import.meta.env.DEV vira false no build 
   (pode confirmar isso lendo o bundle gerado em dist/, procurando se a 
   string "HOTFIX" ou lógica de local-only ficou inlined como false, ou 
   reportar como validou).

3. SE o teste do passo 1 confirmar que o comportamento está correto 
   (dev isolado, produção não): seguir com o checklist de commit/push 
   já usado antes (mesmo padrão da Tarefa 26):
   a. git status e git branch --show-current — reportar e pausar se 
      houver qualquer arquivo inesperado.
   b. git diff --stat — resumo do tamanho do commit.
   c. git add dos arquivos relevantes (watchlist.ts, transactions.ts, 
      e qualquer outro arquivo pendente do bug reportado nesta 
      conversa).
   d. Um commit único, mensagem clara, ex: "fix: USE_LOCAL_ONLY travado 
      impedia sincronização com Firestore em produção" com corpo 
      explicando a causa raiz e a correção (flag amarrada a 
      import.meta.env.DEV + migração local→nuvem adicionada em 
      transactions.ts).
   e. git log -1 --stat — mostrar e PAUSAR aqui, aguardando minha 
      confirmação explícita antes do push.
   f. Só depois da minha confirmação: git push (sem --force).

NÃO TOCAR: nenhum comando destrutivo (git reset --hard, git checkout 
sobre arquivos não commitados, git push --force, git rebase, git commit 
--amend). Não pular a pausa de confirmação antes do push.

CRITÉRIO DE SUCESSO: teste de dev confirma isolamento correto (ou 
reporta claramente se o comportamento for diferente do esperado, sem 
assumir e corrigir sozinho); build de produção limpo; commit único e 
claro revisado por mim antes do push; push feito só depois da minha 
confirmação explícita.
```

---