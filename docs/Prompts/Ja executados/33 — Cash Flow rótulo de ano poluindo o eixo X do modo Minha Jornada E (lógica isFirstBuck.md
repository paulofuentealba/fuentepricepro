### 33 — Cash Flow: rótulo de ano poluindo o eixo X do modo "Minha Jornada" ✅ CONCLUÍDO E CONFIRMADO (lógica isFirstBucket || isYearChange verificada no código)

Após testar a 31 ao vivo, o usuário achou o eixo X do gráfico mensal
poluído: toda etiqueta de mês no modo "Minha Jornada" que cruza virada de
ano vem com `/25` ou `/26` grudado (ex: "Aug/25 Sep/25 Oct/25..."),
repetindo o ano 11 vezes numa fileira sem espaço. Benchmark de mercado
(Google Finance, TradingView, Snowball Analytics): o ano só aparece na
etiqueta quando muda (ou no primeiro mês da janela, pra dar contexto de
largada) — nunca repetido em toda etiqueta do mesmo ano.

```
33 — Cash Flow: mostrar o ano só quando muda no eixo X

Contexto: em src/lib/cashflow.ts, na construção dos bucketTemplates 
(Tarefa 31), a lógica atual é:

  const isCrossYear = startYear !== endYear;
  let label = monthsLabels[m];
  if (mode === "journey" && isCrossYear) {
    label = `${label}/${y.toString().slice(2)}`;
  }

Isso aplica o sufixo de ano em TODA etiqueta sempre que a janela cruza 
virada de ano, não só no mês em que o ano realmente muda — resultado: 
"Aug/25 Sep/25 Oct/25 Nov/25 Dec/25 Jan/26 Feb/26..." em vez de 
"Aug/25 Sep Oct Nov Dec Jan/26 Feb...".

TAREFA: mudar a condição pra só adicionar o sufixo de ano quando:
(a) for o primeiro bucket da janela (dá contexto de largada), OU
(b) o ano desse bucket for diferente do ano do bucket anterior na 
    sequência (é exatamente onde o ano muda).
Em todos os outros casos, a etiqueta continua só "Jan", "Fev", etc., 
sem sufixo. Isso vale só pro modo "journey" — modo "calendar" nunca tem 
sufixo de ano (comportamento atual, não muda).

NÃO TOCAR: nenhuma outra parte da lógica de buildMonthlyBuckets muda — 
isso é só o texto do label, não afeta calendarMonth/calendarYear 
nem nenhum cálculo.

CRITÉRIO DE SUCESSO: no modo "Minha Jornada" cruzando virada de ano, só 
o primeiro mês da janela e o mês onde o ano muda mostram o sufixo 
(ex: "Aug/25 Sep Oct Nov Dec Jan/26 Feb Mar Apr May Jun Jul"); modo 
"Ano Calendário" continua sem nenhum sufixo, igual antes.
```

---