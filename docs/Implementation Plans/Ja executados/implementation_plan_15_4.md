# Implementation Plan — Task 15.4: SSOT Cluster B (Yield/Valuation Duplicado + Prop-Drilling)

**Data:** 10 de Agosto de 2026  
**Auditor/Arquiteto:** `fuente-architecture-review` & `fuente-solution-architect`  
**Escopo:** SSOT Financeiro (Regra 4) & Otimização de Arquitetura de Componentes da Watchlist/AssetCard (Regras 1, 4, 8)

---

## 9 Regras de Ouro de Governança

Esta atividade atende rigorosamente às **9 Regras de Ouro** do `AGENTS.md`:
1. **Reusabilidade Primeiro (Arquitetura)**
2. **Global i18n Enforcement (Sem Hardcode)**
3. **Isolamento e Segurança de Dados (Database & Mocks)**
4. **Single Source of Truth (SSOT — Dados Financeiros)** — *Regra central desta task*
5. **Abordagem "Mobile-First" Sustentável**
6. **Qualidade Visual Premium (Aesthetics)**
7. **AGENTS.md Tem Precedência (Governança)**
8. **Plano de Implementação Obrigatório Antes de Executar** — *Apresentação para aprovação prévia*
9. **Governança de Roles (Skills)**

---

## Mapeamento de Call Sites — Item 1: `AssetCard.tsx:381-396`

Varredura completa realizada em todo o repositório (`src/`) identificou **4 pontos de chamada** ao componente `<AssetCard>`:

### Call Sites Identificados:

1. **`src/components/ceiling/watchlist/WatchlistAssetGrid.tsx:51`**
   - **Modo / Variante:** `variant="watchlist"` (padrão)
   - **Fonte dos Dados:** Consome `it` (um `ValuedWatchlistItem` que já possui o campo SSOT `it.valuation` pré-calculado por `useValuedPortfolio`).
   - **Diagnóstico:** A variante `WatchlistVariant` em `AssetCard.tsx` (linha 241) já lê diretamente `item.valuation` do SSOT. Não executa recálculo redundante de valuation.

2. **`src/components/ceiling/AssetComparator.tsx:322`**
   - **Modo / Variante:** `variant="watchlist"` (Mesa de Decisão / Comparador)
   - **Fonte dos Dados:** Objeto sintético montado com `valuation: val`, onde `val` é calculated de forma centralizada pelas linhas 310–318.
   - **Diagnóstico:** Já fornece `valuation: val` no objeto do ativo. O `WatchlistVariant` consome este objeto SSOT diretamente.

3. **`src/components/ceiling/SmartAllocation.tsx:495`**
   - **Modo / Variante:** `variant="allocation"` (Aporte Inteligente)
   - **Fonte dos Dados:** Objeto `r.item` (`ValuedWatchlistItem` com `valuation` pré-calculado).
   - **Diagnóstico:** Exibe o resumo do aporte sugerido utilizando o valuation SSOT da Watchlist.

4. **`src/routes/app/screener.tsx:82`**
   - **Modo / Variante:** `variant="search"` (Playground de Valuation / Screener)
   - **Fonte dos Dados:** Props `asset={result.asset}`, `targetYield={result.targetYield}`, `averagePrice={result.averagePrice}`.
   - **Diagnóstico:** Em `SearchVariant` (linhas 381–396), o usuário ajusta interativamente o slider de `targetYield`, o selector de `timeframe` (3y/5y) e `customTaxRate`. **Por se tratar de uma tela de simulação/exploração interativa**, a Regra 4 autoriza a invocação do motor `getAssetValuation`, porém refatoraremos a derivação do `bvps` de fallback (linhas 386–391) para utilizar o helper SSOT unificado `calculateBvps`.

### Estratégia Adotada para Item 1:
- Manter o contrato de prop `item: ValuedWatchlistItem` para o fluxo principal e garantir type-safety em `AssetCardProps`.
- Unificar a extração de `bvps` (`pbRatio` -> `bvps`) no utilitário helper `calculateBvps` em `calculations.ts`, eliminando duplicatas de código entre `AssetComparator.tsx` e `AssetCard.tsx`.

---

## Decisão Arquitetural SSOT para os Itens 3 e 4 (`dividendYield`)

