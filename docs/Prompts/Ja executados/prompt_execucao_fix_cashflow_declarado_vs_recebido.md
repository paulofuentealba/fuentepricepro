# PROMPT — Correção: Declarado vs. Recebido no Cash Flow (Bug Crítico)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Regra 8 do `AGENTS.md`: responda primeiro com o plano no formato da Seção 4
deste prompt. Eu e Claude revisamos antes de você tocar em qualquer arquivo.

Branch: `git fetch origin dev:dev && git checkout dev && git pull origin dev`
antes de qualquer coisa. Sem `git push` sem autorização explícita depois dos
3 gates confirmados com output literal.

---

## 1. Contexto e Causa Raiz (já diagnosticado — não reabrir a investigação)

**Sintoma:** proventos com `paymentDate` futura aparecem na UI do Cash Flow
como "Dividendos Recebidos" (ícone de check verde), quando na verdade são
apenas anunciados/declarados — o dinheiro ainda não caiu na conta.

**Causa raiz confirmada (auditoria de código real, não suposição):**

`calculateRealizedIncome` (`src/lib/realizedIncome.ts`) calcula **direito**
ao dividendo (posse confirmada na data-com), mas **nunca verifica se a data
de pagamento já passou**. O nome da função ("Realized") sugere liquidação,
mas ela só garante titularidade.

3 consumidores dessa função reinferem "isPast" cada um à sua maneira, sem
uma flag central:
- `computeRealizedIncomeSummary` (`realizedIncome.ts:217-234`) — soma tudo
  que cai no ano/mês corrente por `payDate.startsWith(...)`, sem checar se
  `payDate <= hoje`.
- `cashflow.ts:169-200` (bucket mensal) — `contrib.paidAmount` só é computado
  dentro de `if (isPast)`; meses futuros ficam sem essa distinção.
- `cashflow.ts:253-255` — `announcedAmount = !isPast ? roundedBucketRealized : 0`
  — todo mês futuro herda o resultado bruto de `calculateRealizedIncome` como
  "anunciado", mesmo sem checar liquidação.
- `CashFlowChart.tsx:63-70` e tooltip (~128-138) — `confirmedAmount` cai em
  cascata `realizedAmount → announcedAmount → paidAmount`, e o rótulo fixo
  `"Dividendos Recebidos"` com ícone de check é usado para os 3 casos sem
  diferenciação visual.

**Achado adicional (bug independente, mesma área de código, corrigir junto):**
`cashflow.ts:72-73` usa `.getFullYear()`/`.getMonth()` (fuso **local**) para
`currentYear`/`currentMonthIndex`, enquanto `cashflow.ts:188,247` usa
`.getUTCMonth()`/`.getUTCFullYear()` (fuso **UTC**) para comparar a data dos
eventos com o bucket do mês. Mistura de fuso local/UTC no mesmo cálculo de
"isPast" — baixo risco de disparo hoje (Cloud Run roda UTC), mas errado por
princípio e barato de corrigir agora que estamos nessas mesmas linhas.

**Precedente relevante:** o padrão de uso amplo de `calculateRealizedIncome`
foi consolidado no commit `7e489cf` ("unify dividend SSOT"), que corrigiu uma
divergência anterior entre a aba Dividends e o Cash Flow. Este bug é efeito
colateral dessa correção — não é negligência antiga, é uma lacuna semântica
que sobrou depois de um fix bem-intencionado. Ao corrigir agora, não reverta
o que o `7e489cf` resolveu (a unificação da fonte continua certa — o que
falta é granularidade de settlement dentro dela).

---

## 2. Decisão de Arquitetura (ADR resumido — já decidido, seguir)

**Decisão:** adicionar campo `isPaid: boolean` a `RealizedIncomeEvent`,
calculado **uma única vez**, dentro da própria `calculateRealizedIncome`
(`src/lib/realizedIncome.ts`):

```typescript
isPaid: ev.paymentDate != null && ev.paymentDate <= todayISOString
```

(usando comparação de string ISO `YYYY-MM-DD`, consistente com o resto do
arquivo, que já normaliza datas com `normalizeDateStr`).

Os 3 consumidores (`computeRealizedIncomeSummary`, `cashflow.ts`,
`CashFlowChart.tsx`) devem **ler essa flag**, não reinferir "isPast" cada um
à sua maneira. Isso foi avaliado contra 2 alternativas (filtro duplicado em
cada consumidor; função paralela `calculateSettledIncome`) e rejeitado por
risco de divergência futura — a flag centralizada é a única opção que blinda
qualquer consumidor futuro que venha a usar `calculateRealizedIncome`.

**Rejeitado:** não criar uma segunda função. Não fazer o filtro só no nível
de "mês passado/futuro" (a granularidade certa é por evento individual, não
por bucket mensal — um mês "futuro" pode ter um evento já pago antes de hoje
dentro dele, e vice-versa).

---

## 3. Terminologia e Estados Visuais — Decidido, Seguir Exatamente

3 estados, sem variação:

| Estado | Condição | Rótulo | Ícone/Cor |
|---|---|---|---|
| **Recebido** | `isPaid === true` | `t.tabs.chart.receivedDividends` (mantém chave existente) | Check verde sólido (`var(--realized)`) — mantém como está hoje |
| **A Receber** | `isPaid === false` mas evento existe (declarado) | Nova chave `t.tabs.chart.receivableAnnounced` = "A Receber" (não "Declarado / A Receber" — sem barra) | Badge em tom neutro-positivo (âmbar/dourado suave) — **não usar emerald**, que é cor de CTA primário do design system (hue 162), reservado para ação, não para informação passiva |
| **Estimado** | Projeção sem evento real anunciado | Nova chave `t.tabs.chart.estimatedProjection` = "Estimado" (substituindo qualquer menção a "Projetado Residual" — "residual" é jargão de planilha, não linguagem de produto) | Hachurado, `var(--projected)` — mantém como está hoje |

