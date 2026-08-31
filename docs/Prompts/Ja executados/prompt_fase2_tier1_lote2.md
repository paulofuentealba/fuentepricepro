# PROMPT — Fase 2 / Tier 1 / Lote 2: 8 Achados de Resiliência Temporal, Semântica Visual & Acoplamento
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Plano/diff/gates individuais por item, não misturar commits. Branch: `git fetch origin dev:dev &&
git checkout dev && git pull origin dev` (deve estar em cima de todos os commits do Lote 1 do
Tier 1, já mesclados em `main` e `dev`). 3 gates reais, output literal completo, sempre.

Contexto: estes são os 8 achados restantes do **Tier 1** da Fase 2 catalogados no relatório de
status consolidado (`docs/Prompts/relatorio_status_sweep_v2_fases_executadas_e_pendencias.md`,
Seção 3.A). Alguns têm semanas de defasagem desde a varredura original — **reconfirme cada um
contra o código atual antes de propor correção**, não assuma que a linha/comportamento citado
ainda está intacto sem verificar primeiro. Reporte o que encontrar (confirmado / alterado /
já corrigido por outro trabalho) antes de codar.

Ordem: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8** conforme abaixo.

---

## ITEM 1 — Fuso Horário em Renda Fixa e Proventos (Cluster 1 — Rank 9)

### Achado original
`AddFixedIncomeDialog.tsx:49-50` e `DividendsHistoryPanel.tsx:62-65`: uso do corte UTC
`toISOString().split("T")[0]` em vez do helper canônico `getLocalDateISOString()`
(`src/lib/formatters.ts`), que já é o SSOT estabelecido nesta investigação para evitar que,
depois das 21h em GMT-3, a data local salte silenciosamente para o dia seguinte.

### Plano esperado
- **(a) Arquivos:** `src/components/ceiling/watchlist/AddFixedIncomeDialog.tsx`,
  `src/components/ceiling/watchlist/DividendsHistoryPanel.tsx`.
- **(b) Lógica:** substituir todas as ocorrências de `toISOString().split("T")[0]` por
  `getLocalDateISOString(date)`, importado de `@/lib/formatters`. Confirmar que a assinatura da
  função aceita o mesmo tipo de entrada (`Date` vs. timestamp) usado em cada call-site — investigar
  antes de assumir.
- **(c) Testes:** simular uma data/hora após as 21h em GMT-3 (`America/Sao_Paulo`) e confirmar que
  a data calculada continua sendo o dia correto (não avança para o dia seguinte).

---

## ITEM 2 — Ordenação Cronológica e YoY no Histórico de Proventos (Cluster 5 — Rank 28)

### Achado original
`DividendHistoryChart.tsx:24-32`: o cálculo de crescimento ano-a-ano (YoY) não garante ordenação
estrita dos anos antes de calcular a variação, e o primeiro ano da série recebe `0.0%` artificial
em vez de `null`, simulando estagnação onde na verdade não há ano anterior para comparar.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/result/DividendHistoryChart.tsx`.
- **(b) Lógica:** ordenar explicitamente o array por ano (ascendente) antes do cálculo YoY;
  primeiro elemento da série ordenada deve retornar `null` para o campo YoY, não `0`.
- **(c) Testes:** série de anos fora de ordem produz YoY correto após ordenação; primeiro ano da
  série renderiza como "sem dado comparativo" (ou equivalente), não como `0,0%`.

---

## ITEM 3 — Card de Preço Teto com Falso Sinal Verde (Cluster 5 — Rank 52)

### Causa raiz confirmada (reconfirmado agora, ainda presente)
Em `ResultStats.tsx`, o card de "Preço Teto" é hardcoded com `border-success/30 bg-success/10`
independente do valor de `positive`/`margin`. O card vizinho de "Margem de Segurança" já implementa
a condicional correta (`!isUnavailable && positive ? "border-success/30 bg-success/10" :
"border-muted/30 bg-muted/10"`). O Preço Teto nunca reflete margem negativa visualmente.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/result/ResultStats.tsx`.
- **(b) Lógica:** aplicar ao card de Preço Teto a mesma condicional já usada no card de Margem de
  Segurança — `!isUnavailable && positive` decide entre o estilo `success` e um estilo neutro
  (`muted`), consistente com o padrão já estabelecido no componente vizinho.
- **(c) Testes:** margem negativa (`positive={false}`) não deve renderizar o card com estilo verde
  de sucesso; margem positiva mantém o estilo atual.

---

## ITEM 4 — Tag "Simulação" Indevida em Novos Ativos (Cluster 5 — Rank 40)

