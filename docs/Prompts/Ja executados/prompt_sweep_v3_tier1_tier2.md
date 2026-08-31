# PROMPT — Sweep v3 / Fase 1 (Núcleo Financeiro): Tier 1 + Tier 2
> Copiar e colar no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Branch dev, a partir do commit `d25bd08` (Sweep v2 já fechado e documentado —
este é um ciclo novo e separado, "Sweep v3", não reabre o SSOT.md do v2). Todos os 7 itens abaixo
foram verificados por mim direto nos arquivos reais antes deste prompt existir — não é preciso
reconfirmar achado, só implementar a correção. Execute Tier 1 primeiro; só siga pro Tier 2 depois
do Tier 1 commitado (ou se eu liberar explicitamente em paralelo).

## Classificação PM (fuente-product-manager)
Tier 1: severidade ALTA — um é dado financeiro incorreto exibido ao usuário (bug de câmbio), o
outro é endpoint público sem sanitização (mesma classe de risco que já corrigimos na Fase 3).
Tier 2: severidade BAIXA-MÉDIA — i18n, paridade de export, robustez de borda sem impacto imediato
em produção.

---

# TIER 1

## ITEM 1 — Bug de agregação cambial no resumo do BFF (score 28, o mais grave)

**Arquivo:** `src/lib/portfolioBffLogic.ts`, função `computeValuedPortfolioInternal`.

**Problema (confirmado, e pior do que a descrição original):** a função recebe `exchangeRate` como
parâmetro de entrada (`FetchValuedPortfolioInput.exchangeRate`), mas **esse parâmetro nunca é usado
em lugar nenhum do corpo da função**. O `summary` (`totalInvested`, `currentValue`,
`totalDividends`) soma `it.totalCost`/`it.totalValue`/`it.totalDividends` de todos os itens direto,
misturando BRL e USD na mesma soma escalar sem qualquer conversão. Uma carteira com ativos BR e US
ao mesmo tempo exibe um "total" numericamente sem sentido.

**Plano de implementação:**
- Investigar primeiro como `useValuedPortfolio.tsx` (frontend) já isola conversão cambial — o
  relatório indica que esse isolamento já existe lá; confirme o padrão exato antes de replicar.
- Usar a função SSOT `convertCurrency` (já usada em `realizedIncome.ts` e `dataExport`-adjacent
  módulos) para converter `totalValue`, `totalCost`, `totalDividends` de cada item para uma moeda
  de referência (BRL, consistente com o resto do BFF) antes de somar no `summary` — nunca reimplementar
  a conversão como multiplicação solta.
- **Não altere `items[].totalValue`/`totalCost`/`totalDividends` individuais** — esses continuam na
  moeda nativa do ativo (isso é o contrato hoje e telas dependem disso). A conversão acontece só na
  hora de compor o `summary`.
- Adicionar teste cobrindo especificamente uma carteira mista BR+US com `exchangeRate` != 1,
  verificando que `summary.currentValue` reflete a soma convertida corretamente — esse é o teste que
  faltava e que teria pego o bug antes.

**Risco:** médio-alto — toca o cálculo central de resumo de carteira, usado por
`useValuedPortfolio`. Testar contra todos os testes existentes de `portfolioBff.test.ts`.

## ITEM 2 — Validador ausente em `fetchAssetPriceHistoryFn` (score 30, maior pontuação)

**Arquivo:** `src/lib/apiService.functions.ts` (função `fetchAssetPriceHistoryFn`).

**Problema (confirmado):** `.validator((data: {...}) => data)` — passthrough total, sem
sanitização de `ticker` nem de `fromDate`/`toDate`, ao lado de `fetchBenchmarkHistoryFn` (mesma
arquivo, poucas linhas abaixo) que já tem allowlist e regex ISO desde a Fase 3.

**Plano de implementação:**
- Aplicar `sanitizeTicker` + `TICKER_RE` (já existentes no topo do arquivo) ao campo `ticker`.
- Aplicar a mesma `sanitizeBenchmarkDate` (já existente, usada por `fetchBenchmarkHistoryFn`) aos
  campos `fromDate`/`toDate` — reusar a função existente, não duplicar lógica de validação de data.
