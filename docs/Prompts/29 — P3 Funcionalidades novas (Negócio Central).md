### 29 — P3: Funcionalidades novas (Negócio Central) ⚪ AGUARDANDO DECISÃO DE INÍCIO

Consolida os itens de negócio ainda não construídos dos Épicos 1 e 2 do
`BACKLOG_V2.md`. Não são prompts prontos pra rodar — precisam de decisão
de escopo e ordem antes de virarem tarefa individual. Ordem sugerida
abaixo respeita dependências reais entre os itens (não é arbitrária).

**29.1 — Cash Flow com dado real de proventos (não mais só projetado)** 🟡 (BACKLOG_V2 1.2) — PROMPT PRONTO, ver abaixo

Base de tudo o que vem depois (29.3, IRPF). Escopo final, após discovery
completo e decisão do usuário de NÃO adicionar UI nova (nada de aba, nada
de seção de registro manual na v1) — só evoluir o que já existe com dado
real, mantendo a tela como está hoje.

**Achados que sustentam esse escopo:**
- `paidAmount` em `src/lib/cashflow.ts` é hoje FALSO — `if (i <
  currentMonthIndex) paidAmount = b.amount`, mesma matemática projetada
  só pintada de verde pros meses passados. Bug de credibilidade real.
- Brapi (`res.dividendsData.cashDividends`, ativos BR) e Yahoo
  (`res.events.dividends`, ativos US) JÁ retornam proventos por evento
  (não só total anual), com `paymentDate` e (na Brapi) `lastDatePrior` =
  Data-Com — dado descartado hoje por `sumByYear()`. Não precisa de
  registro manual nem integração B3 pra ter dado real de proventos.
- Decisão final do usuário (após reprovar duas propostas de UI nova): se
  a API já tem o dado, não faz sentido pedir pro usuário registrar nada
  na v1 — registro manual fica de fora do escopo, possível v2.

**Os 6 pontos aprovados** (ver Discovery de mercado 29.1 anterior pro
benchmark completo com Investidor10):
1. `paidAmount`/`announcedAmount` passam a vir de dado real da API, não
   mais da projeção repintada.
2. Terceiro gráfico NOVO, abaixo dos dois já existentes: por ativo, duas
   barras — valor investido (`averagePrice × quantity`, já disponível)
   vs. valor acumulado em proventos recebidos (soma dos eventos reais da
   API × quantidade atual).
3. Drill-down por mês (já existente) ganha o valor numérico por ativo —
   hoje só mostra a barra, sem número.
4. Rotular os montantes com formato compacto (`compactWithSymbol`, já
   existe em `CashFlowSummary.tsx`) nos lugares que hoje mostram valor
   por extenso.
5. Remover o botão de exportar CSV (`CashFlowHeader`, prop `onExportCsv`).
6. Trocar o título (`t.watchlist.cashFlowTitle` no i18n) de "Projected
   monthly cash flow" pra só "Cash Flow" (e equivalente nos 3 idiomas).

**Limitação conhecida, documentar em tooltip**: o "valor acumulado em
proventos" assume que a quantidade atual do ativo é a mesma que o
usuário tinha em cada pagamento passado — aproximado, não exato, se a
posição mudou ao longo do tempo (sem histórico de transação ainda).

---

**PROMPT PRONTO — 29.1**