- **Decisão SSOT:** Adicionar o campo `dividendYield: number` diretamente ao objeto de retorno de `getAssetValuation` em `src/lib/calculations.ts`.
- **Justificativa:** O cálculo de Dividend Yield líquido (`(netAvgDividend / currentPrice) * 100`) é propriedade inerente ao valuation do ativo. Expor `dividendYield` no objeto SSOT elimina qualquer ambiguidade entre `bazin` e derivações manuais.
- **Aplicação:**
  - `src/lib/usePortfolioRisk.ts:99-100` (Item 3) consumirá `item.valuation.dividendYield`.
  - `src/components/ceiling/AssetComparator.tsx:230` (Item 4) consumirá `val.dividendYield`.

---

## Proposed Changes (Detalhamento dos Itens 3 a 8)

---

### [Component] SSOT Financeiro (Regra 4) & Refatorações de Componentes

#### [MODIFY] [`calculations.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/calculations.ts)
- Adicionar o campo `dividendYield` ao retorno de `getAssetValuation`:
  `dividendYield: currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0`.
- Adicionar função helper exported `calculateBvps(bvpsInput?: number | null, pbRatio?: number | null, currentPrice?: number | null): number | null` que centraliza a lógica de extração do valor patrimonial por ação.

#### [MODIFY] [`usePortfolioRisk.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/usePortfolioRisk.ts#L99-L100)
- **Item 3:** Substituir a fórmula manual de dividend yield `(item.annualDividend / item.currentPrice) * 100` na detecção de Yield Trap pelo campo `item.valuation.dividendYield` provido pelo motor SSOT.

#### [MODIFY] [`AssetComparator.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/AssetComparator.tsx)
- **Item 4:** Substituir o recálculo manual de dividend yield em `(avgDiv / data.currentPrice) * 100` (linha 230) pela propriedade SSOT `val.dividendYield`.
- **Item 5:** Substituir a derivação manual de `bvps` nas linhas 222 e 312 pela chamada a `calculateBvps`.

#### [MODIFY] [`FixedIncomeWizardSheet.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx)
- **Item 6:** Refatorar a criação de posições de Renda Fixa (linhas 82–83) para emitir uma transação inicial de aporte (`type: "buy"`, `quantity: 1`, `pricePerShare: investedAmount`) via `useTransactions().upsert`, garantindo que saldo e preço médio sejam derivados do motor de transações.

#### [MODIFY] [`EditItemDialog.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/EditItemDialog.tsx) & [`TransactionForm.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/TransactionForm.tsx)
- **Item 7:** Eliminar mutações manuais diretas na propriedade `quantity` nos formulários de edição de ativo; delegar a atualização da posição acumulada exclusivamente para o re-processamento de transações via `useTransactions().upsert` e `recalculateHoldingFromTransactions`.

#### [NEW] [`WatchlistActionsContext.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/WatchlistActionsContext.tsx)
#### [MODIFY] [`Watchlist.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/Watchlist.tsx) & [`WatchlistAssetGrid.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/WatchlistAssetGrid.tsx)
- **Item 8:** Criar um Context leve React (`WatchlistActionsContext`) para fornecer handlers `onEdit`, `onRemove`, `onOpenDetail`, `quotes`, `meta` e `concentrationViolators`, eliminando o repasse intermediário de 6 props por 3 níveis de profundidade.

---

## Verification Plan

### Automated Verification Steps
- Executar `npx tsc --noEmit` e confirmar compilação com 0 erros.
- Executar `npx vitest run` e confirmar aprovação de todas as 30 suítes de teste.
- Executar `npm run build` e confirmar geração limpa do bundle de produção.

### Manual Verification Steps
- Abrir e inspecionar a Watchlist, a Mesa de Decisão (Comparator) e o Screener no navegador para validar exibição das métricas sem regressão visual ou numérica.
- Testar o fluxo end-to-end de criação de título de Renda Fixa (`FixedIncomeWizardSheet`) e verificar a inserção da transação inicial correspondente no histórico.
- Testar a edição de ativos em `EditItemDialog` e `TransactionForm`, confirmando que o saldo acumulado é recalculado via transações sem mutação direta de `quantity`.
