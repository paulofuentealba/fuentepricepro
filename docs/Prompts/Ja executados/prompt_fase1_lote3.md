# PROMPT — Fase 1 / Lote 3: Achados Restantes (Sub-lotes A, B, C)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Plano/diff/gates individuais por item, não misturar commits. Branch: `git fetch origin dev:dev &&
git checkout dev && git pull origin dev` (deve estar em cima de todos os commits já mesclados,
incluindo o push consolidado pra `main`). 3 gates reais, output literal completo, sempre.

Ordem: **1 → 2 → ... → 8** conforme abaixo. Item 2 exige reverificação antes de codar — pode virar
"sem correção necessária".

---

## ITEM 1 — `gordonPrice` Retorna Negativo Exposto Sem Filtro (`calculations.ts:316-320`)

CAGR muito negativo faz `transitionValue` dominar e o preço final ficar negativo. `consensus`
filtra `> 0`, mas `methods.gordon`/`ValuationResult.gordon` expõem o número negativo cru.
**Plano:** `gordonPrice` retornar `null` quando o resultado for `≤ 0`. Teste com
`dividendCagr: -40`.

---

## ITEM 2 — `bogleModelCeiling` Sem Guard de Divisão — 🛑 Reverificar Antes de Codar

O achado original alegava risco de denominador ≤ 0 se `constituentGrowth` for muito negativo.
Investiguei antes de escrever este prompt: `constituentGrowth = dividendCagr != null &&
dividendCagr > 0 ? dividendCagr : 7.0` (linha ~1118) — **isso nunca é negativo**, é sempre
`dividendCagr > 0` real ou o fallback `7.0`. `requiredReturn` também é sempre positivo pela mesma
lógica de fallback. **O denominador parece estruturalmente impossível de ser ≤ 0 no código atual.**
**Plano:** confirme essa análise você mesmo antes de decidir. Se confirmar que é impossível,
reclassifique como "sem correção necessária" e não implemente nada — só documente a análise no
relatório. Se encontrar um caminho que eu não vi onde o denominador pode zerar, aí sim proponha o
guard.

---

## ITEM 3 — Fallback Genérico Ignora `customTaxRate` para USD (`calculations.ts:1274-1285`)

Para tipo de ativo desconhecido com `currency: "USD"`, usa `selicPct` (taxa BRL) como `k` e aplica
30% fixo em vez de `netAfterTax`. **Plano:** chamar `netAfterTax(avgDividend, type,
params.currency, params.customTaxRate)`. Investigar se `k` (taxa de desconto) também precisa de
ajuste por jurisdição antes de decidir — não é só a alíquota fiscal, é a taxa de desconto usada no
modelo. Reportar antes de implementar se achar que precisa de mais que 1 linha de mudança.

---

## ITEM 4 — Piotroski Penaliza Dívida Zero Sustentada (`calculations.ts:1534-1540`)

`leverageDecreasing: curr < prev` — empresa com dívida zero 2 anos seguidos (`0 < 0 = false`)
perde ponto de solidez financeira injustamente. **Plano:** `curr < prev || (curr === 0 && prev ===
0)` deveria pontuar como positivo (dívida zero sustentada é solidez, não neutralidade). Teste com
`currentDebt: 0, priorDebt: 0`.

---

## ITEM 5 — Composição Linear vs. Geométrica em IPCA+ (`calculations.ts:1380,1386`)

`effectiveRate = rates.ipca/100 + itemRate/100` (soma) em vez de `(1+ipca/100)*(1+itemRate/100)-1`
(produto, padrão B3/ANBIMA). Diferença ≈0,5 p.p. a.a. em cenário de IPCA alto. **Plano:** trocar
para composição geométrica. Investigar se `projectFixedIncomeValueAtMaturity` (já tocada no Lote 1
desta Fase) tem o mesmo padrão de soma linear para IPCA — se tiver, corrigir os dois juntos, não
deixar um consistente e outro não.

---

## ITEM 6 — Constantes Macro Internacionais Hardcoded (`calculations.ts:574,628,775,908,950,1071`)

`usTreasury10Y = 4.25`, `usDiscountRate = 0.085`, piso NTN-B `5.5`, spread REIT `2.75`, etc. — não
passam por `macroDefaults.ts`. **Plano:** centralizar como `US_TREASURY_10Y_FALLBACK`,
`US_COST_OF_EQUITY_FALLBACK`, `NTN_B_FLOOR_FALLBACK`, `REIT_TREASURY_SPREAD_FALLBACK` em
`macroDefaults.ts`, mesmo padrão de `EXCHANGE_RATE_FALLBACK`/`SELIC_FALLBACK`.

---

## ITEM 7 — Campo Morto `exchangeRate?` em `AssetValuationParams` (`calculations.ts:379`)

Declarado na interface, nunca consumido por nenhum dos 5 dispatchers. **Plano:** remover o campo
da interface (busque call sites que o preenchem antes de remover — se algum consumidor externo
passa esse campo esperando efeito, isso muda a decisão: documentar como "reservado" em vez de
remover).

---

## ITEM 8 — `useValuedPortfolio.tsx:291`: `yieldTrapWarning ?? false` Mascara Estado Indeterminado

`isYieldTrap()` retorna `null` para "dados insuficientes" (confirmei o tipo de retorno). O caminho
BFF faz fallback pra `false`, fazendo o aviso desaparecer como se o ativo tivesse sido avaliado e
aprovado, em vez de "não avaliado". **Plano:** trocar o fallback para `?? null`, propagando o
estado indeterminado real. Investigar se algum componente de UI trata `yieldTrapWarning` como
`boolean` estrito (quebraria com `null`) antes de mudar o tipo — se sim, ajustar o consumidor
também, não só a origem do dado.

---

## Itens Adicionais (Sub-lotes B e C) — Terminar Antes de Fechar o Lote

- **`realizedIncome.ts:52-53`**, `normalizeDateStr` com input numérico usa `.toISOString()` — mesmo
  padrão de off-by-one de fuso já corrigido em outros lugares via `getLocalDateISOString`. Reusar
  o mesmo SSOT aqui.
- **`cashflow.ts:72,370`**, `fxRate = 5.5` hardcoded como default de parâmetro (diferente da
  ocorrência de `useValuedPortfolio.tsx:262` já corrigida no Lote 2) — trocar por
  `EXCHANGE_RATE_FALLBACK`.
- **`dividendProjection.ts:12-13`**, `annualYield` aceita decimal ou percentual com heurística
  `> 1 → divide por 100` — API ambígua. Definir unidade única (decimal) na interface, remover a
  normalização automática, documentar contrato.
- **`dividendProjection.ts:50`**, `monthlyYieldRate = normalizedYield / 12` (linear) em vez de
  `Math.pow(1 + normalizedYield, 1/12) - 1` (geométrico) — subestima reinvestimento composto.
- **`suggestedAllocation.ts:284-285`**, ajuste de arredondamento sempre penaliza o maior bucket —
  pode gerar alocação incoerente em perfis com bucket já no teto. Adicionar teste parametrizado
  confirmando soma = 100 para os 36 cenários (6 perfis × algo relacionado a estratégias).
- **`hgBrasilClassification.server.ts:169`**, fallback pra `items[0]` quando nenhum item bate
  exato — pode pegar ticker parecido errado (ex: MXRF11 vs MXRF12). Retornar `null` + reportar
  status `INVALID` em vez de aceitar o primeiro resultado.
- **TTL de cache inconsistente entre fontes** (`hgBrasil.server.ts`, `dadosDeMercadoScraper.server.ts`,
  `assetCache.server.ts`, `fred.server.ts`, `hgBrasilClassification.server.ts`) sem SSOT — cada
  arquivo define seu próprio `CACHE_TTL_MS`. Centralizar em `macroDefaults.ts` ou um
  `cacheConfig.server.ts` novo, com constantes nomeadas e comentário justificando cada TTL.

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1. Item 2 pode virar "sem correção" após sua própria reverificação — não
implemente um guard pra um cenário que talvez seja matematicamente impossível sem confirmar
primeiro. Ao final do lote, isso fecha o Sub-lote A por completo e deixa só os itens remanescentes
dos Sub-lotes B e C.