```
29.1 — Cash Flow com dado real de proventos (não mais só projetado)

Contexto: a página Cash Flow (/app/cashflow, CashFlowCalendar.tsx) hoje 
é 100% projetada. O gráfico já tem um conceito visual de "Confirmed" 
(barra verde sólida, campo paidAmount em src/lib/cashflow.ts) vs 
"Projected" (barra translizida) — mas paidAmount é FALSO hoje: 
`if (i < currentMonthIndex) paidAmount = b.amount`, a mesma matemática 
de projeção mensal (annualDividend/12), só pintada de verde pra meses 
já passados. announcedAmount existe no tipo mas nunca é populado.

Ao mesmo tempo, as APIs já consumidas hoje JÁ retornam histórico de 
proventos por evento, não só total anual, e esse dado é descartado:
- src/lib/api/brapi.server.ts: res.dividendsData.cashDividends (ativos 
  BR) tem, por evento, paymentDate, lastDatePrior (= Data-Com) e rate 
  (valor por ação/cota). Cobre 5 anos (range=5y na URL).
- src/lib/api/yahoo.server.ts: res.events.dividends (ativos US/REITs) 
  tem amount e date por evento (sem separar data-com de pagamento).

Hoje ambos são colapsados em dividendHistory: [{year, amount}] via 
sumByYear() antes de chegar em qualquer componente.

DECISÃO DE ESCOPO (importante, já validada): NENHUMA UI de registro 
manual de provento entra nesta tarefa. Nada de aba nova, nada de botão 
"Registrar provento", nada de CRUD de lançamento. A página Cash Flow 
continua com a MESMA estrutura visual de hoje (2 gráficos + cards de 
resumo) — só fica mais honesta com dado real, mais um terceiro gráfico.

TAREFA:

1. Expor os eventos de dividendo por ativo (não só o agregado anual)
   Adicionar ao retorno de fetchFromBrapi/fetchFromYahoo (ou a uma nova 
   função auxiliar que os consome) um array de eventos brutos por ativo: 
   { exDate, paymentDate, amountPerShare }. Pra Brapi, exDate = 
   lastDatePrior; pra Yahoo, exDate = date (mesmo campo, sem separação). 
   Não remover dividendHistory nem sumByYear — eles continuam 
   alimentando o cálculo de valuation existente (getCanonicalAnnualDividend 
   e afins), que NÃO muda nesta tarefa. Isso é só uma exposição adicional 
   do dado que já vem da API, em paralelo ao que já existe.

2. paidAmount real em buildMonthlyBuckets (src/lib/cashflow.ts)
   Pra cada mês já passado, paidAmount deve vir da soma real dos eventos 
   de dividendo cujo paymentDate cai naquele mês, multiplicado pela 
   quantidade ATUAL do ativo (mesma limitação de sempre: não há 
   histórico de transação, então assume quantidade constante). Meses 
   futuros continuam projetados como hoje (projectedAmount, sem mudança). 
   announcedAmount pode ficar de fora se não houver sinal claro de 
   "anunciado mas ainda não pago" nos dados disponíveis — não inventar 
   esse dado, só usar o que a API realmente fornece.

3. Terceiro gráfico: investido vs. recebido, por ativo
   Abaixo dos dois gráficos existentes (mensal + acumulado) em 
   CashFlowChart.tsx, adicionar um gráfico de barras agrupadas por 
   ativo: barra 1 = valor investido (averagePrice × quantity, já 
   disponível no WatchlistItem), barra 2 = soma de todos os eventos de 
   dividendo recebidos daquele ativo × quantidade atual. Seguir o mesmo 
   padrão visual dos gráficos existentes (recharts, cores/tema atuais). 
   Incluir uma nota/tooltip curta explicando que o valor recebido assume 
   quantidade atual constante ao longo do tempo, não histórico exato.

4. Valor numérico no drill-down por mês
   No breakdown que já aparece ao clicar num mês (bloco 
   selectedMonthData em CashFlowChart.tsx, gráfico horizontal de 
   contribuintes), adicionar o rótulo de valor (compactWithSymbol) ao 
   lado de cada barra — hoje só mostra o ticker no eixo Y, sem número 
   visível na barra em si.

5. Remover exportação CSV
   Remover o botão de export em CashFlowHeader.tsx (prop onExportCsv) e 
   a chamada correspondente em CashFlowCalendar.tsx. Pode manter 
   exportCashFlowCsv em cashflow.ts sem uso, ou remover se não for usado 
   em nenhum outro lugar — confirmar antes de apagar a função em si.

6. Trocar o título
   A chave t.watchlist.cashFlowTitle (nos 3 dicionários) hoje diz algo 
   como "Projected monthly cash flow" — trocar pra só "Cash Flow" (e 
   equivalente natural em pt-BR e es, mantendo o padrão dos outros 
   títulos de página do app).

NÃO TOCAR:
- getAssetValuation, getCanonicalAnnualDividend e todo o motor de 
  valuation continuam exatamente como estão — essa tarefa não mexe em 
  preço-teto, margem de segurança, nem nenhum cálculo de valuation.
- Nenhuma tela de registro/edição manual de provento — fora de escopo 
  por decisão explícita.
- Não alterar a estrutura de dividendHistory/sumByYear usada hoje pelo 
  valuation — só adicionar exposição paralela dos eventos brutos.

CRITÉRIO DE SUCESSO: gráfico mensal com barras "Confirmed" batendo com 
proventos reais recebidos (não mais projeção repintada); terceiro 
gráfico novo (investido vs. recebido por ativo) abaixo dos dois 
existentes; drill-down por mês com valor numérico visível; sem botão de 
CSV; título "Cash Flow"; nenhuma UI de registro manual adicionada; tsc 
limpo, testes passando, confirmado ao vivo no navegador com a carteira 
de teste (ativos com histórico de dividendo real da API).
```

**Retorno ao plano de implementação (30/07/2026)** — plano revisado 
e aprovado com 3 correções, texto exato mandado de volta pro Antigravity:

