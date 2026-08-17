# PROMPT 9 — HG Brasil como fonte real de dividendos (não só enriquecimento de data)

> Copiar e colar no chat `[EXECUÇÃO]`.

## Contexto — o que já está documentado e por que isso muda agora

Em `docs/_archive/api_enrichment_action_plan.md`, seção "FECHAMENTO — Bolsai
+ HG Brasil (validação real, 2026-08-07)", há um veredito registrado:
HG Brasil retornou `UNAUTHORIZED_KEY` em 100% dos tickers testados,
diagnóstico "chave válida mas sem acesso ao recurso `finance/dividends` no
plano atual". A decisão na época foi "capítulo encerrado", com
`paymentDate` resolvido via `fiiPaymentRules.ts` (estimativa por calendário
comercial BR), não via HG Brasil.

**Paulo agora informa que pagou o plano da API do HG Brasil especificamente
para ter acesso a dividendos**, e espera que ela seja usada como fonte real
dos dados — não só confirmação de data de pagamento de um dividendo que já
veio de outro lugar. Isso é uma mudança de papel da integração, não um bug.

Achado técnico adicional (Claude, por leitura de código): mesmo se a chave
funcionar, hoje `fetchHgBrasilDividends()` e `enrichDividendPaymentDates()`
(`src/lib/api/hgBrasil.server.ts`) **não são chamadas por nenhum lugar do
app** — só existem no próprio arquivo e no teste dele
(`hgBrasil.server.test.ts`). Foram implementadas e testadas isoladamente,
nunca conectadas ao pipeline real de montagem do Asset. O ponto de
montagem hoje é `src/lib/api/brapi.server.ts` (~linha 101), onde
`dividendEvents` é construído a partir do payload da Brapi.

## 🛑 MODO DE OPERAÇÃO — Regra 8, sem exceção

Duas fases obrigatórias, NÃO pule para a Fase 2 sem confirmar a Fase 1 com
evidência real:

### FASE 1 — Revalidar a chave de verdade (nada de código ainda)

1. Pegue a `HGBRASIL_API_KEY` atual configurada por Paulo (`.env.local` ou
   onde ele tiver colocado — confirme com ele se não achar) e rode uma
   chamada real contra `https://api.hgbrasil.com/v2/finance/dividends`
   para pelo menos 3 tickers reais (ex: BBSE3, PETR4, TAEE11 — os mesmos do
   teste de agosto, pra comparar maçã com maçã).
2. Cole o JSON de resposta literal (ou o erro literal) de cada chamada —
   sem resumir. Se ainda vier `UNAUTHORIZED_KEY` ou qualquer erro de
   permissão, PARE aqui e reporte para Paulo — não prossiga pra Fase 2, o
   plano pago pode não cobrir esse endpoint específico mesmo sendo pago
   (planos de API costumam ter escopos diferentes por recurso).
3. Se a resposta vier com dados reais de dividendos: confirme também se o
   payload inclui histórico suficiente (o comentário em `.env.example` diz
   "2 years history" — confirme se bate) e se `payment_date` vem
   preenchido consistentemente (esse era o dado que faltava antes).

### FASE 2 — só se a Fase 1 confirmar acesso real

Isso é decisão de arquitetura de dado (Regra 4, SSOT), não é troca de uma
linha. Antes de escrever código, apresente um plano curto com as seguintes
decisões explícitas — não decida nenhuma sozinho:

4. **Papel do HG Brasil no pipeline**: ele passa a ser chamado em paralelo
   com a Brapi na montagem do Asset (`fetchAssetFn` → hoje delega pra
   `brapi.server.ts`), ou substitui a Brapi como fonte de dividendos pra
   ativos BR especificamente? Recomendo (mas confirme com Paulo): usar HG
   Brasil como fonte primária de dividendos BR quando disponível, com Brapi
   como fallback se HG falhar/retornar vazio — mantém resiliência sem violar
   SSOT, desde que só uma fonte "vença" por ticker por request, nunca as
   duas mescladas campo a campo.
5. **Política de merge/dedup**: se os dois provedores retornarem dividendos
   pro mesmo ticker (ex: em transição ou fallback), como decidir duplicata?
   Sugestão: chave de dedup por `(exDate, amountPerShare)` arredondado,
   preferindo o registro com `paymentDate` preenchido quando houver conflito.
   Escreva isso explicitamente no plano antes de implementar.
6. **Custo/quota**: HG Brasil é plano pago — confirme se há rate limit ou
   cota mensal que o cache atual (`CACHE_TTL_MS = 1 hora` já implementado
   em `hgBrasil.server.ts`) cobre adequadamente, ou se precisa de
   TTL maior para não estourar cota com tráfego real.
7. Depois do plano aprovado por Paulo: conecte `fetchHgBrasilDividends` no
   ponto de montagem do Asset (`brapi.server.ts` ou `fetchAssetFn`,
   conforme decisão do item 4), populando `dividendEvents` com os dados
   reais do HG Brasil para ativos BR quando disponíveis.
8. Atualize `docs/_archive/api_enrichment_action_plan.md` — não reescreva a
   entrada de agosto (é registro histórico), mas ADICIONE uma nova seção
   "ATUALIZAÇÃO — HG Brasil reativado (plano pago confirmado, [data])"
   documentando a mudança de decisão e por quê, com link pro resultado real
   da Fase 1 deste prompt.
9. Rode `npm run test`, `tsc --noEmit`, `npm run build` — output literal e
   completo, sem resumo. Rode especificamente os testes de
   `hgBrasil.server.test.ts`, `brapi.server.ts` (se houver) e qualquer
   teste de `cashflow`/`dividendHeatmap` que dependa de `dividendEvents`,
   já que essa mudança altera a fonte de um dado usado por várias telas.
10. Commit(s) separados: um para a mudança de pipeline
    (`feat(dividends): usar HG Brasil como fonte real de dividendos BR`),
    outro para a atualização do doc de arquivo, se aplicável.

## PROIBIDO
- Proibido pular a Fase 1 e sair conectando o pipeline achando que "deve
  funcionar agora que é pago" — confirme com chamada real primeiro.
- Proibido decidir sozinho a política de merge/prioridade entre Brapi e HG
  Brasil (item 5) — isso é dado financeiro exibido ao usuário, Regra 4 é
  inegociável.
- Proibido reescrever/apagar a entrada de agosto no doc de arquivo — é
  registro histórico de uma decisão tomada com a informação que existia
  na época, adicionar não substituir.
