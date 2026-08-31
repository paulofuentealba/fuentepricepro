# PROMPT — Tier 0 / Lote 4 (FINAL): 4 Correções — Fecha o Tier 0 Inteiro
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Últimos 4 itens do Tier 0 — sem backlog, tudo resolvido nesta rodada. Plano/diff/gates
individuais por item, não misturar commits. Branch: `git fetch origin dev:dev && git checkout dev
&& git pull origin dev` (deve estar em cima de todos os commits de Lote 1-3 já mesclados). 3 gates
reais, output literal completo, sempre.

Ordem: **1 (CSV fees round-trip) → 2 (FIProgressCard) → 3 (SnowballSimulator) →
4 (PortfolioIrrCard)**.

---

## ITEM 1 — CSV de Transações: Taxa Perdida no Round-Trip (Achado Novo do Item 5/Lote 3)

### Causa raiz confirmada
`buildTransactionsCsv` (`src/lib/csv.ts:52-53`) exporta com header
`["Ticker", "Tipo", "Quantidade", "Preço", "Taxas", "Data", "Notas"]` — a coluna "Taxas" existe
de verdade no arquivo exportado. Mas `parseTransactionTemplateCsv` (`src/lib/csv.ts:470+`), que
lê o template avançado de import, **nunca procura por essa coluna** — o objeto `idx` que mapeia
cabeçalhos não tem nenhuma chave para taxa/fees. Resultado: exportar → reimportar o mesmo arquivo
perde a taxa silenciosamente, mesmo estando no arquivo.

### Plano esperado (responda antes de codar)
- **(a) Arquivos:** `src/lib/csv.ts` (`ParsedTransactionTemplateRow` ganha `fees?: number | null`;
  `idx` ganha mapeamento pra coluna de taxa, aceitando aliases PT/EN como já é padrão no resto do
  arquivo — `taxas`, `fees`, `corretagem`, `taxa`) + `useWatchlistCsvImport.ts` (propagar
  `row.fees` em vez de `fees: null` nos 2 call sites que processam `ParsedTransactionTemplateRow`
  — linhas 100/112 da investigação anterior, **não** nas linhas 234/253/267, que são reconciliação
  sintética sem fonte de taxa real, essas continuam `null` corretamente).
- **(b) Lógica:** parsing tolerante a vírgula/ponto decimal (reusar `parseCurrencyValue`, já
  existe no arquivo, não reinventar). Coluna ausente no CSV (usuário usando template antigo sem
  "Taxas") deve continuar funcionando normalmente com `fees: null` — isso não é regressão, é
  compatibilidade retroativa.
- **(c) Testes:** round-trip real — `buildTransactionsCsv` com taxa → `parseTransactionTemplateCsv`
  → taxa preservada. CSV sem coluna de taxa continua funcionando (`fees: null`, sem erro).

---

## ITEM 2 — `FIProgressCard`: Meta de Custo de Vida Sem Moeda Associada

### Causa raiz confirmada (mais precisa que o achado original)
`src/lib/useFIProgress.ts` — `monthlyCostGoal = settings.monthlyLivingCostGoal || 0` é usado cru,
sem conversão, enquanto `currentMonthlyIncome` é corretamente convertido via `toUserCurrency`. A
interface `UserSettings` (`src/lib/useUserSettings.ts:10-15`) tem `monthlyLivingCostGoal?: number`
mas **nenhum campo de moeda associado**. Se o usuário trocar `displayCurrency` depois de já ter
salvo a meta, o número bruto é reinterpretado na nova moeda — daí a distorção de ~5,5×.

O mesmo padrão bugado se repete em `FIProgressCard.tsx` (linha ~79, `monthlyCostGoal`), que
duplica a lógica do hook — **confirmar se o componente ainda faz esse cálculo em paralelo ao hook
`useFIProgress`, ou se já delega 100%** (investigar antes de assumir duplicação).

### Plano esperado
- **(a) Arquivos:** `src/lib/useUserSettings.ts` (adicionar `monthlyLivingCostGoalCurrency?:
  Currency` ao `UserSettings`) + `src/lib/useFIProgress.ts` (converter `monthlyCostGoal` para a
  `displayCurrency` ativa quando `monthlyLivingCostGoalCurrency` diferir, usando
  `convertCurrency`/`convertToBRL` já disponíveis no arquivo) + `FIProgressCard.tsx` (gravar
  `monthlyLivingCostGoalCurrency: currency` junto com o valor em `handleSaveSettings`).