### Investigação necessária antes de codar
Confirme se `AssetComparator.tsx:341` ainda calcula `isSimulation` de forma que ativos pesquisados
mas ainda não salvos na carteira sejam incorretamente marcados como "Cenário/Simulação"
(`t.watchlist.simulationBadge`), quando deveriam ser tratados como "novo ativo, ainda sem posição"
— reporte o estado real da lógica antes de propor correção.

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/ceiling/AssetComparator.tsx`.
- **(b) Lógica:** corrigir a condição de `isSimulation` para retornar `false` quando o ativo é novo
  (não existe na watchlist salva), reservando o badge de simulação apenas para o caso real de
  parâmetros alterados manualmente pelo usuário sobre um ativo já salvo.
- **(c) Testes:** ativo novo pesquisado no comparador não exibe badge de simulação; ativo salvo com
  parâmetro manualmente alterado continua exibindo o badge corretamente.

---

## ITEM 5 — Colisão Visual em Popover de Busca (Cluster 5 — Rank 29)

### Investigação necessária antes de codar
Confirme se `TickerSearchField.tsx:93-220` ainda renderiza simultaneamente a lista de resultados
anterior e o estado "Buscando ativo..." durante uma nova busca (condição de corrida visual) —
reporte a estrutura atual do(s) container(es) de popover antes de propor a unificação.

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/shared/TickerSearchField.tsx`.
- **(b) Lógica:** unificar em um único container condicional que decide exclusivamente entre
  estado de loading, lista de resultados, ou estado vazio — nunca dois estados simultâneos.
- **(c) Testes:** durante uma busca em andamento, a lista anterior não deve permanecer visível
  junto com o indicador de "Buscando...".

---

## ITEM 6 — Possível Desduplicação de Observers de Dividendos (Cluster 4 — Rank 25)

### ⚠️ Nota de reconfirmação reforçada
Na revisão de hoje do `WatchlistKpiSection.tsx` (Item 3 do Lote 1), só foi identificado **um**
`useQueries` nesse arquivo (para `assetQueryOptions`, alimentando `dividendEventsMap`). Se o achado
original apontava duplicação **dentro** desse arquivo, pode já estar resolvido por trabalho
anterior — investigue também se a duplicação real está **entre** `WatchlistKpiSection.tsx` e
`NextPaymentBanner.tsx` (que recebe `dividendEventsMap` já calculado como prop, o que sugeriria que
não há duplicação ali) ou em outro consumidor de eventos de dividendo na mesma árvore. Reporte com
precisão onde a duplicação (se existir) realmente está antes de propor qualquer correção — não
presuma que o achado original de rank 25 ainda se aplica sem essa investigação.

### Plano esperado (somente se confirmado com localização exata)
- **(a) Arquivo(s):** a determinar pela investigação.
- **(b) Lógica:** eliminar a segunda instância de `useQueries`/fetch de eventos de dividendo,
  recebendo o mapa já compilado via prop do nível superior, seguindo o padrão que
  `NextPaymentBanner.tsx` já demonstra.
- **(c) Testes:** confirmar que o número de queries de rede para `dividendEvents` não duplica para
  o mesmo conjunto de tickers.

---

## ITEM 7 — Conversão Cambial Inline no Header do Sheet (Cluster 4 — Rank 33)

### Investigação necessária antes de codar
Confirme se `AssetDetailSheet.tsx:367-372` ainda multiplica diretamente `livePrice * fx.USDBRL`
em vez de usar a função SSOT `convertCurrency()` (`src/lib/currency.ts`) — mesma função já usada
corretamente no Item 3 do Lote 1 (`WatchlistKpiSection.tsx`).

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/ceiling/watchlist/AssetDetailSheet.tsx`.
- **(b) Lógica:** substituir a multiplicação inline por `convertCurrency(livePrice, "USD", "BRL",
  exchangeRate)` (ou direção equivalente conforme o caso), com fallback para `EXCHANGE_RATE_FALLBACK`
  quando a cotação não estiver disponível.
- **(c) Testes:** valor convertido bate com `convertCurrency()` chamado diretamente com os mesmos
  parâmetros; comportamento de fallback quando `fx` é `undefined`/`null`.

---

## ITEM 8 — Prop Morta `isPro` em ResultStats.tsx (Cluster 4 — Rank 37)

### Causa raiz confirmada (reconfirmado agora, ainda presente)
`ResultStats.tsx` declara `isPro: boolean` na interface `Props` e recebe o valor via destructuring,
mas nenhuma referência a `isPro` aparece no corpo do componente — toda a lógica de gate já usa
`useFeatureGate("customTaxUnlocked")` internamente. É prop mortas sendo passada pelo(s)
componente(s) pai sem efeito algum.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/result/ResultStats.tsx` e o(s) caller(s) que hoje passam
  `isPro` como prop (investigar todos os call-sites antes de remover, para não quebrar a assinatura
  em algum consumidor que ainda dependa dela por engano).
- **(b) Lógica:** remover `isPro` da interface `Props` e do destructuring; remover a prop de todos
  os call-sites confirmados.
- **(c) Testes:** `tsc --noEmit` limpo é o próprio teste de regressão aqui (remoção de prop não
  utilizada não deveria quebrar nenhum teste existente) — confirmar que nenhum teste referenciava
  `isPro` diretamente.

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão, como nos lotes anteriores.

---

## Lembrete Final

Comece pelo Item 1. Itens 4, 5, 6 e 7 exigem reconfirmação contra o código atual antes de propor
correção — o Item 6 em particular tem uma nota de reconfirmação reforçada acima, não pule essa
investigação. Item 8 exige mapear todos os call-sites antes de remover a prop.
