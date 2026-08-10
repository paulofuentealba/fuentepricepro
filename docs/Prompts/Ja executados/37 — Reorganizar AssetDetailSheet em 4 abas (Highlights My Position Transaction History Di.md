### 37 — Reorganizar AssetDetailSheet em 4 abas (Highlights / My Position / Transaction History / Dividends History) ✅ CONCLUÍDO E CONFIRMADO (4 abas pra ativos normais, 2 pra Renda Fixa, sem duplicação de pirâmide/AssetCard, DividendsHistoryPanel com resumo pessoal + tabela paginada de 10, 2 bugs de i18n achados e corrigidos: t.common.prev/next faltando e string hardcoded na aba Highlights de Renda Fixa)

Problema levantado pelo usuário: a tela lateral que abre ao clicar num ativo da Watchlist ficou grande demais depois da Tarefa 35 (Histórico de Transações empilhado em cima do resto).

**Achado ao explorar o código**: não é só volume de conteúdo — tem DUPLICAÇÃO real. `AssetDetailSheet.tsx` empilha `WowInsights` + `AssetHoldings` + `ConsensusPyramid` + `TransactionsPanel` + o componente `AssetCard` inteiro (variant="search", o mesmo usado nos resultados de busca) — que já tem sua PRÓPRIA pirâmide de valuation e preço atual, repetindo o que `ConsensusPyramid` e o header já mostram.

**Benchmark confirmado (30/07/2026)**: Snowball Analytics usa exatamente esse padrão de abas no detalhe de um ativo — "General" (dados financeiros + gráfico de preço), "Dividends" (analytics pessoal + histórico de pagamento em tabela e gráfico, juntos na mesma aba), "Financials". StatusInvest e Investidor10 seguem a mesma separação mercado/pessoal/proventos. Valida a estrutura abaixo.

```
37 — Reorganizar AssetDetailSheet em 4 abas

Contexto: src/components/ceiling/watchlist/AssetDetailSheet.tsx hoje empilha 
verticalmente WowInsights, AssetHoldings, ConsensusPyramid (ou 
FixedIncomePanel), TransactionsPanel, e o componente AssetCard inteiro 
(variant="search") — este último duplica pirâmide de valuation e preço 
atual que já aparecem antes. Não existe componente de Tabs no projeto 
hoje (confirmar em src/components/ui/ — não há tabs.tsx).

TAREFA:

1. Adicionar o componente Tabs do shadcn/ui (src/components/ui/tabs.tsx) 
   seguindo o mesmo padrão dos outros componentes ui/ já existentes 
   (mesma estrutura de Popover/Dialog/ToggleGroup já usados no projeto), 
   estilizado pro tema escuro atual (não o exemplo padrão claro do 
   shadcn).

2. Reestruturar AssetDetailSheet.tsx em 4 abas, SEM duplicar conteúdo:

   a) "Highlights": WowInsights (Investor Vision + Next Payment) + as 
      partes de MERCADO do AssetCard atual (gráfico de dividendos 
      1Y/3Y/5Y, EPS atual/próximo, preço atual) + ConsensusPyramid — sem 
      repetir a pirâmide duas vezes. O restante do AssetCard variant 
      "search" que não for usado aqui (ex: o botão "Add to Watchlist", 
      que não faz sentido dentro do detalhe de um ativo que já está na 
      watchlist) deve ser removido dessa composição, não escondido via 
      CSS.

   b) "My Position": AssetHoldings como já está hoje (Qtd, Margem de 
      Segurança, Renda Projetada, Valor da Posição, Yield on Cost, Meta). 
      Para ativos FIXED_INCOME, usar FixedIncomePanel aqui em vez de 
      AssetHoldings, mantendo o comportamento condicional que já existe.

   c) "Transaction History": TransactionsPanel como já está, sem mudança 
      de lógica — só muda de lugar. NÃO mostrar essa aba pra ativos 
      FIXED_INCOME (transações não se aplicam a eles neste momento).

   d) "Dividends History": aba NOVA, com duas partes:
      
      - Resumo pessoal (topo): último provento recebido (valor, data, 
        qual evento) e total recebido nos últimos 12 meses. Calcular a 
        partir do mesmo dividendEventsMap/transactions já disponíveis 
        via assetQueryOptions + useTransactions (mesmo padrão já usado 
        em TransactionsPanel/CashFlowCalendar) — filtrar eventos do 
        ticker atual, aplicar o mesmo gating por investingSince/addedAt 
        já estabelecido nas Tarefas 31/36, e usar getQuantityAtDate 
        quando houver transações (mesma lógica de computeInvestedVsReceived, 
        não reinventar).
      
      - Tabela de mercado paginada (abaixo): todos os dividendEvents do 
        ticker dos últimos 3 anos (a API já cobre esse período, 
        confirmar em brapi.server.ts/yahoo.server.ts se precisa ajustar 
        o range solicitado). Colunas: data (ex-date/data-com), data de 
        pagamento (quando disponível), valor por ação/cota. Paginação de 
        6-12 linhas por página (escolher um valor fixo razoável, ex: 10, 
        e reportar a escolha) — não carregar tudo de uma vez numa lista 
        longa.

3. Não mostrar a aba "Transaction History" nem a aba "Dividends History" 
   pra ativos FIXED_INCOME (não fazem sentido pra esse tipo hoje) — nesse 
   caso, manter só Highlights e My Position, ou ajustar pra 2 abas 
   quando o tipo for FIXED_INCOME.

NÃO TOCAR:
- Nenhuma lógica de cálculo muda — isso é reorganização de layout mais a 
  aba nova de histórico de mercado (que só lê dado que já existe).
- Não duplicar a pirâmide de valuation nem o preço atual em mais de um 
  lugar dentro da sheet inteira.

CRITÉRIO DE SUCESSO: a sheet lateral fica visivelmente mais curta em 
cada aba individual; nenhuma informação duplicada nas 4 abas somadas; 
aba Dividends History mostra resumo pessoal + tabela paginada de 3 anos; 
ativo FIXED_INCOME não mostra as abas que não se aplicam a ele; tsc 
limpo, testes passando, confirmado ao vivo no navegador comparando a 
altura da sheet antes/depois.
```

---

**PROMPT PRONTO — 31 (Camada 1)**

```
31 — Cash Flow: corrigir dividendo fantasma + modo "Minha Jornada"

Contexto: o Cash Flow (CashFlowCalendar.tsx) sempre mostra um array fixo 
de 12 meses (MONTHS_EN/MONTHS_PT, sempre Jan-Dez do ano corrente, sem 
conceito de ano múltiplo). buildMonthlyBuckets(items, currency, months, 
dividendEventsMap) em src/lib/cashflow.ts mapeia isso 1:1 por índice.

BUG REAL (não é só UX): o cálculo de paidAmount real (Tarefa 29.1) soma 
eventos de dividendo da API multiplicados pela quantidade ATUAL do ativo, 
sem checar se o usuário já possuía aquele ativo na data do evento. 
WatchlistItem.addedAt (timestamp de quando o ativo foi adicionado à 
carteira) existe mas não é usado nesse cálculo. Resultado: um ativo 
adicionado em julho pode aparecer com dividendo "recebido" em março, 
antes mesmo do usuário tê-lo comprado.

Benchmark de mercado confirmado (Snowball Analytics, StatusInvest, 
Investidor10) valida a solução: as 3 ferramentas usam a melhor data 
disponível de entrada do ativo como fronteira pro cálculo, nenhuma finge 
precisão que não tem.

TAREFA:

1. Corrigir o dividendo fantasma (prioridade máxima, é bug de dado)
   Em buildMonthlyBuckets, ao somar os eventos reais de dividendo de um 
   item pra calcular paidAmount, filtrar também por 
   `new Date(ev.paymentDate ?? ev.exDate) >= new Date(item.addedAt)`. 
   Eventos anteriores ao addedAt do item NÃO contam como recebidos. Isso 
   vale pros 3 lugares que consomem dividendEventsMap hoje: 
   buildMonthlyBuckets, computeInvestedVsReceived, e o drill-down por mês 
   em CashFlowChart.tsx (breakdown de contribuintes) — todos precisam 
   respeitar a mesma regra de corte, não só um lugar.

2. Toggle "Ano Calendário" / "Minha Jornada"
   Adicionar um seletor de modo em CashFlowCalendar.tsx (estado local, 
   não precisa persistir em settings por enquanto). 
   - "Ano Calendário": comportamento atual, Jan-Dez do ano corrente, 
     inalterado.
   - "Minha Jornada" (novo): calcular o menor addedAt entre todos os 
     items da carteira. Se essa data cair dentro dos últimos 12 meses, 
     o array de meses vai desse mês até o mês atual (pode ter menos de 
     12 posições, sem meses "mortos" antes do início). Se a data for 
     mais antiga que 12 meses atrás, usar uma janela rolante dos 
     últimos 12 meses (mesmo comportamento visual de hoje, evitando 
     arrays muito longos pra carteiras antigas — não é escopo desta 
     tarefa resolver histórico multi-ano completo).
   - Como os rótulos de mês hoje são strings simples ("Jan", "Fev"), e 
     esse novo modo pode atravessar virada de ano, os buckets do modo 
     "Minha Jornada" precisam de rótulo com ano quando necessário pra 
     desambiguar (ex: "Jan/25" vs "Jan/26" se a janela cruzar dois 
     anos) — avaliar a forma mais simples de fazer isso sem reescrever 
     toda a tipagem de MonthBucket, e reportar a abordagem escolhida.
   - Definir "Minha Jornada" como modo padrão (selecionado ao carregar a 
     página) quando a carteira tiver menos de 12 meses de histórico 
     (menor addedAt dentro dos últimos 12 meses); caso contrário, manter 
     "Ano Calendário" como padrão.

3. Marco visual de início
   No gráfico mensal (CashFlowChart.tsx), se o mês do menor addedAt da 
   carteira estiver dentro da janela visível (em qualquer um dos dois 
   modos), marcar visualmente esse mês — usar ReferenceLine do recharts 
   (mesmo padrão já usado pro "Best month", que tem o troféu) com um 
   ícone ou rótulo indicando início da jornada (ex: emoji 🌱 ou texto 
   curto "início"). Não remover ou conflitar com o marcador de 
   "Best month" já existente — se caírem no mesmo mês, os dois devem 
   conseguir coexistir visualmente.

4. i18n
   Os textos novos (labels do toggle "Ano Calendário"/"Minha Jornada", 
   texto do marco de início) precisam entrar nos 3 dicionários, sem 
   hardcode, seguindo a Golden Rule 2.

NÃO TOCAR:
- A regra de negócio de paidAmount pra meses futuros/atuais (projeção) 
  não muda — só a parte que já é real (Tarefa 29.1/29.6).
- getAssetValuation e o motor de valuation não mudam.
- O terceiro gráfico (Investido vs. Recebido) já filtra implicitamente 
  pelo dividendEventsMap corrigido no passo 1 — não precisa de UI nova 
  pra ele nesta tarefa, só herda a correção do gating.

CRITÉRIO DE SUCESSO: 
- Um ativo adicionado recentemente não mostra mais dividendo "recebido" 
  em meses anteriores à data em que foi adicionado — testar isso 
  especificamente com um ativo de addedAt recente na massa de teste.
- Toggle Ano Calendário / Minha Jornada funcionando, com Minha Jornada 
  não mostrando meses antes do início real da carteira de teste.
- Marco visual de início visível e não conflitando com o marcador de 
  Best Month.
- tsc limpo, testes passando, confirmado ao vivo no navegador.
```

**Plano de implementação aprovado (30/07/2026)** — 2 correcões solicitadas
e resolvidas corretamente pelo Antigravity antes de começar a codar:
1. `buildMonthlyBuckets` chamado 2x em `CashFlowCalendar.tsx` — sempre em
   modo `"calendar"` pros cards de resumo (`computeCashFlowSummary`
   intocado), e no modo ativo (`mode` state) pro `CashFlowChart`. Evita
   qualquer risco no `avg = total/12` e `next30` hardcoded.
2. Buckets do modo "journey" pré-construídos com `calendarMonth`
   explícito (0-11) por posição, usando `.find(b => b.calendarMonth ===
   m)` em vez de indexar direto no array — elimina risco de mapeamento
   errado mesmo com janela não alinhada ao calendário.

---