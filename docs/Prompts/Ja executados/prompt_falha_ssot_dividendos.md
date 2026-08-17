# PROMPT — Falha Grave: Duas Fontes de Dividendo Divergindo (Cash Flow vs. Aba Dividendos)

> Copiar e colar no chat `[EXECUÇÃO]`. Severidade alta — Paulo comparou
> as duas telas para o MESMO ativo (AFHI11) no MESMO momento: aba
> Dividendos do card do ativo mostra R$1.275,96 recebidos nos últimos 12
> meses; Cash Flow → Invested vs. Received mostra R$0 para o mesmo
> ativo. Não é falta de dado — a aba Dividendos prova que o dado existe
> e está correto. É uma falha de arquitetura: duas implementações
> diferentes respondendo a mesma pergunta de negócio ("quanto esse ativo
> já rendeu"), com resultados divergentes.

## Causa raiz — DOIS problemas distintos, ambos reais

### Achado 1 — Segunda implementação da mesma pergunta de negócio (Regra 1)

A aba Dividendos (`src/components/ceiling/watchlist/DividendsHistoryPanel.tsx`,
linha ~52) usa a função canônica `calculateRealizedIncome()`
(`src/lib/realizedIncome.ts`) — que trata corretamente tributação por
tipo de ativo (FII/rendimento isento, JCP, dividendo BR, dividendo US com
retenção de 30%), calcula `amountNet` (valor líquido real recebido), e
usa `getQuantityAtDate` para saber quantas cotas o usuário tinha em cada
data de pagamento.

O Cash Flow (`src/lib/cashflow.ts`, função `computeInvestedVsReceived`,
linha ~319) **reimplementa isso do zero, de forma mais simples e sem
tratamento de imposto** — soma `ev.amountPerShare * quantidade` (valor
BRUTO, não líquido) direto, sem passar por `calculateRealizedIncome`.
Existe até um comentário em `CashFlowCalendar.tsx` (linha ~108)
reconhecendo que outra duplicação parecida já foi resolvida e centralizada
em `useRealizedIncomeSummary.ts` — mas `computeInvestedVsReceived`
especificamente nunca foi migrada para usar essa fonte única.

**Isso sozinho já explicaria uma DIFERENÇA de valor** (bruto vs líquido),
mas não explicaria R$0 — para chegar a zero, tem que ter um segundo
problema.

### Achado 2 — Hipótese de concorrência/rate-limit em carga em lote

`CashFlowCalendar.tsx` (linha ~85-93) dispara **um `useQueries` com uma
query por ativo da carteira, todas em paralelo** — se a carteira tiver
15-30 ativos, isso é 15-30 chamadas simultâneas para
`fetchAssetFn`/`fetchFromBrapi`/`fetchHgBrasilDividends`. A aba Dividendos
(`AssetDetailSheet`), por outro lado, faz UMA query isolada por vez, ao
abrir o card de um ativo específico.

Ambos usam a MESMA `queryKey` (`["asset", ticker]` via `assetQueryOptions`
em `src/lib/queryOptions.ts`), então em teoria o cache deveria ser
compartilhado — mas se a carga em lote do Cash Flow disparar antes, e uma
ou mais dessas 15-30 chamadas paralelas sofrer timeout/rate-limit
(`fetchHgBrasilDividends` tem timeout de 4s por chamada — `fetchWithTimeout`
linha ~99 — e Brapi pode ter limite de concorrência própria), o resultado
vazio/com erro fica cacheado por `staleTime: 5 * 60_000` (5 minutos,
`queryOptions.ts` linha ~32) — fazendo o Cash Flow mostrar R$0 por até 5
minutos, mesmo que uma consulta isolada (aba Dividendos) devolva o dado
certo.

## TAREFA — Auditor primeiro, confirmar as duas hipóteses com dado real

1. Reproduza a tela de Cash Flow com uma carteira de tamanho real (15+
   ativos) e capture, via Network tab ou log de servidor, quantas
   chamadas a `fetchHgBrasilDividends`/`fetchFromBrapi` disparam
   simultaneamente, e quantas delas retornam erro/timeout/vazio nesse
   cenário de carga, comparado com abrir o mesmo ticker isoladamente.
2. Confirme se o `dividendEventsMap` do Cash Flow (`CashFlowCalendar.tsx`
   linha ~95) está de fato vazio para AFHI11 no momento do render, ou se
   está populado mas `computeInvestedVsReceived` descarta/zera por outro
   motivo (ex: `investingSince` incorreto, filtro de data).
3. Confirme, olhando o DevTools do React Query (ou log), se a entrada de
   cache `["asset", "AFHI11"]` realmente está vazia/expirada quando o
   Cash Flow renderiza, ou se está populada mas `computeInvestedVsReceived`
   não está lendo dela corretamente.
4. Reporte qual das duas hipóteses (ou ambas) se confirma, com evidência
   (log, network trace, valores reais) — antes de qualquer correção.

## TAREFA — Correção arquitetural (Regra 4, obrigatória independente do Achado 2)

Independente da causa do R$0, **`computeInvestedVsReceived` precisa parar
de reimplementar o cálculo de "recebido" e passar a usar
`calculateRealizedIncome()`** — a mesma função que a aba Dividendos já usa
corretamente. Duas fontes de verdade pra a mesma pergunta financeira não é
aceitável neste projeto (Regra 4, SSOT), independente de qual delas está
"mais certa" hoje.

5. Refatore `computeInvestedVsReceived` (`src/lib/cashflow.ts`) para
   calcular `received` usando `calculateRealizedIncome(transactions,
   dividendEventsMap, assetMetaMap)` (mesma assinatura já usada em
   `DividendsHistoryPanel.tsx`) e somar `amountNet` dos eventos do
   ticker, em vez do `reduce` manual com `amountPerShare` bruto.
6. Isso muda o número exibido (líquido, não bruto) — é uma correção
   correta, não uma regressão, mas AVISE explicitamente que o valor pode
   mudar para ativos com imposto retido (ações BR, US) e ficar igual para
   FIIs (isentos). Rode antes/depois para pelo menos 3 tickers de tipos
   diferentes (ação BR, FII, ação US) e reporte a diferença.
7. Rode `npm run test`, `npx tsc --noEmit`, `npm run build` — output
   literal e completo.
8. Se o Achado 2 (concorrência) se confirmar como causa do R$0: proponha
   correção separada (ex: aumentar timeout, processar em lotes menores,
   ou pré-carregar via BFF/cache — ver Frente 2 já implementada,
   collection `/assets`) — não implementar ainda, só reportar e propor,
   é decisão de arquitetura de infra, não patch pontual.
9. Commits separados: um para a refatoração de `computeInvestedVsReceived`
   (Achado 1), outro para qualquer ajuste de concorrência (Achado 2, só
   se confirmado e aprovado).

## PROIBIDO
- Proibido corrigir só o sintoma (ex: recalcular direto no
  `computeInvestedVsReceived` sem migrar para `calculateRealizedIncome`)
  — isso deixaria as duas implementações divergentes existindo, o mesmo
  bug pode voltar de outro jeito depois.
- Proibido implementar a correção do Achado 2 (concorrência) sem antes
  confirmar que é essa mesma a causa do R$0 — pode ser só o Achado 1.
