# PROMPT — Reordenar fallback de `dividendEvents`: HG Brasil → Dados de Mercado → Brapi
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Alteração de código autorizada, escopo travado no arquivo da Seção 2.
Regra 8 do `AGENTS.md`: gates obrigatórios, output literal. Regra 4 (SSOT):
esta mudança NÃO altera `dividendHistory`, `cagr`, `payoutRatio`,
`paymentMonths`, `dividends3y` — esses campos continuam exclusivos da
Brapi, decisão já aprovada e travada. O que muda é só a ordem de fallback
de `dividendEvents` (os campos `amount`/`exDate`/`paymentDate` por evento).

---

## 1. Motivo da mudança (decisão de Paulo, investigada e confirmada)

Ordem atual de fallback para `dividendEvents` em
`src/lib/api/brapi.server.ts`: **Brapi (implícito, primeira atribuição) →
HG Brasil (sobrescreve se não-vazio) → Dados de Mercado (só se ambos
vazios)**.

Nova ordem exigida: **HG Brasil → Dados de Mercado → Brapi (só se os dois
primeiros vierem vazios)**.

Justificativa técnica confirmada no código:
- Brapi (`res.dividendsData.cashDividends`) só tem `paymentDate`,
  `lastDatePrior` e `rate`. Não existe campo de data-ex real — o código
  usa `lastDatePrior` (data-com) como proxy de `exDate` por falta de opção
  melhor.
- Dados de Mercado (`dadosDeMercadoScraper.server.ts` linha ~131) extrai
  três colunas reais e separadas da tabela: `Registro`, **`Ex`** (data-ex
  de verdade) e `Pagamento`. É estruturalmente mais completo que a Brapi
  para esses três campos especificamente.
- HG Brasil, com o fix recente (`series` + `com_date`), já é a fonte mais
  completa e correta — continua primária, isso não muda.

---

## 2. Arquivo a alterar

`src/lib/api/brapi.server.ts`

### Estado atual (linhas ~101-135, aproximado — confira o número real antes de editar)

```ts
// Expose raw dividend events in parallel (does NOT affect valuation)
let dividendEvents: DividendEvent[] = cash
  .filter((d) => Number.isFinite(Number(d.rate)) && Number(d.rate) > 0)
  .map((d) => ({
    exDate: d.lastDatePrior ?? "",
    paymentDate: d.paymentDate ?? null,
    amountPerShare: Number(d.rate),
    isJCP: typeof d.label === "string" && d.label.toUpperCase().includes("JCP"),
  }))
  .filter((e) => e.exDate !== "");

// HG Brasil primary source for dividendEvents (fallback to Brapi if empty/null)
const hgRes = await fetchHgBrasilDividends(clean);
let roe: number | null = null;
let currentDy: number | null = null;

if (hgRes && hgRes.dividends && hgRes.dividends.length > 0) {
  dividendEvents = hgRes.dividends.map((d) => ({
    exDate: d.approvedDate ?? "",
    paymentDate: d.paymentDate ?? null,
    amountPerShare: d.amount,
    isJCP: typeof d.type === "string" && d.type.toUpperCase().includes("JCP"),
  })).filter((e) => e.exDate !== "");
}

// Dados de Mercado fallback for dividendEvents and supplementary indicators
const { fetchDadosDeMercado } = await import("./dadosDeMercadoScraper.server");
const dmRes = await fetchDadosDeMercado(clean);
if (dmRes) {
  if (dividendEvents.length === 0 && dmRes.dividendEvents.length > 0) {
    dividendEvents = dmRes.dividendEvents;
  }
  roe = dmRes.fundamentals.roe ?? null;
  currentDy = dmRes.fundamentals.dy ?? null;
  ...
```

### Novo comportamento exigido

Reescreva essa cadeia para que a atribuição de `dividendEvents` siga
estritamente esta ordem de prioridade: **HG Brasil não-vazio → Dados de
Mercado não-vazio → Brapi (`cash`, como último recurso)**. O Brapi deixa
de ser a atribuição inicial "otimista" e passa a ser calculado como
candidato de fallback final, só usado se os dois anteriores vierem vazios.

Direção da correção (não é diff pronto — adapte à estrutura real do
arquivo, mas a lógica final tem que ser exatamente esta prioridade):

