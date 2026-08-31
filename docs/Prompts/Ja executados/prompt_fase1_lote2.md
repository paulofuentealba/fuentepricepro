# PROMPT — Fase 1 / Lote 2: 7 Achados (Segurança + Divergências Cross-Cutting)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

7 itens, plano/diff/gates individuais, não misturar commits. Branch: `git fetch origin dev:dev &&
git checkout dev && git pull origin dev` (deve estar em cima dos 24 commits já mesclados). 3 gates
reais, output literal completo, sempre.

Ordem: **1 (5.75 trivial) → 2 (UTC/local) → 3 (IRR sintético) → 4 (realizedAmount, com validação
prévia) → 5 (CIK cache) → 6 (regex ticker) → 7 (API keys em URL)**.

---

## ITEM 1 — `useValuedPortfolio.tsx:262`: `5.75` Hardcoded (Resíduo do Lote 5)

Confirmado: `exchangeRate: fx?.USDBRL ?? 5.75` — resíduo que escapou da consolidação de
`EXCHANGE_RATE_FALLBACK`. Trivial: importar de `@/lib/macroDefaults` e substituir. 1 linha, gate
completo mesmo assim.

---

## ITEM 2 — `cashflow.ts`: Divergência UTC vs. Local em `computeCashFlowSummary`

### Causa raiz confirmada
`buildMonthlyBuckets` (linhas 75-251) usa `getUTC*` consistentemente (já corrigimos isso no Item
4/Lote 2 anterior). Mas `computeCashFlowSummary` (linhas 345-351) ainda usa `now.getMonth()` /
`now.getFullYear()` locais para indexar `data[currentMonthIdx]` — um array construído com buckets
baseados em UTC. Perto da meia-noite local em fuso GMT-3, os dois podem discordar sobre qual é "o
mês atual", desalinhando o índice.

### Plano esperado
- **(a) Arquivo:** `src/lib/cashflow.ts`, função `computeCashFlowSummary`.
- **(b) Lógica:** trocar `now.getMonth()`/`now.getFullYear()` por `now.getUTCMonth()`/
  `now.getUTCFullYear()`, alinhando com o resto do arquivo.
- **(c) Testes:** mock de horário perto da meia-noite local (mesmo padrão já usado nos testes de
  `getLocalDateISOString`) confirmando que `currentMonthIdx` bate com o índice usado em
  `buildMonthlyBuckets` para a mesma data.

---

## ITEM 3 — `portfolioIrr.ts`: Transação Sintética Usa `currentPrice` Quando `averagePrice` Ausente

### Causa raiz confirmada
```typescript
// getEffectiveTransactions, linha ~193-196
const price =
  item.averagePrice && item.averagePrice > 0
    ? item.averagePrice
    : item.currentPrice || 0;
```
Quando um ativo sem transações explícitas (posição de saldo manual) não tem `averagePrice`
cadastrado, a transação sintética de "compra inicial" usa o **preço atual** como custo — isso
zera artificialmente o ganho/perda daquele ativo no cálculo de IRR (comprou e "custou" o que vale
hoje, sempre).

### Plano esperado
- **(a) Arquivo:** `src/lib/portfolioIrr.ts`, função `getEffectiveTransactions`.
- **(b) Lógica:** mesmo princípio já aplicado ao longo desta investigação inteira (não inventar
  custo desconhecido) — usar `0` como `pricePerShare` quando `averagePrice` estiver ausente, não
  `currentPrice`. Investigar como o consumidor de `cashFlows` trata uma transação de custo `0` —
  confirmar que isso não gera IRR artificialmente **alto** (custo zero, qualquer retorno parece
  infinito) em vez de simplesmente indeterminado. Se gerar distorção na direção oposta, reportar
  antes de decidir — pode ser que a correção certa seja excluir esse ativo do cálculo de IRR
  inteiramente (não sintetizar transação nenhuma) em vez de usar `0`.
- **(c) Testes:** ativo sem `averagePrice` e sem transações explícitas — confirmar que a IRR
  resultante não fica nem artificialmente alta nem artificialmente baixa; se a decisão for excluir
  o ativo do cálculo, testar que ele não aparece nos `cashFlows`.

---

## ITEM 4 — `cashflow.ts:299`: `realizedAmount` Cai Pra Valor Projetado — Validar Antes de Corrigir

### 🛑 Investigação prévia obrigatória — pode ser um não-problema para usuários com ledger
```typescript
const realizedAmount = isPast ? (roundedRealized > 0 ? roundedRealized : effectiveAmounts[i]) : roundedRealized;
```
Analisei o código das duas passagens (`PASS 1` e `PASS 2`) antes de escrever este prompt: para
usuários **com** transações (`allRealizedEvents.length > 0`), `effectiveAmounts[i]` (usado no
fallback) já retorna exatamente `monthRealized` — o **mesmo valor** que `roundedRealized`. Ou
seja, para esse grupo de usuário, o fallback parece ser um no-op (cai pro mesmo zero). O risco real
parece existir só para usuários **sem** ledger de transações (modo convidado/saldo manual), onde
`effectiveAmounts[i]` usa um cálculo bruto diferente — mas aí pode ser comportamento **intencional**
(dois níveis de precisão: ledger vs. estimativa), não bug.