- Se ticker ou datas inválidas, retornar `[]` graciosamente (mesmo padrão de
  `fetchBenchmarkHistoryFn`), não lançar exceção que quebre a tela.
- Adicionar teste cobrindo ticker/datas malformadas, seguindo o mesmo padrão dos testes já
  existentes para `fetchBenchmarkHistoryFn`.

**Risco:** baixo — é endpoint isolado, correção aditiva de validação.

---

# TIER 2

## ITEM 3 — CSV do Cash Flow: hardcode em inglês + paridade de colunas (score 20)

**Arquivo:** `src/lib/cashflow.ts`, função `exportCashFlowCsv`.

**Problema (confirmado):** cabeçalho fixo `["Month", "Amount", "Cumulative", "Currency",
"Contributors"]` em inglês, e o CSV só exporta `amount`/`cumulativeTotal` — não exporta
`paidAmount`, `realizedAmount`, `announcedAmount`, `projectedAmount`, que já existem no
`MonthBucket` e são renderizados na tela atual.

**Plano de implementação:**
- Adicionar as chaves de cabeçalho do CSV nos 3 dicionários i18n (`dict.ptBR.ts`, `dict.en.ts`,
  `dict.es.ts`) — zero hardcode, seguindo o padrão de nomenclatura já usado no resto do
  `cashflow`/`fiMode` namespace.
- `exportCashFlowCsv` passa a receber `locale` (ou as strings de cabeçalho já traduzidas) como
  parâmetro — investigar qual chamador (`CashFlowPage` ou equivalente) já tem `locale` disponível
  no escopo antes de decidir a assinatura.
- Adicionar as 4 colunas decompostas (`paidAmount`, `realizedAmount`, `announcedAmount`,
  `projectedAmount`) ao CSV, mantendo `amount`/`cumulativeTotal` como estão hoje.

**Risco:** baixo — export só, não altera cálculo nem tela.

## ITEM 4 — Strings PT hardcoded em `formatMonthsAsYearsMonths` (score 16)

**Arquivo:** `src/lib/formatters.ts`.

**Problema (confirmado):** `"ano"`, `"anos"`, `"mês"`, `"meses"`, `"menos de 1 mês"`, `" e "` são
literais em português dentro da função, usada em `HorizonteHero.tsx:264`, vazando PT pra usuários
em EN/ES.

**Plano de implementação:**
- Adicionar parâmetro `locale: Locale = "ptBR"` à assinatura de `formatMonthsAsYearsMonths`.
- Investigar se já existem chaves canônicas de contagem singular/plural nos 3 dicionários (o
  relatório menciona `fiMode.yearSingle`/`yearPlural` como já existentes — confirmar nome exato e
  namespace antes de usar; se não existirem, criar seguindo o padrão de nomenclatura já usado para
  outras strings de contagem no projeto).
- Atualizar o chamador em `HorizonteHero.tsx:264` para passar o `locale` ativo do contexto i18n.
- Manter o comportamento de fallback (`"menos de 1 mês"` traduzido) e a lógica de omitir parte
  zerada — só trocar a fonte das strings, não a lógica de formatação.

**Risco:** baixo — função pura, mudança de assinatura com valor default preserva compatibilidade
com qualquer outro chamador não migrado ainda (mas confirme se há outros chamadores antes de
assumir que só `HorizonteHero.tsx` usa essa função).

## ITEM 5 — `groupRealizedIncomeByMonth` sem suporte cambial (score 16)

**Arquivo:** `src/lib/realizedIncome.ts`.

**Problema (confirmado):** soma `ev.amountNet` direto na moeda nativa de cada evento, sem
`currency`/`fxRate`, diferente de `computeRealizedIncomeSummary` (mesmo arquivo, poucas linhas
acima) que já usa `convertCurrency(ev.amountNet, ev.currency, currency, fxRate)`. Hoje só é
consumida por `AssetMonthlyDividendChart` (gráfico de ativo único, sempre mono-moeda), mas não tem
salvaguarda para uso futuro multi-moeda.