```
O plano está aprovado, com 3 correções antes de começar a implementar:

1. No passo 3b (lógica de paidAmount real em buildMonthlyBuckets), o 
   trecho usa `bucketYear < currentYear`, mas `bucketYear` nunca foi 
   definido em lugar nenhum — nem no código real, nem no resto do seu 
   próprio plano. O buildMonthlyBuckets de hoje NÃO tem conceito de 
   múltiplos anos (é sempre um array fixo de 12 posições representando 
   os meses do ano corrente). Simplificar a condição pra só 
   `if (i < currentMonthIndex)`, exatamente como a lógica atual já usa — 
   sem introduzir nenhuma variável de ano nova.

2. O passo 4c usa `<LabelList>` do recharts pro rótulo de valor no 
   drill-down, mas o import atual no topo do CashFlowChart.tsx é 
   `import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, 
   ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";` — sem 
   LabelList. Adicionar ao import.

3. Respostas as 3 perguntas em aberto:
   - Q1 (amount continua sendo só projeção mesmo pra meses passados): 
     sim, confirmado, não mexer nisso.
   - Q2 (mês atual continua projetado mesmo com pagamento parcial já 
     ocorrido): sim, confirmado, não precisa checar paymentDate <= hoje, 
     manter simples.
   - Q3 (terceiro gráfico com muitos ativos): limitar aos top 10 ativos 
     por valor investido, mesmo padrão que o drill-down existente já usa 
     (`contributors.slice(0, 8)` em CashFlowChart.tsx) — manter 
     consistência com o que já existe no código, não inventar um limite 
     diferente.

