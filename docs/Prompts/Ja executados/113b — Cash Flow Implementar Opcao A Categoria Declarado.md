# PROMPT 113b — Cash Flow: Implementar Opção A (Categoria "Declarado")
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Decisão de Paulo confirmada: **Opção A**. Investigação já foi feita
> no Prompt 113 original — este prompt é a execução, não repetir a
> investigação.

---

## Contexto — Já Confirmado (não reinvestigar)

- `announcedAmount` existe em `cashflow.ts:228`, hardcoded em `0`.
- `<Bar dataKey="announcedAmount" fill="url(#striped)">` **já existe**
  em `CashFlowChart.tsx` (stackId `"a"`, junto com `confirmedAmount` e
  `projectedAmount`), com o padrão SVG listrado já definido em `<defs>`.
- **O que falta, confirmado**: só a barra existe. Não há legenda, não
  há linha no tooltip customizado, não há chave i18n para
  "Declarado"/"Announced". Popular o dado sozinho não é suficiente —
  a barra listrada apareceria no gráfico sem nenhuma explicação visual
  do que ela significa.

## Tarefas

### 1. Popular `announcedAmount` de verdade em `cashflow.ts`
- Separar o que hoje está tudo misturado em `realizedAmount`:
  - `realizedAmount` passa a representar **estritamente** dinheiro já
    recebido — aplicar o mesmo gate `isPast` que `paidAmount` já usa
    (linha 227: `isPast ? effectiveAmount : 0`). Um provento só entra
    aqui se o mês do bucket já passou.
  - `announcedAmount` recebe os proventos com `exDate` já passada
    (direito confirmado) mas cujo mês de `paymentDate`/`exDate` de
    bucket **ainda não chegou** (`isPast === false`) — exatamente os
    casos que hoje inflam `realizedAmount` incorretamente em meses
    futuros.
- Cuidado: não duplicar contagem — cada evento deve cair em exatamente
  uma categoria (`paidAmount`/`realizedAmount` OU `announcedAmount` OU
  `projectedAmount`), nunca em duas.
- `confirmedAmount` em `CashFlowChart.tsx:65` continua usando
  `realizedAmount` (agora só "genuinamente pago") como prioridade
  sobre `paidAmount` — confirmar se essa prioridade ainda faz sentido
  após a separação, ou se deveria ser uma soma/lógica diferente agora
  que os 3 estados são distintos.

### 2. Legenda
- Adicionar terceiro item na legenda do gráfico (hoje só
  "Confirmed/Paid" e "Projected"), usando o padrão listrado (`url(#striped)`
  ou uma versão simplificada do mesmo padrão como ícone pequeno da
  legenda) + texto "Declarado" (pt-BR) / equivalente em en/es.
- Posicionar entre os outros dois itens de legenda, mantendo
  consistência visual com o estilo já usado (ponto colorido + label).

### 3. Tooltip
- `CustomTooltip` (o componente usado no `<ChartTooltip content={<CustomTooltip />}>`)
  precisa ganhar uma 3ª linha, exibindo o valor de `announcedAmount`
  quando > 0, com o mesmo formato de moeda já usado nas outras 2
  linhas (`formatCurrency`).
- Se `announcedAmount === 0` para o mês, não mostrar a linha (mesmo
  padrão de omissão condicional já usado no projeto — ver
  `DividendRadar.tsx` para o padrão de "só mostra se > 0").

### 4. i18n
- Adicionar chave nova (ex: `t.tabs.chart.announced`) nos 3
  dicionários — texto sugerido: "Declarado" (pt-BR), "Announced" (en),
  "Declarado" (es, confirmar se é o mesmo ou "Anunciado" soa melhor em
  espanhol — usar julgamento de tradução natural, não tradução
  literal palavra-por-palavra).

## Gate de Saída
- `npx tsc --noEmit`, `npx vitest run` (teste de regressão específico:
  provento com `exDate` passada e mês de pagamento futuro deve cair em
  `announcedAmount`, não em `realizedAmount`; provento genuinamente
  pago em mês passado continua em `realizedAmount`; nenhum evento
  duplicado entre categorias), `npm run build`.
- Teste manual visual: reproduzir exatamente as 3 capturas de tela que
  motivaram esse prompt (USD Dez, USD Nov, BRL Dez) — confirmar que a
  parte antes listrada de "declarado" aparece separada do "confirmado/
  pago" sólido, com legenda e tooltip corretos nos 2 idiomas testáveis
  (pt-BR e en no mínimo).

## Proibido
- Não remover ou esconder a informação de proventos declarados — o
  objetivo é categorizar corretamente, não ocultar.
- Não alterar `paidAmount` (esse já estava correto, com gate `isPast`
  desde o início) — só `realizedAmount` precisa do gate novo.