**Plano de implementação:**
- Adicionar parâmetros opcionais `currency?: Currency` e `fxRate?: number` à assinatura de
  `groupRealizedIncomeByMonth`, com comportamento retrocompatível: se `currency` não for passado,
  manter o comportamento atual (soma na moeda nativa) — não quebrar o chamador existente
  (`AssetMonthlyDividendChart`) que não precisa de conversão.
- Quando `currency` for passado, aplicar `convertCurrency(ev.amountNet, ev.currency, currency,
  fxRate)` antes de somar, mesmo padrão de `computeRealizedIncomeSummary`.
- Adicionar teste cobrindo o caso com `currency` explícito e eventos multi-moeda.

**Risco:** baixo — aditivo, retrocompatível, sem chamador afetado que não opte explicitamente.

## ITEM 6 — Fallback cambial literal em `fetchExchangeRatesFn` (score 15)

**Arquivo:** `src/lib/apiService.functions.ts`.

**Problema (confirmado):** `const fallback = { USDBRL: 5.5 };` — literal solto, em vez de referenciar
`EXCHANGE_RATE_FALLBACK` (já exportado por `macroDefaults.ts` e já importado neste mesmo arquivo
para outro uso).

**Plano de implementação:**
- Substituir `{ USDBRL: 5.5 }` por `{ USDBRL: EXCHANGE_RATE_FALLBACK }`.
- Confirmar que `EXCHANGE_RATE_FALLBACK` tem o mesmo valor numérico hoje (5.5) antes de trocar —
  se o valor da constante já divergiu do literal, isso é achado extra a reportar, não a corrigir
  silenciosamente neste item.

**Risco:** trivial — troca de literal por constante já existente, mesmo valor.

## ITEM 7 — Heurística redundante de moeda em `portfolioIrr.ts` (score 15)

**Arquivo:** `src/lib/portfolioIrr.ts`, função `buildCashFlowsFromPortfolio`.

**Problema (confirmado):** `const isUsd = ev.taxType === "us_dividend" || isUsdAsset(ev.ticker,
assetCurrencies);` — checa `taxType` (heurística) antes de `ev.currency`, que já existe tipado e
preenchido em `RealizedIncomeEvent`.

**Plano de implementação:**
- Trocar a checagem para usar `ev.currency === "USD"` como primeira fonte de verdade, mantendo
  `isUsdAsset(ev.ticker, assetCurrencies)` como fallback apenas se `ev.currency` estiver ausente
  (não deveria acontecer no fluxo normal, mas mantenha a robustez de borda).
- Confirmar que nenhum teste existente dependia do comportamento antigo de forma que quebre com a
  troca de prioridade — rodar a suíte completa antes de considerar concluído.

**Risco:** baixo — `ev.currency` e `taxType === "us_dividend"` deveriam ser sempre consistentes
hoje; a mudança é de robustez/clareza, não de comportamento esperado em caso normal.

---

## Roles Governança (Rule 9) — aplica a todo o Tier 1 + Tier 2

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório padrão |
| fuente-solution-architect | SIM | Item 1 é decisão de arquitetura financeira (onde a conversão cambial deve viver no BFF) — não é fix mecânico |
| fuente-investidor-profissional | SIM | Item 1 é exatamente o tipo de erro que um investidor profissional detectaria auditando o resumo da carteira — rigor de cálculo |
| fuente-investidor-iniciante | NÃO | Nenhum item é sobre onboarding/complexidade de tela para iniciante |
| fuente-product-marketing | NÃO | Sem impacto em posicionamento/copy de venda |
| fuente-ux-designer | NÃO | Nenhuma mudança visual de layout, só correção de dado e i18n |
| fuente-business-architect | NÃO | Não altera modelo de negócio |
| fuente-advogado-lgpd-gdpr | NÃO | Nenhum item toca dado pessoal |
| fuente-product-manager | SIM | Classificação de severidade acima |

## Gates de Verificação (obrigatórios, output literal, por Tier)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Rode os 3 gates ao final do Tier 1 e traga o diff completo (`git diff src/`) antes de eu aprovar
esse commit. Só depois disso siga pro Tier 2, com os mesmos 3 gates e diff completo ao final.
Não resuma output — cole o terminal completo, incluindo contagem de arquivos, duração e exit code.