```ts
// Brapi candidate (used only as final fallback for dividendEvents specifically —
// dividendHistory/cagr/payoutRatio/paymentMonths/dividends3y continue to use
// `cash`/`yearMap` directly below, untouched by this reordering).
const brapiDividendEvents: DividendEvent[] = cash
  .filter((d) => Number.isFinite(Number(d.rate)) && Number(d.rate) > 0)
  .map((d) => ({
    exDate: d.lastDatePrior ?? "",
    paymentDate: d.paymentDate ?? null,
    amountPerShare: Number(d.rate),
    isJCP: typeof d.label === "string" && d.label.toUpperCase().includes("JCP"),
  }))
  .filter((e) => e.exDate !== "");

let dividendEvents: DividendEvent[] = [];
let roe: number | null = null;
let currentDy: number | null = null;

// 1. HG Brasil — fonte primária
const hgRes = await fetchHgBrasilDividends(clean);
if (hgRes && hgRes.dividends && hgRes.dividends.length > 0) {
  dividendEvents = hgRes.dividends.map((d) => ({
    exDate: d.approvedDate ?? "",
    paymentDate: d.paymentDate ?? null,
    amountPerShare: d.amount,
    isJCP: typeof d.type === "string" && d.type.toUpperCase().includes("JCP"),
  })).filter((e) => e.exDate !== "");
}

// 2. Dados de Mercado — segunda fonte (antes da Brapi)
const { fetchDadosDeMercado } = await import("./dadosDeMercadoScraper.server");
const dmRes = await fetchDadosDeMercado(clean);
if (dmRes) {
  if (dividendEvents.length === 0 && dmRes.dividendEvents.length > 0) {
    dividendEvents = dmRes.dividendEvents;
  }
  roe = dmRes.fundamentals.roe ?? null;
  currentDy = dmRes.fundamentals.dy ?? null;
  // ... (preserve o restante do bloco supplementary indicators já existente aqui)
}

// 3. Brapi — último recurso, só se HG e Dados de Mercado vierem vazios
if (dividendEvents.length === 0 && brapiDividendEvents.length > 0) {
  dividendEvents = brapiDividendEvents;
}
```

**Atenção:** `dividendHistory`, `cagr`, `payoutRatio`, `paymentMonths`
(linhas ~90-99, que usam `cash`/`yearMap` diretamente, não a variável
`dividendEvents`) **não devem ser tocados**. Confirme visualmente antes de
finalizar que nenhuma dessas variáveis foi alterada — é a SSOT travada
(Regra 4), fora do escopo desta tarefa.

---

## 3. O que NÃO fazer

- Não mude a lógica de `dividendHistory`/`cagr`/`payoutRatio`/
  `paymentMonths`/`dividends3y` — continuam exclusivos da Brapi, sem
  exceção.
- Não mude a ordem de prioridade de nenhum outro campo do asset (ex:
  `roe`, `currentDy` continuam vindo de Dados de Mercado como já estava).
- Não toque em `hgBrasil.server.ts` nem em `dadosDeMercadoScraper.server.ts`
  — ambos já estão corretos, a mudança é só na orquestração em
  `brapi.server.ts`.
- Não faça commit nem push.

---

## 4. Teste a atualizar/criar

Verifique se existe suíte de teste para `fetchFromBrapi` cobrindo a lógica
de fallback de `dividendEvents`. Se existir, atualize os casos para
refletir a nova ordem. Se não existir, crie pelo menos 3 casos novos em
`src/lib/api/__tests__/brapi.server.test.ts` (crie o arquivo se não
existir):

1. HG Brasil retorna dados não-vazios → `dividendEvents` deve vir da HG
   Brasil, mesmo com Dados de Mercado e Brapi também tendo dados (mockar
   os três com valores diferentes para o teste ser um guard real).
2. HG Brasil vazio, Dados de Mercado não-vazio → `dividendEvents` deve vir
   de Dados de Mercado, não da Brapi (mesmo com Brapi tendo dados).
3. HG Brasil e Dados de Mercado vazios → `dividendEvents` deve vir da
   Brapi como último recurso.

---

## 5. Verificação obrigatória (Regra 8)

```bash
npx tsc --noEmit
echo %ERRORLEVEL%
npx vitest run src/lib/api/__tests__/brapi.server.test.ts
npx vitest run
npm run build
```

Cole os 5 outputs literais e completos, incluindo o código de saída do
`tsc`.

---

## 6. Entrega final

- Diff do arquivo alterado.
- Teste(s) novo(s)/atualizado(s) cobrindo os 3 cenários da Seção 4.
- Confirmação explícita de que `dividendHistory`/`cagr`/`payoutRatio`/
  `paymentMonths`/`dividends3y` não foram alterados (uma frase no
  relatório).
- Os 5 comandos de gate, output literal.
- **Não faça commit nem push.** Aguarde revisão de Paulo e Claude.
