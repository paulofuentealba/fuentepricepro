# PROMPT 12 — Dois achados: collection /assets ausente + dado desatualizado no Invested vs. Received

> Copiar e colar no chat `[EXECUÇÃO]`.

---

## PARTE A — Collection `/assets` nunca foi implementada (decisão aprovada, nunca executada)

### Contexto

Na sessão de arquitetura registrada anteriormente (BFF), ficou decidido:
Firestore normalizado em três coleções, incluindo `/assets/{ticker}` como
cache persistido de dado de mercado público, servido pelo BFF pra todos os
usuários — evitando que o custo de leitura escale com
`usuários × ativos na carteira` em vez de só `ativos distintos`.

Essa parte nunca foi implementada. `src/lib/api/assetCache.server.ts` tem
um comentário em `getCachedAsset()` (linha ~57) que diz "memory + Firestore
fallback if available" — mas a função só implementa cache em memória
(`Map`), sem nenhum fallback real pro Firestore. Isso é regressão contra
uma decisão de arquitetura já aprovada, não uma feature nova.

### TAREFA — Regra 8, plano antes de código

1. Confirme lendo `assetCache.server.ts` por inteiro que realmente não há
   nenhuma tentativa de leitura/escrita no Firestore em nenhuma função
   deste arquivo — releia antes de assumir.
2. Escreva um plano curto propondo:
   - Estrutura do documento em `/assets/{ticker}`: quais campos do
     `ApiAsset` são persistidos, e com que TTL de staleness (alinhar com
     `ASSET_CACHE_TTL_MS` já existente, 5 minutos, ou justificar um valor
     diferente pra persistência vs. cache em memória).
   - Fluxo de leitura: `getCachedAsset` passa a tentar memória → Firestore
     → (se nenhum dos dois tiver dado fresco) deixa o caller seguir pro
     fetch das APIs externas normalmente.
   - Fluxo de escrita: `setCachedAsset` grava em memória E no Firestore.
   - Regras de segurança do Firestore para `/assets/{ticker}`: leitura
     pública (dado de mercado não é sensível), escrita **só** via server
     function (nunca client-side) — confirme isso em `firestore.rules`.
3. Apresente o plano para Paulo antes de implementar — isso toca custo de
   Firestore em produção, não é mudança cosmética.
4. Após aprovação: implemente, com testes cobrindo os 3 cenários (hit em
   memória, hit em Firestore/miss em memória, miss nos dois → cai pro
   fetch externo).
5. Rode `npm run test`, `npx tsc --noEmit`, `npm run build` — output
   literal e completo.
6. Corrija o comentário da função para refletir a implementação real
   (isso é o tipo de comentário que engana o próximo desenvolvedor/agente
   a achar que algo já existe quando não existe — já causou essa mesma
   confusão agora).

### PROIBIDO
- Proibido implementar sem apresentar o plano de TTL/estrutura primeiro.
- Proibido deixar `firestore.rules` mais permissivo do que "leitura
  pública, escrita só server-side" para esta collection.

---

## PARTE B — Invested vs. Received mostrando ativos que Paulo não reconhece como "da carteira" (DIAGNÓSTICO)

### Contexto

Print anexo mostra o gráfico "Invested vs. Received" do Cash Flow com os
tickers TGAR11, GGRC11, BRAP4, CPTI11, AFHI11, JURO11, PMLL11, HGCR11,
HGRU11, RZTR11 — Paulo diz que não tem esses ativos na carteira.

**Isso NÃO é o mesmo bug já corrigido antes.** A função
`computeInvestedVsReceived` (`src/lib/cashflow.ts`, linha ~326) já tem
filtro `.filter((it) => it.quantity > 0)` desde antes das correções
recentes, e recebe `items` já pré-filtrado vindo de
`src/routes/app/cashflow.tsx`. Ou seja, o filtro de código está correto —
se esses tickers aparecem, é porque o campo `quantity` desses ativos no
Firestore está maior que 0, mesmo que Paulo não os reconheça como
posição real.

### TAREFA — Auditor primeiro, não corrigir às cegas

1. Para cada um dos 10 tickers do print, consulte o documento de posição
   real de Paulo no Firestore (`users/{uid}/positions/{ticker}` ou onde
   quer que `quantity` seja lido para esses ativos — confirme o caminho
   real antes de assumir) e reporte o valor de `quantity` e `averagePrice`
   armazenado.
2. Para os tickers com `quantity > 0` confirmado: puxe o histórico de
   transações (`users/{uid}/transactions`) filtrado por esse ticker e
   confirme se a soma líquida de Buy/Sell bate com o `quantity` gravado —
   se a soma líquida das transações for 0 (ou negativa) mas o campo
   `quantity` da posição estiver > 0, é bug de sincronização — a posição
   não foi recalculada corretamente depois de uma venda total.
3. Confirme se esses valores passaram por
   `recalculateHoldingFromTransactions` (o único caminho válido de
   mutação de posição, segundo a documentação do projeto) ou se algum
   outro caminho de escrita (import de CSV antigo, edição manual, script)
   gravou `quantity` diretamente sem passar por essa função.
4. Reporte a causa raiz encontrada — com ticker específico e trecho de
   código/dado exato — ANTES de propor correção. Pode ser: (a) dado
   realmente desatualizado que precisa de correção pontual nos documentos
   do Paulo (não é bug de código, é dado sujo), (b) bug real de
   sincronização em algum caminho de escrita que não usa
   `recalculateHoldingFromTransactions`, ou (c) outra causa que a
   investigação revelar.

### PROIBIDO
- Proibido "corrigir" adicionando mais um filtro na UI sem antes confirmar
  se é dado sujo ou bug de sincronização — são correções completamente
  diferentes e a errada pode mascarar um problema de integridade de dado
  maior.
