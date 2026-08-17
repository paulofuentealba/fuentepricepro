# Plano de Implementação — Correção Obrigatória: Prompt `correcao_dura_fabricacao_115_125.md`

## Contexto e Diagnóstico Real

Este plano responde diretamente às 4 falhas críticas levantadas por Paulo no prompt de correção.
Foi feita auditoria manual de cada ponto **antes** de propor qualquer solução.

---

## Resultado da Auditoria (Estado Atual de `origin/dev`)

### FATO 1 — TSC (`npx tsc --noEmit`)
**Status atual**: ✅ **0 erros** (a sessão anterior corrigiu os problemas de tipo nos commits até `29eca53`).
- `AssetValuationParams` **já contém** `usTreasury10Y?: number | null` e `affo?: number | null` (linhas 377-378).
- `portfolioBff.server.ts` linha 1: **já usa** `import { createServerFn } from "@tanstack/react-start"` ✅
- `fred.server.ts` linha 30: **já usa** `fetchWithTimeout(url, {}, 3000)` — 3 argumentos, sem campo `timeout` inválido ✅
- `portfolioBffLogic.ts`: sem erros de tipo ✅
- Testes: `portfolioBff.test.ts` corrigido (removidos `hasTargetYield` e `isCeilingViolated`) ✅

### FATO 2 — Prompt 125 (migração `useValuedPortfolio`)
**Status atual**: ❌ **NÃO IMPLEMENTADO**.
- `src/lib/useValuedPortfolio.tsx` (203 linhas) **não contém** nenhuma referência a `fetchValuedPortfolioFn` ou `USE_BFF_PORTFOLIO_VALUATION`.
- A infraestrutura de suporte **existe**: `fetchValuedPortfolioFn` (em `portfolioBff.server.ts`), feature gate `USE_BFF_PORTFOLIO_VALUATION` (em `featureGates.ts` com `default: false`).
- **Ação requerida**: implementar a integração com feature flag em `useValuedPortfolio.tsx`.

### FATO 3 — `fred.server.test.ts` ausente
**Status atual**: ❌ **Arquivo não existe**.
- `src/lib/api/__tests__/fred.server.test.ts` → `False`
- `src/lib/__tests__/fred.server.test.ts` → `False`
- **Ação requerida**: criar o arquivo de testes para `fred.server.ts`.

### FATO 4 — `PROMPTS_LOG.md` com entradas falsas
**Status atual**: ❌ **11 entradas declarando "3 gates validados"** quando havia erros reais.
- **Ação requerida**: atualizar `docs/PROMPTS_LOG.md` com nota de correção histórica honesta.

---

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|-------|---------|
| **Prompt 125 — BFF integração em `useValuedPortfolio`**: como ativar o BFF sem quebrar o estado existente para todos os usuários? | Feature gate `USE_BFF_PORTFOLIO_VALUATION` está em `DEFAULT_FEATURE_GATES` com `false`. A integração usará `useFeatureGate("USE_BFF_PORTFOLIO_VALUATION")`. Se `false`, o hook segue o caminho client-side atual (zero regressão). Se `true`, usa `fetchValuedPortfolioFn` via TanStack Query. |
| **Prompt 125 — `useValuedPortfolio` é um hook React; o BFF é async server fn**: como conciliar o fluxo síncrono do hook com a chamada ao servidor? | `useQuery` do TanStack Query já é o mecanismo padrão do projeto para data-fetching assíncrono. O branch BFF usará `useQuery({ queryKey: ['bffPortfolio', uid, items, transactions], queryFn: () => fetchValuedPortfolioFn({...}) })`. Tipo de retorno: `ValuedPortfolioResponse` de `portfolioBffLogic.ts`. |
| **Prompt 125 — `useValuedPortfolio` retorna `valuedItems: ValuedWatchlistItem[]`; o BFF retorna `items: (WatchlistItem & ValuationResult & {...})[]`**: como manter compatibilidade de tipo? | Os campos extras (`livePrice`, `sector`, `isClosedPosition`) precisam ser preenchidos no branch BFF. `livePrice` = `currentPrice` (BFF já usa preço live do asset cache). `sector` será preenchido com `item.sector ?? t.common.other`. `isClosedPosition` = `quantity === 0`. |
| **Regressão em consumidores de `useValuedPortfolio`**: o retorno do hook no branch BFF pode ter formato diferente, quebrando componentes | A interface de retorno do hook **não muda**: ele continua retornando `{ valuedItems, totals, isAppLoading, ... }`. O que muda é de onde `valuedItems` vem. Adicionaremos campo `isBffMode: boolean` no retorno para diagnóstico (sem quebrar nada). |
| **`fred.server.test.ts`**: deve testar com mock de rede ou de módulo? | Usar `vi.mock` para `./http.server` (padrão do projeto, ex: `benchmarkHistory.test.ts`, `secEdgar.test.ts`). 4 casos: cache hit, sem API key (fallback), resposta válida, resposta inválida (fallback). |
| **Commit por fato ou commit único?** | Conforme governança: cada item separado em seu próprio commit atômico e rastreável. |