**Antes de propor qualquer correção:** escreva um teste que **prove** a distorção acontecendo para
um usuário **com** ledger de transações (não modo convidado) — se não conseguir fazer esse teste
falhar com o código atual, reporte que o achado pode ser um falso positivo para o caso com ledger,
e avalie se ainda vale mexer no caso sem ledger (e se esse caso é bug ou design intencional).

### Plano esperado
- **(a)** Teste de reprodução primeiro, como descrito acima.
- **(b)** Só depois de confirmar reprodução real: plano de correção.
- **(c)** Se não reproduzir, reportar como achado corrigido/reclassificado (mesmo padrão que já
  aplicamos ao achado #1 do Sub-lote A) e não implementar nada.

---

## ITEM 5 — `secEdgar.server.ts`: Cache de CIK Sem TTL de Falha (N+1 em Outage)

### Causa raiz confirmada
```typescript
if (!response.ok) {
  console.warn(...);
  return null; // ❌ cikCacheTimestamp nunca atualizado
}
```
Se a SEC estiver fora do ar, `cikCacheTimestamp` nunca é atualizado — toda chamada subsequente
tenta buscar de novo, sem backoff, até a SEC voltar.

### Plano esperado
- **(a) Arquivo:** `src/lib/api/secEdgar.server.ts`, função `getCikForTicker`.
- **(b) Lógica:** ao falhar, gravar um "cache de falha" com TTL curto (ex: 5 minutos) — não
  reutilizar a mesma variável `cikCache`/`cikCacheTimestamp` de forma que uma falha pareça sucesso;
  usar um marcador separado (ex: `lastFailureTimestamp`) para não confundir "sem dados por falha
  recente" com "sem dados porque o cache real está vazio".
- **(c) Testes:** simular falha consecutiva de fetch, confirmar que só 1 tentativa de rede ocorre
  dentro da janela de TTL de falha, não N tentativas.

---

## ITEM 6 — `dadosDeMercadoScraper.server.ts`: Ticker Não Escapado em `RegExp`

### Causa raiz confirmada
`anchorRegex = new RegExp(\`Histórico de dividendos de ${cleanTicker}...\`, 'i')` — `cleanTicker`
embutido sem escape. Tickers B3 reais são alfanuméricos simples, risco prático baixo hoje, mas
qualquer caractere especial de regex (`.`, `+`, `*`, etc.) quebraria o parse silenciosamente ou,
em cenário mais adverso, poderia ser manipulado se a origem do ticker não for 100% controlada.

### Plano esperado
- **(a) Arquivo:** `src/lib/api/dadosDeMercadoScraper.server.ts`.
- **(b) Lógica:** criar (ou reusar se já existir em algum lugar do projeto) uma função de escape
  de regex (`str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) e aplicar a `cleanTicker` antes de
  interpolar em qualquer `new RegExp(...)` do arquivo — buscar todas as ocorrências, não só a
  citada no achado original.
- **(c) Testes:** ticker sintético com caractere especial (mesmo que não exista na B3 hoje) não
  quebra o regex nem lança exceção.

---

## ITEM 7 — Chaves de API em URL (`hgBrasil.server.ts`, `fred.server.ts`)

### Precedente já confirmado no próprio projeto
`brapi.server.ts:13` já usa `Authorization: Bearer ${token}` — replicar esse padrão exato, não
inventar solução nova.

### Plano esperado
- **(a) Arquivos:** `src/lib/api/hgBrasil.server.ts`, `src/lib/api/fred.server.ts`.
- **(b) Lógica:** investigar se a API da HG Brasil e a API do FRED aceitam autenticação via header
  (`Authorization` ou header proprietário) em vez de query param — **não assumir que aceitam sem
  confirmar na documentação de cada uma**; se alguma delas só aceitar a chave via query string
  (comum em APIs mais simples), reportar isso e a mitigação vira "não logar a URL completa em
  nenhum catch/console.error" em vez de mover pra header. Não force um padrão que a API não suporta.
- **(c) Testes:** confirmar que nenhum `console.error`/`console.warn` do arquivo loga a URL
  completa com a chave — só a parte segura (endpoint, ticker, status).

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1. Item 4 é o único com uma etapa de validação/reprodução obrigatória antes do
plano de correção — não pule direto pra correção sem provar que o bug reproduz para usuário com
ledger.