- **(b) Migração de dado legado:** usuários que já têm `monthlyLivingCostGoal` salvo sem
  `monthlyLivingCostGoalCurrency` (campo `undefined`) — decisão: tratar como se já estivesse na
  `displayCurrency` atual no momento da leitura (não há como saber retroativamente em que moeda
  foi digitado, e assumir a moeda atual é o comportameno menos surpreendente — não gera distorção
  nova, só não corrige retroativamente uma distorção que talvez já exista). Não decidir migração
  de dado do Firestore em lote — isso é só leitura defensiva no client.
- **(c) Testes:** meta salva em BRL, troca de `displayCurrency` para USD, `coveragePercent`/
  `targetCapital` devem refletir a conversão correta, não o número bruto reinterpretado.

---

## ITEM 3 — `SnowballSimulator`: Descarta Ativos Fora da Moeda Ativa (Não Ignora `useValuedPortfolio`)

### Correção ao achado original
O componente **já usa** `useValuedPortfolio()` (`valuedItems: items`) — a caracterização original
("ignora useValuedPortfolio") está imprecisa. O bug real é este filtro:
```typescript
// SnowballSimulator.tsx, dentro do useMemo de currentTotal/blendedYield
for (const item of items) {
  if (item.isClosedPosition || item.currency !== currency) continue; // ❌ descarta cross-currency
  const value = item.currentPrice * item.quantity; // ❌ valor de mercado bruto, sem conversão
  ...
}
```
Ativos que não batem com `settings.displayCurrency` são **excluídos inteiramente** do total e do
yield simulado, em vez de convertidos. Um usuário BRL com posições em USD vê a bola de neve
simulada com patrimônio inicial menor do que o real.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/SnowballSimulator.tsx`.
- **(b) Lógica:** seguir o mesmo padrão de consolidação já usado em `useFIProgress.ts`
  (`getPositionValue` + `convertCurrency`/`convertToBRL` + `toUserCurrency`) — não filtrar por
  moeda, converter todos os itens pra `displayCurrency` ativa. Precisa de `fx`/`exchangeRateQueryOptions`
  no componente (confirmar se já importa, senão adicionar).
- **(c) Testes:** carteira mista BRL+USD, simulação deve refletir o total consolidado, não só a
  fatia que bate com a moeda ativa.

---

## ITEM 4 — `PortfolioIrrCard`: Contaminação Cambial na TIR

### Causa raiz confirmada
`src/components/ceiling/cashflow/PortfolioIrrCard.tsx:63-79`:
```typescript
const nativeCurrentValue = useMemo(() => {
  const matchingItems = (items || []).filter((it) => /* bate com activeCurrency */);
  if (matchingItems.length > 0) {
    return matchingItems.reduce((acc, it) => acc + it.quantity * it.currentPrice, 0);
  }
  return currentPortfolioValue > 0 ? currentPortfolioValue : 0; // ❌ injeta total BRL consolidado como se fosse nativo
}, [items, assetCurrencies, activeCurrency, currentPortfolioValue]);
```
Quando não há nenhum ativo na moeda ativa (`matchingItems.length === 0`), o fallback injeta
`currentPortfolioValue` — que é o total **consolidado em BRL** (`totals.consolidatedNetWorth`,
vindo do pai) — como se fosse o valor nativo na moeda selecionada. Se `activeCurrency === "USD"`
e o usuário não tem nenhum ativo em USD, o card mostra o patrimônio total em BRL como se fosse
USD, contaminando o fluxo de caixa final usado no cálculo de IRR.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/cashflow/PortfolioIrrCard.tsx`.
- **(b) Lógica:** trocar o fallback para `0` — se não há nenhum ativo na moeda ativa, o valor
  nativo naquela moeda é legitimamente zero, não o total de outra moeda. Confirmar como o
  consumidor do IRR resultante lida com fluxo final zero (não deveria quebrar o cálculo, só
  resultar num IRR não significativo/`null` para esse cenário — investigar `calculateIrr` antes
  de assumir).
- **(c) Testes:** usuário 100% BRL com `activeCurrency` alternado pra USD → `nativeCurrentValue`
  deve ser `0`, não o total BRL.

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1. Isto fecha o Tier 0 inteiro — não deixe nada pendente ou "para depois" ao
final desta rodada.