---

## Arquivos a Criar/Alterar

### FATO 2 — Implementação real do Prompt 125

#### [MODIFY] [`useValuedPortfolio.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/useValuedPortfolio.tsx)
- Adicionar branch condicional baseado em `useFeatureGate("USE_BFF_PORTFOLIO_VALUATION")`
- Quando gate = `true`: chamar `fetchValuedPortfolioFn` via `useQuery`, mapear retorno para `ValuedWatchlistItem[]`
- Quando gate = `false`: manter lógica client-side 100% inalterada (zero regressão)

### FATO 3 — Criar `fred.server.test.ts`

#### [NEW] [`src/lib/api/__tests__/fred.server.test.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/__tests__/fred.server.test.ts)
- 4 testes: cache hit, sem API key, resposta FRED válida, resposta FRED inválida/timeout

### FATO 4 — Corrigir `PROMPTS_LOG.md`

#### [MODIFY] [`docs/PROMPTS_LOG.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/PROMPTS_LOG.md)
- Adicionar nota de errata no final: registrar que as 11 entradas dos Prompts 115-125 reportaram "3 gates validados" incorretamente
- Registrar os 4 fatos identificados pelo Paulo com data e hash do commit de correção
- Registrar que o Prompt 125 foi reimplementado de fato nesta correção

---

## Plano de Commits (atômicos e rastreáveis)

1. `test(fred): add fred.server.test.ts with 4 unit tests [Fix FATO3]`
2. `feat(bff): implement USE_BFF_PORTFOLIO_VALUATION gate in useValuedPortfolio [Fix FATO2 / Prompt 125]`
3. `docs(log): add errata to PROMPTS_LOG.md for fabricated gates in 115-125 [Fix FATO4]`

---

## Plano de Verificação

Após cada commit:
- `npx tsc --noEmit` → output bruto completo (sem resumir)
- `npm run test` → output bruto completo (número exato de testes)
- `npm run build` → output bruto completo

O output dos 3 gates será colado integralmente no relatório final, **sem resumir**.

---

## Open Questions para Paulo

> [!IMPORTANT]
> **Escopo da integração BFF no Prompt 125**: O campo `totals` (que soma renda projetada, worth em USD/BRL, etc.) deve também ser calculado pelo BFF, ou mantemos a agregação client-side sobre `valuedItems` quando o gate BFF está ativo?
>
> **Decisão assumida para não bloquear**: manter a agregação `totals` client-side sobre `valuedItems` (independente da origem dos dados). O BFF retorna os itens valuados; o hook agrega localmente. Isso garante que `macroRates` e `fx` (câmbio) continuem sendo aplicados no cliente, onde são lidos do TanStack Query cache, sem exigir que o BFF os recalcule também. Se Paulo quiser mover `totals` para o BFF numa fase futura, basta um novo prompt.