Fora essas 3 correções, pode seguir com o plano exatamente como 
proposto — a arquitetura de useQueries + assetQueryOptions, a exposição 
de dividendEvents em paralelo ao dividendHistory existente, e as 6 
mudanças de UI estão todas corretas e batendo com o código real.
```

**Benchmark detalhado vs. Agenda de Dividendos do Investidor10:**
Eles têm: toggle lista/calendário, filtro Data-Com vs. Data de Pagamento,
busca por ticker, filtros por período/categoria/carteira, e um extra
avançado ("Radar de Dividendos Inteligente") que PREVÊ data de anúncio
futura por padrão histórico — esse último fica FORA de escopo do 29.1,
é feature de dados de mercado, não o que o 29.1 resolve. Toggle lista/
calendário e filtros avançados também ficam pra v2, não bloqueiam o
lançamento.

**Achado crítico (30/07/2026) — muda a arquitetura da feature:**
As APIs já consumidas hoje (`fetchFromBrapi` em src/lib/api/brapi.server.ts,
`fetchFromYahoo` em src/lib/api/yahoo.server.ts) JÁ retornam proventos
POR EVENTO, não só total anual — o código de hoje descarta isso
imediatamente via `sumByYear()`. Especificamente:
- Brapi (`res.dividendsData.cashDividends`, ativos BR): cada evento tem
  `paymentDate`, `lastDatePrior` (= Data-Com de verdade, mesmo campo que
  o Investidor10 usa) e `rate` (valor por ação/cota). Cobre 5 anos
  (`range=5y` na URL).
- Yahoo (`res.events.dividends`, ativos US/REITs): cada evento tem
  `amount` e `date` único (sem separar data-com de pagamento).

ISSO MUDA O ESCOPO DO 29.1: não precisa ser só registro manual. Pra
ativos já na carteira, a tela "Recebido" pode SUGERIR automaticamente os
eventos que a API já devolve, cruzando com a quantidade atual do ativo
— o usuário só confirma com 1 clique (ou ajusta a quantidade, caso a
posição tenha mudado no período, já que não há histórico de transação
ainda). Registro manual continua existindo pra cobrir o que a API não
pegar (ativos com fallback de corretora, atraso de atualização, etc.),
mas deixa de ser o único caminho. Isso aproxima bastante da experiência
"automática" do Investidor10 sem precisar de integração B3 de verdade.

Ajuste de schema decorrente: usar `exDate` (= `lastDatePrior` da Brapi)
em vez de `declaredDate` genérico, já nomeando certo desde o início.

**29.2 — Motor de WHT multi-moedas mais robusto** 🟡 (BACKLOG_V2 1.4)
Já existe tratamento de imposto (30% US / 0% BR / 15% JCP) na camada de
valuation. Falta um motor dedicado mais explícito pra múltiplas moedas, e
cupons de renda fixa internacional (hoje só BR). Não depende do 29.1.

**29.3 — Rentabilidade real vs. benchmark (TWR/IRR)** ⚪ (BACKLOG_V2 1.5)
Depende do 29.1 (dado real de transação) pra calcular TWR de verdade.
Comparar com CDI, IBOV, S&P 500 — fonte de benchmark externa a definir
antes de escrever o prompt.

**29.4 — Rebalanceamento por meta configurável** ⚪ (BACKLOG_V2 1.6)
Evolui o "Gap Filler" que já existe no Smart Allocation. Usuário define
alocação-alvo, app sugere aportes pra convergir. Não depende do 29.1.

**29.5 — Alertas dinâmicos e notificações (push/e-mail)** ⚪ (BACKLOG_V2 2.2)
Depende de infraestrutura de notificação (Firebase Cloud Messaging pro
push; Resend pro e-mail — já tem `RESEND_API_KEY` prevista no
`.env.example`, mas ainda não ativada, sem uso hoje). Confirmar
infraestrutura disponível antes de prometer canal de notificação em
qualquer prompt futuro.

**29.6 — Corrigir "Best Month" usando valor real + expandir massa de dados** ✅ CONCLUÍDO E CONFIRMADO (troféu agora compara contra o valor efetivamente exibido — real pros meses passados, projetado pro resto — em vez da projeção teórica fixa; massa de dados de DEV expandida de 8 pra 18 ativos, cobrindo mais padrões de pagamento pros 3 gráficos do Cash Flow)
Bug encontrado pelo usuário após testar a 29.1 ao vivo: o troéu de
"melhor mês" continuava comparando contra `b.amount` (projeção pura),
mesmo a barra visual já mostrando `paidAmount` real pros meses passados
— podia acender o troéu num mês que não era o mais alto na tela.
Corrigido em duas passadas: primeiro calcula o "valor efetivo" de cada
mês (real ou projetado, o que estiver sendo exibido), depois `isBest`/
`isWorst` comparam contra esse valor. Junto, `devMockData.ts` ganhou mais
10 ativos (6 BR: VALE3, ITUB4, MXRF11, CPTS11, IFRA11, EGIE3; 4 US: STAG,
JNJ, MPW, VYM), totalizando 18, pra estressar visualmente o terceiro
gráfico (corte de top 10) e a dispersão de meses de pagamento.

**Fora desta lista, tratados à parte por serem sensíveis:**
- Módulo de IRPF (BACKLOG_V2 2.3) — depende do 29.1; item com implicação
  financeira/legal real pro usuário, precisa de disclaimer e validação
  numérica manual contra casos conhecidos antes de produção. Não tratar
  como uma feature comum.
- Assistente de IA (BACKLOG_V2 2.1) — ver Tarefa 30.

Próximo passo real: você decidir por qual desses (29.1 a 29.5) começar —
sugiro 29.1 primeiro, já que é pré-requisito de dois outros itens. Depois
da decisão, eu monto o prompt individual completo (Contexto/Tarefa/Não
Tocar/Critério de Sucesso) só daquele item.

**Discovery de mercado (30/07/2026)** — pesquisa comparativa feita antes
de escopar qualquer prompt, sem depender de input adicional do usuário:

- **29.1 (proventos)**: confirmado como item OBRIGATÓRIO no mercado BR,
  não diferencial — Investidor10 e StatusInvest tratam histórico de
  proventos como core, distinguindo "a receber" (declarado) de "recebido"
  (pago), base pro módulo de IRPF de ambos. Schema recomendado:
  `declaredDate`, `paymentDate`, `grossValue`, `netValue` (já líquido do
  WHT calculado hoje), `type` (dividendo/JCP/rendimento FII).
- **29.3 (TWR/IRR)**: consenso técnico (Kitces, TFOCO, DonkyCapital) é
  mostrar os DOIS lado a lado, não escolher um — TWR responde "a
  estratégia foi boa?", IRR/XIRR responde "meu dinheiro rendeu quanto de
  verdade?" (pondera timing dos aportes). Sequência recomendada: XIRR
  primeiro (fórmula única por carteira, usa os mesmos dados do 29.1),
  TWR completo como fase 2 (exige encadear sub-períodos geometricamente).
- **29.4 (rebalanceamento)**: ferramentas internacionais conhecidas
  (Wealthfront, Betterment, M1 Finance) EXECUTAM ordem automaticamente —
  não se aplica, o app não é corretora. Categoria de mercado certa é tipo
  Passiv/Portfolio Genius: monitoram desvio da meta e SUGEREM aporte, sem
  executar. O "Gap Filler" já existente no Smart Allocation já está na
  categoria certa — só precisa virar meta configurável persistente.
- **29.5 (notificações)**: puramente infraestrutura (FCM + Resend), sem
  padrão de mercado a copiar — segue dependendo da decisão de ativar
  e-mail transacional.
- **29.2 (WHT)**: nicho, pouca literatura comparável, já parcialmente
  resolvido — baixa prioridade de pesquisa adicional.

---