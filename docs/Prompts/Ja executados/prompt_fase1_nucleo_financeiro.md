# PROMPT — FASE 1: Varredura Multi-Lente do Núcleo Financeiro
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO — SÓ DIAGNÓSTICO, ZERO CÓDIGO

Mesma disciplina da Fase 2: **nenhuma alteração de código nesta rodada.** Sua entrega são as
tabelas de achados da Seção 5, no mesmo formato já usado nos 4 sub-lotes da Fase 2 (arquivo+linha,
lente, descrição, pontuação de tech-debt, regra violada, solução proposta — sem diff pronto).

Honestidade de cobertura obrigatória, como sempre: se não conseguir varrer 100% de um arquivo,
declare exatamente quanto cobriu.

---

## 1. Contexto — Por Que Esta Fase Importa Mais

Este é o núcleo financeiro do produto — a Fase que o `super_prompt_v2` original já apontava como
prioridade máxima e que **nunca foi executada** nesta investigação. Tudo que resolvemos até agora
(Tier 0 da Fase 2, os 5 lotes) foi na camada de componentes/UI. Esta camada aqui é onde os números
são efetivamente calculados — bug aqui tem raio de explosão maior que bug de componente, porque um
único arquivo (`calculations.ts`) alimenta praticamente toda tela do produto.

**Não redescubra o que já foi corrigido nesta mesma investigação.** Os seguintes bugs já foram
encontrados e corrigidos em `cashflow.ts`, `realizedIncome.ts`, `useValuedPortfolio.tsx` e
`portfolioIrr.ts` ao longo desta conversa — não os liste de novo como achados novos, só confirme
que continuam corrigidos se for relevante para o item que estiver analisando:
- `isPaid` flag em `RealizedIncomeEvent` (declarado vs. recebido).
- Mistura de fuso local/UTC em `cashflow.ts` (`getLocalDateISOString`).
- `consolidatedInvested` vs. `consolidatedNetWorth` em `useValuedPortfolio.tsx`.
- Taxas subtraídas (não somadas) na venda em `portfolioIrr.ts`.
- `EXCHANGE_RATE_FALLBACK`/`SELIC_FALLBACK`/`IPCA_FALLBACK` centralizados em `macroDefaults.ts`.

**`calculations.ts` nunca foi varrido por completo** (1.576 linhas, é o maior arquivo do núcleo) —
prioridade máxima do Sub-lote A abaixo.

---

## 2. Lentes de Auditoria — 6 de 9, Aplicadas Juntas por Arquivo

| # | Lente | Foco |
|---|---|---|
| 1.1 | `fuente-architecture-review` | 9 Regras de Ouro — i18n, SSOT, reusabilidade, mobile-first (N/A pra lógica pura), plano obrigatório |
| 1.2 | `fuente-solution-architect` | Acoplamento — lógica de domínio vazando pra fora do módulo certo, funções puras que deveriam ser puras mas não são |
| 1.3 | `/tech-debt` | `(Impacto + Risco) × (6 - Esforço)`, escala 1-5 cada |
| 1.4 | `/validate-data` | Pitfalls de cálculo: mistura de fuso, average-of-averages, denominador mudando no meio, viés de sobrevivência, nomes de função que prometem mais do que garantem |
| 1.5 | `/testing-strategy` | Função de domínio sem teste cobrindo o caso de borda mais perigoso (zero, negativo, null, evento futuro) |
| 1.9 | `/code-review` | Segurança/performance na camada `api/*.server.ts` — injeção via input não sanitizado, segredos logados, N+1, erro vazando detalhe interno |

Lentes 1.6/1.7 (personas) não se aplicam — é lógica pura sem UI. Lente 1.8 (LGPD) fica pra Fase 3.

---

## 3. Fatiamento em 3 Sub-lotes

### Sub-lote A — `calculations.ts` (1.576 linhas, sozinho)
**Justificativa:** maior arquivo, nunca varrido, é o SSOT de valuation (Bazin/Graham/Gordon) que
alimenta toda tela do produto. Merece sub-lote próprio, não dividir atenção com outros arquivos.

**Atenção especial:**
- Funções de dispatch por classe de ativo (`valuateStockBR`, `valuateFundoImobiliario`,
  `valuateETF`, etc.) — cada uma reimplementa lógica parecida? Duplicação real ou divergência
  proposital por classe de ativo (que deveria ser assim mesmo)?
- Qualquer `??`/`||` com número mágico solto que não passa por `macroDefaults.ts` (já
  consolidamos boa parte, mas confirmar se sobrou algo).
- Funções que calculam câmbio/conversão inline em vez de usar `convertCurrency`/`getFxMultiplier`
  de `currency.ts` (já achamos e corrigimos um caso desse em `SnowballSimulator.tsx` — procurar
  se `calculations.ts` tem o mesmo padrão).

### Sub-lote B — `cashflow.ts`, `realizedIncome.ts`, `portfolioIrr.ts`, `useValuedPortfolio.tsx`
**Justificativa:** já fortemente trabalhados nesta investigação — sub-lote de **confirmação e
achados residuais**, não redescoberta do zero. Foque em: o que ainda não foi tocado dentro desses
arquivos (funções/branches que os fixes anteriores não passaram perto).

### Sub-lote C — `suggestedAllocation.ts`, `dividendProjection.ts`, `src/lib/api/*.server.ts` (16 arquivos)
**Justificativa:** camada de dados externos nunca varrida nesta investigação — maior superfície
de risco de segurança/performance (lente 1.9). Atenção especial a:
- Chaves de API (`HGBRASIL_API_KEY`, etc.) — nunca logadas, nunca em erro exposto ao client.
- Padrão de cache (`assetCache.server.ts`, `dedupeInFlight`) — já vimos esse padrão funcionar bem
  em `hgBrasilClassification.server.ts`; confirmar se os outros 15 arquivos seguem o mesmo rigor
  ou se algum reimplementa cache de forma divergente/sem TTL.
- `classify.server.ts` — já mexemos bastante aqui (classificação FIAGRO/FII_INFRA); qualquer
  achado novo aqui precisa citar linha exata, não generalizar.

---

## 4. Honestidade de Cobertura

Ao final de cada sub-lote, declarar por lente quantos arquivos/funções foram efetivamente varridos
vs. o total do sub-lote — mesmo padrão da Fase 2.

---

## 5. Formato de Saída

| Arquivo (caminho + linha) | Lente(s) Aplicada(s) | Descrição do Achado | Pontuação Tech-Debt (I+R)×(6-E) | Regra de Ouro Violada | Solução Proposta (direção, não diff) |
|---|---|---|---|---|---|

Ordenado por pontuação decrescente. Seção **"Cobertura do Sub-lote N"** ao final de cada um.

---

## 6. Lembrete Final

Comece pelo Sub-lote A (`calculations.ts`). Entregue e pare — aguarde minha revisão antes de
avançar para B, mesmo ritmo que usamos na Fase 2. Não pule etapas mesmo que o arquivo pareça
limpo — declare "0 achados, X% varrido" se for o caso, não pule a entrega.
