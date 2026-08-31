# PROMPT — Fase 1 / Lote 1: 2 Achados Críticos do Sub-lote A
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

2 itens, plano/diff/gates individuais, não misturar commits. Branch: `git fetch origin dev:dev &&
git checkout dev && git pull origin dev`. 3 gates reais, output literal completo, sempre.

Ordem: **1 (NaN em Renda Fixa) → 2 (Shareholder Yield, Opção B — corrigir e conectar)**.

---

## ITEM 1 — NaN em `calculateFixedIncomeBalance` Contamina Patrimônio Consolidado

### Causa raiz confirmada (achado #2 do Sub-lote A, gravidade confirmada e ampliada)
```typescript
// calculations.ts:1366-1367
const principal = item.averagePrice * item.quantity;
const start = new Date(item.startDate).getTime(); // ❌ sem guard Number.isFinite
```
Se `item.startDate` for inválido, `start` vira `NaN`. `start > now` é `false` (comparação com NaN
sempre falsa), então o código prossegue: `elapsedDays = NaN`, `Math.pow(1+rate, NaN/365) = NaN`,
`accruedBalance = NaN`.

**Confirmei o raio de explosão real:** `getPositionValue` (que chama essa função) alimenta
diretamente `computeTotals` em `useValuedPortfolio.tsx` — um único ativo `FIXED_INCOME` com
`startDate` malformado contamina com `NaN` o **patrimônio consolidado inteiro** do usuário
(`consolidatedNetWorth`), não só aquele ativo isolado.

### Plano esperado
- **(a) Arquivo:** `src/lib/calculations.ts`, função `calculateFixedIncomeBalance`.
- **(b) Lógica:** adicionar guard `if (!Number.isFinite(start)) return { accruedBalance: principal,
  profit: 0 };` logo após calcular `start` — trata data inválida como se o título não tivesse
  rendido nada ainda (saldo = principal, lucro = 0), em vez de propagar `NaN`. Investigar se
  `item.averagePrice`/`item.quantity` também precisam do mesmo tipo de guard (podem ser
  `NaN`/inválidos por outra via?) antes de assumir que só `startDate` é o vetor de entrada ruim.
- **(c) Testes:** `startDate: "invalid"` deve retornar `accruedBalance = principal`, não `NaN`.
  Teste adicional confirmando que `getPositionValue` também não propaga `NaN` para
  `computeTotals`/`consolidatedNetWorth` nesse cenário (teste de integração curto, não precisa
  montar o hook inteiro — pode chamar `getPositionValue` direto com o item malformado).

---

## ITEM 2 — `calculateShareholderYield` Desconectado e com Escala Errada (Opção B)

### Decisão de escopo já fechada
Paulo escolheu a **Opção B**: corrigir a escala **e** conectar de verdade a função ao pipeline de
valuation, com teste end-to-end — não descartar o trabalho já feito.

### Causa raiz confirmada
```typescript
// calculations.ts:293 (retorno de calculateShareholderYield)
return (dividendsPaidTotal + netBuybackValue) / marketCap; // fração pura, ex: 0.048

// calculations.ts:613-614 (uso em valuateStockUS)
if (shareholderYield != null && shareholderYield > 0 && targetYield > 0) {
  shareholderYieldPrice = currentPrice * (shareholderYield / targetYield); // espera %, não fração
}
```
`targetYield` e o resto do arquivo tratam yield em **pontos percentuais** (ex: `6` para 6%), não
fração decimal. Se `calculateShareholderYield()` alimentasse `shareholderYieldPrice` hoje, o
resultado sairia 100× menor.

### Investigação obrigatória antes de codar
Busquei `bffAny["shareholderYield"]` (a origem real do parâmetro em produção hoje, via
`useValuedPortfolio.tsx:292`) em toda a camada `src/lib/api/*.server.ts` deste repositório e
**não encontrei nenhum lugar que compute esse campo**. Isso significa uma de duas coisas — **você
precisa confirmar qual antes de desenhar o plano de conexão:**
1. O campo `shareholderYield` do BFF vem de uma Cloud Function/serviço **fora deste repositório**
   (não acessível aqui), e hoje provavelmente retorna sempre `null`/`undefined` no ambiente atual
   (por isso "os testes passam por acaso" — na prática o campo nunca chega preenchido em
   produção real).
2. O campo existe em algum lugar que a busca não pegou (nome de campo diferente, ou dentro de uma
   `functions/` do Firebase que não faz parte de `src/`).

**Reporte o resultado dessa investigação antes de prosseguir com o plano de conexão.**

### Plano esperado (responda a investigação acima primeiro, depois o plano)
- **(a) Correção de escala (independente do resultado da investigação, fazer sempre):**
  `calculateShareholderYield` passa a retornar o valor em pontos percentuais (`× 100`), igual a
  todo o resto do arquivo — `return ((dividendsPaidTotal + netBuybackValue) / marketCap) * 100;`.
  Atualizar o JSDoc da função para deixar explícito "retorna em %, não fração decimal" — evita
  reincidência do mesmo tipo de bug de escala no futuro.
- **(b) Conexão real ao pipeline — depende da investigação:**
  - Se o campo vem de fora do repo (cenário 1 acima): conectar `calculateShareholderYield` no
    caminho **client-side** de `useValuedPortfolio.tsx` (`useValuedPortfolioClientSide`, não o
    caminho BFF), usando os dados que já estão disponíveis via `secEdgar.server.ts` (dividendos
    pagos, ações em circulação) para ativos `STOCK_US` — isso dá ao usuário o benefício da métrica
    mesmo sem depender do campo BFF externo. Investigar se `secEdgar.server.ts` já expõe
    `sharesOutstanding`/dividendos históricos suficientes para montar os 5 parâmetros que a função
    exige, ou se precisa de campo novo.
  - Se o campo existe em algum lugar acessível (cenário 2): conectar ali, e confirmar que o valor
    já sai na escala certa (%) ou também precisa de ajuste no ponto de origem.
  - **Não implemente uma conexão que você não consegue verificar de ponta a ponta.** Se a
    investigação não resolver com confiança suficiente onde/como conectar, reporte isso e proponha
    manter a correção de escala (item a) sozinha nesta rodada, com a conexão real como próximo
    passo separado — mesmo princípio de "não inventar no escuro" que já aplicamos ao rateio de
    taxas SINACOR.
- **(c) Testes:** teste end-to-end ligando `calculateShareholderYield` → `valuateStockUS`,
  confirmando que `shareholderYieldPrice` sai na escala correta (não 100× menor). Se a conexão
  real ao pipeline não for viável nesta rodada, o teste end-to-end ainda deve existir chamando as
  duas funções em sequência manualmente (não precisa da conexão em produção para validar a
  matemática).

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1 (mais simples e direto). Para o Item 2, a investigação da origem de
`bffAny["shareholderYield"]` é obrigatória e vem **antes** do plano de conexão — não pule direto
pra implementação sem reportar o que encontrou.