No badge do estado "A Receber", incluir a data de pagamento prevista ao lado
(ex: "A Receber · 03/set") — carrega a informação que o rótulo sozinho não
dá, sem precisar de tooltip para o dado principal (padrão UX do projeto:
tooltip é contexto, não definição).

Tooltip inline na primeira aparição do estado "A Receber" (uso do
`paymentDateEstimated` existente para diferenciar data confirmada vs
estimada dentro do próprio "a receber", se aplicável) explicando em 1 linha:
"A empresa já anunciou, mas o pagamento ainda não caiu na conta."

---

## 4. Formato de Plano Obrigatório — Responda Antes de Codar

### (a) Arquivos
No mínimo, espera-se tocar em:
- `src/lib/realizedIncome.ts` — adicionar `isPaid` a `RealizedIncomeEvent`
  e à lógica de `calculateRealizedIncome`; corrigir
  `computeRealizedIncomeSummary` para usar a flag em vez de só `payDate.startsWith`.
- `src/lib/cashflow.ts` — usar `isPaid` em vez de reinferir por bucket;
  corrigir a mistura local/UTC em `currentYear`/`currentMonthIndex` (linhas
  72-73) para usar `getUTCFullYear()`/`getUTCMonth()`, consistente com o
  resto do arquivo.
- `src/components/ceiling/cashflow/CashFlowChart.tsx` — 3 estados visuais
  em vez de 2 (atualmente cai tudo em `confirmedAmount` vs `projectedSum`);
  novo badge "A Receber" com data.
- `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` — chaves novas
  `receivableAnnounced` e `estimatedProjection`; auditar se
  `"Projetado Residual"` ou equivalente existe em algum lugar como chave
  órfã a remover.
- Arquivos de teste correspondentes a cada um dos 3 acima (existentes +
  os novos casos da Seção 5).

Se identificar mais arquivos consumindo `RealizedIncomeEvent` ou
`calculateRealizedIncome` diretamente (buscar antes de assumir que são só
esses 3), liste todos antes de começar.

### (b) Lógica Central
Para cada arquivo, descreva exatamente onde `isPaid` é lido, e confirme que
nenhum consumidor voltou a reinferir "isPast" no nível de bucket/mês para os
2 estados que dependem de settlement por evento.

### (c) Pontos de Atenção & Decisões (risco → decisão)
Cobertura mínima obrigatória:
- **Retrocompatibilidade de export CSV/Excel:** o perfil profissional deste
  produto usa exportação de dados de cash flow. Confirme se a exportação
  existente precisa herdar a mesma distinção de 3 estados (coluna nova) ou
  se fica fora do escopo desta rodada — não decidir sozinho, perguntar.
- **`paymentDateEstimated`:** eventos com data de pagamento estimada (não
  confirmada por fonte real) — como eles se comportam na nova flag `isPaid`?
  Um evento com `paymentDateEstimated: true` e data estimada no passado deve
  contar como pago? Proponha a decisão e justifique, não assuma.
- **Mobile (Regra 5):** como o novo badge "A Receber" + data se comporta em
  ≤375px, especialmente dentro do tooltip do Recharts (historicamente frágil
  neste projeto em mobile) — descrever explicitamente, não deixar implícito.
- **i18n:** confirmar que nenhuma chave nova fica hardcoded, e que chaves
  órfãs relacionadas ao texto antigo (se "Declarado" ou "Residual" já
  existirem em algum dicionário) são removidas dos 3 arquivos.

---

## 5. Testes Obrigatórios (cobertura que faltava e permitiu o bug passar)

Adicionar, no mínimo:
1. `calculateRealizedIncome`: evento com `paymentDate` **futura** em relação
   a um `now` mockado → `isPaid === false`, e não deve ser somado como
   recebido em nenhum agregador downstream.
2. `computeRealizedIncomeSummary`: evento futuro não deve entrar em
   `currentYear`/`currentMonth` como "recebido" — deve aparecer separado
   (verificar se `announcedTotal` ou equivalente precisa existir nesse nível
   também, não só em `cashflow.ts`).
3. Teste de fronteira de mês/fuso: evento no dia 1º do mês, comparando
   resultado do bucket sob mock de fuso local diferente de UTC — trava o
   achado da Seção 1 (mistura getFullYear/getUTCFullYear).
4. `CashFlowChart.tsx` (ou lógica extraída dela): mês com evento `isPaid:
   false` deve renderizar o badge "A Receber", não o check verde de
   "Recebido".

---

## 6. Gates Obrigatórios (Output Literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

Mais validação visual manual (screenshot mobile + desktop): mês atual/futuro
com evento declarado deve mostrar badge "A Receber" com data, não check
verde. Mês passado com evento pago continua mostrando "Recebido" normalmente
— **não regredir o caso que já funciona certo hoje**.

---

## 7. Governança de Roles — Tabela Completa Obrigatória no Relatório Final

Todos os 9, com Sim/Não + motivo. Pelo menos `fuente-architecture-review`,
`fuente-solution-architect`, `fuente-investidor-profissional` (export CSV) e
`fuente-ux-designer` (terminologia/cor) devem estar marcados como usados,
já que a decisão de cada um foi incorporada diretamente neste prompt.

---

## 8. Lembrete Final

Bug Crítico (SLA imediato, conforme classificação de produto) — mas isso não
dispensa plano escrito antes de código. Comece pela Seção 4. Sem `git push`
sem autorização explícita depois dos gates confirmados.
