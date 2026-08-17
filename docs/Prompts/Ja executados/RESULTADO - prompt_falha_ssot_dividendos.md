# RESULTADO — Correção Arquitetural da SSOT de Dividendos (Cash Flow vs. Aba Dividendos)

> **Data**: 17/08/2026  
> **Status**: Implementado & Validado com 100% de Sucesso  
> **Commit de Código**: [`7e489cf`](https://github.com/paulofuentealba/fuentepricepro/commit/7e489cf)  
> **Branch**: `dev`  
> **Conformidade**: 100% aderente a [`AGENTS.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/AGENTS.md) (Regras 1, 4, 8 e 9)

---

## 1. Diagnóstico e Confirmação das Hipóteses

### 1.1 Achado 1 — Segunda Implementação Divergente (Confirmada como Causa do R$0 e de Divergências de Valor)
- **Causa Raiz**: Na versão anterior de `computeInvestedVsReceived` (`src/lib/cashflow.ts`), a lógica de cálculo de dividendos recebidos:
  1. Filtrava eventos com `new Date(dateStr).getTime() >= it.investingSince`. **Em itens cujo `investingSince` foi gravado com data recente (ex: data do cadastro do item ou data de edição), todos os dividendos dos últimos 12 meses eram descartados (`totalReceived = 0`)**. Isso reproduziu e confirmou o bug de R$0 no `AFHI11`.
  2. Calculava valor **bruto** (`ev.amountPerShare * q`) sem considerar a retenção de impostos (15% JCP, 30% US Stocks).
  3. Não utilizava `getEffectiveTransactions`, ignorando o fallback de custódia sintética quando o investidor não mantinha o histórico detalhado de ordens.
- **Aba Dividendos (`DividendsHistoryPanel.tsx`)**: Utilizava a SSOT `calculateRealizedIncome`, calculando o valor líquido (`amountNet`) a partir do replay cronológico de transações.

### 1.2 Achado 2 — Concorrência de Queries em Lote no `CashFlowCalendar` (Análise de Infraestrutura)
- O `CashFlowCalendar.tsx` utiliza `useQueries` para buscar metadados de todos os ativos da carteira em paralelo.
- Em carteiras com 20+ ativos, chamadas concorrentes para APIs externas podem atingir rate-limit ou timeout (4s no HG Brasil), resultando em `dividendEvents: []` em cache temporário (`staleTime: 5 min`).
- **Proposta Arquitetural**: Conforme desenhado no Discovery do BFF (`discovery_arquitetura-dados-bff.md`), a solução definitiva para o Achado 2 é centralizar o catálogo em `/assets/{ticker}` no Firestore com cache server-side, eliminando as 15-30 chamadas HTTP concorrentes do cliente.

---

## 2. Ações Realizadas

### 2.1 Refatoração de `computeInvestedVsReceived` (`src/lib/cashflow.ts`)
- `computeInvestedVsReceived` foi completamente refatorado para utilizar `calculateRealizedIncome(effectiveTransactions, dividendEventsMap, assetMetaMap)`.
- Aplicação de `getEffectiveTransactions` para garantir fallback de custódia para posições sem livro de ofertas preenchido.
- Agrupamento de `amountNet * fx` por ticker normalizado, garantindo 100% de paridade com a aba Dividendos e os relatórios fiscais do Fuente Price Pro.

### 2.2 Cobertura de Testes Automatizados (`src/lib/__tests__/investedVsReceivedSsot.test.ts`)
Criada suite de testes cobrindo:
1. **FIIs (AFHI11)**: Isenção de IR garantindo `amountNet === amountGross`.
2. **Ações BR com JCP (BBAS3)**: Dedução correta de 15% de WHT (`amountNet = 0.85 * amountGross`).
3. **Stocks US (AAPL)**: Dedução de 30% de US Withholding Tax.
4. **Regressão de `investingSince`**: Ativo com `investingSince` recente não zera proventos se houver transações históricas.
5. **Fallback Sintético**: Ativos sem histórico explícito de transações calculam proventos com base na custódia atual.

---

## 3. Comparativo de Valores (Antes vs. Depois)

| Ticker | Tipo | Antes (`cashflow.ts` bruto/filtro `investingSince`) | Depois (`calculateRealizedIncome` líquido SSOT) | Impacto |
| :--- | :---: | :---: | :---: | :--- |
| **AFHI11** (100 cotas, R$ 1,00/cota) | FII | R$ 0,00 *(quando `investingSince` recente)* | **R$ 100,00** | Bug de R$ 0 eliminado; paridade com aba Dividendos. |
| **BBDC4** (100 ações, R$ 1,00 JCP) | Ação BR | R$ 100,00 *(bruto incorreto)* | **R$ 85,00** *(líquido com 15% IR)* | Correção contábil do valor que caiu na conta. |
| **AAPL** (10 ações, $ 1,00 dividendo) | Stock US | $ 10,00 *(bruto incorreto)* | **$ 7,00** *(líquido com 30% WHT)* | Correção contábil do valor creditado na corretora. |

---

## 4. Gates de Verificação de Qualidade (`AGENTS.md`)

```text
1. Guardrails Customizados:
   ✔ node scripts/check-ssot-leaks.js     -> OK: No SSOT leaks detected
   ✔ node scripts/forbid-legacy-tagline.js -> OK: No legacy tagline found

2. Verificação de Tipos:
   ✔ npx tsc --noEmit                     -> 0 erros (Clean)

3. Testes Automatizados:
   ✔ npm test                             -> 78 arquivos / 449 testes passando (100% sucesso)

4. Build de Produção:
   ✔ npm run build                        -> Sucesso em 1.25s
```
