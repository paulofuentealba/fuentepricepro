# PROMPT — Tier 0 / Lote 3: 5 Correções (Fase 2 Sweep)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

5 itens, plano/diff/gates individuais, não misturar commits. Branch: `git fetch origin dev:dev &&
git checkout dev && git pull origin dev` (deve estar em cima dos 9 commits de Tier 0 já
mesclados). 3 gates reais, output literal completo, sempre.

Ordem: **1 → 2 → 3 → 4 → 5** (do mais simples/isolado ao que precisa de mais investigação).

---

## ITEM 1 — `formatExDate` Esconde Data-Com do Próprio Dia (`utils.ts`)

### Causa raiz confirmada
```typescript
// src/components/ceiling/watchlist/utils.ts:12
export function formatExDate(iso: string, locale: Locale): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  if (d.getTime() <= Date.now()) return null;
  ...
}
```
Comparação de timestamp bruto sem normalização de fuso — em fusos a oeste de Greenwich, uma
data-com que é hoje (mas já passou da meia-noite UTC) fica escondida como se já tivesse ocorrido.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/watchlist/utils.ts`. Reusar `getLocalDateISOString`
  (criado no Item 4 do Lote 2) para comparar por dia civil local, não por timestamp bruto —
  não reinventar lógica de data, já existe o SSOT.
- **(b) Lógica:** comparar `getLocalDateISOString(d) >= getLocalDateISOString()` (string ISO
  comparável lexicograficamente) em vez de `d.getTime() <= Date.now()`.
- **(c) Testes:** data-com de hoje (mock de horário perto da meia-noite local) deve continuar
  aparecendo, não sumir.

---

## ITEM 2 — `AllocationChart.tsx`: Câmbio Fallback Silencioso

### Causa raiz confirmada
```typescript
const exchangeRate = fx?.USDBRL ?? 5.5;
```
Sem indicação visual de que a pizza de alocação foi calculada com taxa estática quando a cotação
real falha.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/watchlist/AllocationChart.tsx` +
  `src/lib/macroDefaults.ts` (adicionar constante nova, ex: `EXCHANGE_RATE_FALLBACK = 5.5` — não
  reaproveitar `SELIC_FALLBACK`/`MACRO_RATES_FALLBACK`, são conceitos diferentes).
- **(b) Lógica:** usar a constante nova em vez do número solto. Adicionar indicador visual
  discreto (badge ou tooltip) quando `fx` for `undefined`/fallback, sinalizando "câmbio estimado".
  Investigar se outros componentes já têm um padrão de "badge de contingência" pra replicar
  (buscar antes de inventar um novo estilo).
- **(c) Testes:** teste do utilitário/constante nova; se o indicador visual for viável de testar
  via RTL, cobrir também.

---

## ITEM 3 — `AddToWatchlistDialog.tsx`: Sem Validação de Valor Negativo

### Causa raiz confirmada
```typescript
const avgNum = avg.trim() === "" ? null : Number(avg);
const goalNum = goal.trim() === "" ? null : Number(goal);
```
Só `qty` é validado (`qty <= 0` rejeitado); `avgNum`/`goalNum` aceitam qualquer número, inclusive
negativo.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/AddToWatchlistDialog.tsx`.
- **(b) Lógica:** rejeitar `avgNum < 0` e `goalNum < 0` com toast de erro, mesmo padrão de
  `invalidQuantity` já usado para `qty`. Confirmar se `averagePrice`/`targetMonthlyIncome` podem
  legitimamente ser `0` (provavelmente sim para `averagePrice` em caso de ativo recebido de
  bonificação) — não bloquear `0`, só negativo.
- **(c) Testes:** valor negativo em preço médio ou meta rejeitado com toast; zero continua aceito.

---

## ITEM 4 — `WatchlistTable.tsx`: Truncamento e Zeragem Silenciosa em Edição em Lote

### Causa raiz confirmada
```typescript
const newQty = parseInt(vals.qty, 10);
const qty = isNaN(newQty) || newQty < 0 ? 0 : newQty;
```
`parseInt` trunca frações de cota (ex: `10.5` vira `10`, sem aviso). Erro de digitação vira `0`
(zera a custódia) sem confirmação do usuário.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/watchlist/WatchlistTable.tsx`.
- **(b) Lógica:** trocar `parseInt` por `Number`/`parseFloat` (confirmar se frações de cota são
  um caso real do domínio — FIIs negociam em cotas inteiras, ações fracionárias existem no
  mercado BR — investigar antes de decidir se preserva ou não a parte decimal). Para o caso
  `isNaN`, **não zerar silenciosamente** — rejeitar a edição daquela linha específica com aviso,
  em vez de gravar `0` como se fosse intencional.
- **(c) Testes:** entrada não-numérica na edição em lote não deve resultar em gravação de `0` sem
  aviso; valor fracionário deve ser tratado conforme a decisão do item (a).

---

## ITEM 5 — Taxas de Corretagem Descartadas (`fees: null`) — Investigar Antes de Decidir

### Escopo real maior que o identificado originalmente
Busquei de novo e achei **6 ocorrências** de `fees: null` na construção de `Transaction`,
não só as 2 citadas no achado original:
```
BrokerNoteUploader.tsx:219
useWatchlistCsvImport.ts:100, 112, 234, 253, 267
```

### 🛑 Investigar antes de decidir — pode não ser bug
Para cada uma das 6 ocorrências, confirme: **a fonte de dado de origem (linha do PDF da nota, ou
coluna do CSV) contém informação de taxa/corretagem que está sendo ignorada**, ou o dado de
origem genuinamente não carrega esse campo (nesse caso `fees: null` é correto, não silencia
nada)? Isso muda completamente a natureza da correção:
- Se a fonte tem o dado e está sendo descartado: é bug real, extrair e propagar.
- Se a fonte nunca teve esse dado: não há nada a corrigir aqui — o "achado" vira, no máximo, uma
  sugestão de feature futura (permitir usuário informar taxa manualmente pós-import), não um bug.

### Plano esperado
- **(a) Investigação primeiro:** abrir `TradeRecord` (tipo usado por `BrokerNoteUploader`) e o
  parser de CSV avançado (`parseTransactionTemplateCsv`) — confirmar se algum desses tipos/
  parsers já captura taxa em algum campo que não está sendo usado, ou se nunca existiu.
- **(b) Reportar antes de codar:** volte com a resposta da investigação antes de propor qualquer
  mudança de código. Se for bug real, aí sim monte o plano de arquivos/lógica/testes. Se não for,
  diga isso explicitamente e não implemente nada — só registre no `BACKLOG_V2.md` como possível
  feature futura, se fizer sentido.

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1. Para o Item 5, pare na investigação da Seção (a) antes de propor qualquer
diff — pode não haver nada a corrigir.
