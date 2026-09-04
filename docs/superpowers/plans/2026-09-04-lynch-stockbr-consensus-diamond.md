# Peter Lynch para STOCK_BR + Pirâmide de Consenso em Losango Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o método de Peter Lynch modificado ao consenso de STOCK_BR, corrigir o rótulo incorreto de "Graham" que hoje carrega o valor de Lynch em STOCK_US, e redesenhar `ConsensusPyramid` para um losango dinâmico de 3 ou 4 vértices que mostra Lynch quando aplicável.

**Architecture:** `calculations.ts` ganha um campo `lynch` de topo em `ValuationResult` (mesmo padrão de `bazin`/`graham`/`gordon`), populado em `valuateStockBR` e `valuateStockUS`; `graham` deixa de ser reaproveitado para carregar o Lynch em STOCK_US. Os consumidores de UI que hoje leem `.graham` esperando o Lynch de STOCK_US passam a usar `graham ?? lynch` para não perder a informação exibida. `ConsensusPyramid` passa a montar sua lista de vértices dinamicamente a partir dos métodos não-`undefined`-por-design da classe de ativo, em vez de 3 posições fixas.

**Tech Stack:** TypeScript, React, Vitest + Testing Library, i18n custom (dict.ptBR/en/es.ts).

**Spec:** [docs/superpowers/specs/2026-09-04-lynch-stockbr-consensus-diamond-design.md](../specs/2026-09-04-lynch-stockbr-consensus-diamond-design.md)

## Global Constraints

- Graham e Lynch permanecem `null` para FII, REIT e ETF — nenhum proxy será criado para essas classes (decisão validada com o usuário).
- Nenhuma mudança nas fórmulas de Bazin ou Gordon.
- Nenhuma mudança em ETF (permanece com 2 métodos: Bazin + Bogle).
- Cada `null` estrutural (não calculável para a classe) deve ter um comentário inline explicando o motivo, no padrão já usado para `graham: null, // Corporate Graham explicitly forbidden for funds`.
- Rodar a suíte de testes ao final de cada task antes de commitar.

---

### Task 1: Adicionar campo `lynch` ao tipo `ValuationResult` e corrigir rotulagem em `valuateStockUS`

**Files:**
- Modify: `src/lib/calculations.ts:441-472` (interface `ValuationResult`)
- Modify: `src/lib/calculations.ts:668-692` (early return de `valuateStockUS` para preço/dividendo inválido)
- Modify: `src/lib/calculations.ts:774-798` (retorno final de `valuateStockUS`)
- Test: `src/lib/__tests__/calculations_stock_us.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `ValuationResult.lynch: number | null` (campo de topo, novo) e `ValuationResult.methods.lynch?: number | null` (já existia como opcional, passa a ser sempre populado quando aplicável). `ValuationResult.graham` para STOCK_US passa a ser sempre `null`. Tasks seguintes (2, 3, 5) dependem desses nomes exatos.

- [ ] **Step 1: Escrever o teste que falha, para o campo `lynch` e a correção de `graham` em STOCK_US**

Em `src/lib/__tests__/calculations_stock_us.test.ts`, substitua o teste `"should calculate Bazin, Shareholder Yield, and Peter Lynch for AAPL"` (linhas 5-36) por esta versão, que passa a checar `result.lynch`/`result.methods.lynch` em vez de `result.methods.graham`, e adiciona uma asserção nova confirmando que `graham` é `null`:

```typescript
  it("should calculate Bazin, Shareholder Yield, and Peter Lynch for AAPL", () => {
    const result = valuateStockUS({
      ticker: "AAPL",
      targetYield: 3.5,
      currentPrice: 220.0,
      avgDividend: 1.0,
      eps: 6.6,
      dividendCagr: 7.5,
      shareholderYield: 4.8, // 4.8% total shareholder return (dividends + buybacks)
      currency: "USD",
      type: "STOCK_US",
    });

    // 1. Net Dividend with 30% WHT: 1.0 * (1 - 0.3) = 0.70
    // Bazin = 0.70 / 0.035 = 20.0
    expect(result.methods.bazin).toBeCloseTo(20.0, 1);

    // 2. Shareholder Yield ceiling: 220.0 * (4.8 / 3.5) = 301.71
    expect(result.methods.shareholderYield).toBeCloseTo(301.71, 1);

    // 3. Peter Lynch Price: EPS * (growth + DY) = 6.6 * (7.5 + 0.318) = 51.6
    expect(result.methods.lynch).toBeGreaterThan(40);
    expect(result.lynch).toBeGreaterThan(40);

    // 4. STOCK_US never computes the corporate Graham LPA/VPA formula
    expect(result.methods.graham).toBeNull();
    expect(result.graham).toBeNull();

    // 5. Fuente Consensus should be positive
    expect(result.fuenteConsensus).toBeGreaterThan(0);

    // 6. Assumptions array contains 4 resolved items
    expect(result.assumptions).toHaveLength(4);
    const whtAssumption = result.assumptions.find((a) => a.key === "withholdingTax");
    expect(whtAssumption?.value).toBe(30);
    expect(whtAssumption?.confidenceBadge).toBe(4);
  });
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/lib/__tests__/calculations_stock_us.test.ts -t "should calculate Bazin, Shareholder Yield, and Peter Lynch for AAPL"`
Expected: FAIL — `result.methods.lynch` é `undefined` (ainda não populado) e `result.methods.graham`/`result.graham` ainda contêm o valor do Lynch (não são `null`).

- [ ] **Step 3: Adicionar `lynch` ao tipo `ValuationResult`**

Em `src/lib/calculations.ts`, na interface `ValuationResult` (linhas 441-472), altere o bloco de campos:

```typescript
export interface ValuationResult {
  ticker: string;
  activeCeiling: number;
  margin: number;
  fuenteConsensus: number | null;
  methods: {
    bazin: number | null;
    graham: number | null;
    gordon: number | null;
    shareholderYield?: number | null;
    affoYield?: number | null;
    bogleModel?: number | null;
    /** Modified Peter Lynch fair value. Populated for STOCK_US and STOCK_BR;
     * null for FII/REIT/ETF, which have no per-share/per-quota EPS to feed the formula. */
    lynch?: number | null;
  };
  assumptions: ValuationAssumption[];
  investorProfile: "conservative" | "moderate" | "aggressive" | "custom";
  // Backward compatibility fields for existing UI consumers
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch: number | null;
  gordonConfidence: "high" | "low" | null;
  consensus: number | null;
  dividendYield: number;
  positive: boolean;
  isUnavailable: boolean;
  yieldTrapWarning: ReturnType<typeof isYieldTrap>;
  shareholderYield: number | null;
}
```

- [ ] **Step 4: Corrigir o early return de `valuateStockUS` (preço/dividendo inválido)**

Em `src/lib/calculations.ts`, dentro de `valuateStockUS`, no bloco `if (currentPrice <= 0 || avgDividend <= 0) { return { ... } }` (linhas 668-693), adicione `lynch: null,` em `methods` e no nível de topo:

```typescript
  if (currentPrice <= 0 || avgDividend <= 0) {
    return {
      ticker,
      activeCeiling: currentPrice > 0 ? currentPrice : 0,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
        shareholderYield: null,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }
```

- [ ] **Step 5: Corrigir o retorno final de `valuateStockUS`**

Em `src/lib/calculations.ts`, no retorno final de `valuateStockUS` (linhas 774-798), remova a atribuição de `lynchPrice` a `graham` e popule `lynch` corretamente:

```typescript
  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham: null, // STOCK_US never computes the corporate Graham LPA/VPA formula
      gordon,
      shareholderYield: shareholderYieldPrice,
      lynch: lynchPrice,
    },
    assumptions,
    investorProfile: "moderate",
    bazin,
    graham: null,
    gordon,
    lynch: lynchPrice,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: shareholderYield ?? null,
  };
```

- [ ] **Step 6: Rodar o teste para confirmar que passa**

Run: `npx vitest run src/lib/__tests__/calculations_stock_us.test.ts`
Expected: PASS em todos os testes do arquivo.

- [ ] **Step 7: Commit**

```bash
git add src/lib/calculations.ts src/lib/__tests__/calculations_stock_us.test.ts
git commit -m "fix(valuation): separa campo lynch de graham em STOCK_US

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Adicionar cálculo de Lynch ao consenso de `valuateStockBR`

**Files:**
- Modify: `src/lib/calculations.ts:503-645` (`valuateStockBR`)
- Test: `src/lib/__tests__/calculations_stock_br.test.ts`

**Interfaces:**
- Consumes: `ValuationResult.lynch` e `ValuationResult.methods.lynch` (Task 1).
- Produces: `valuateStockBR(...)` agora retorna `lynch` populado com o Peter Lynch modificado para ações BR; `medianConsensus` passa a considerar 4 valores. Tasks 3 e 5 dependem de `result.lynch`/`result.methods.lynch` estarem preenchidos para STOCK_BR.

- [ ] **Step 1: Escrever o teste que falha, para Lynch em STOCK_BR**

Em `src/lib/__tests__/calculations_stock_br.test.ts`, adicione este novo teste logo após o teste `"should calculate Bazin, Graham and Gordon for BBSE3 with assumptions array"` (após a linha 46):

```typescript
  it("should calculate Peter Lynch modified fair value and include it in the consensus median", () => {
    const result = valuateStockBR({
      ticker: "BBSE3",
      targetYield: 6,
      currentPrice: 34.5,
      avgDividend: 3.25,
      eps: 3.85,
      bvps: 12.4,
      dividendCagr: 8.5,
      selicPct: 10.5,
      terminalGrowthRate: 0.045,
      currency: "BRL",
      type: "STOCK_BR",
      roe: 31.0,
      payoutRatio: 80,
    });

    // Net dividend (no JCP by default, so no 15% WHT deduction here): 3.25
    // rawDy = (3.25 / 34.5) * 100 = 9.42
    // effectiveGrowth = dividendCagr = 8.5
    // lynchMultiplier = clamp(8.5 + 9.42, 5, 25) = 17.92
    // lynch = eps * multiplier = 3.85 * 17.92 = 68.99
    expect(result.methods.lynch).toBeCloseTo(68.99, 1);
    expect(result.lynch).toBeCloseTo(68.99, 1);

    // Consensus should be the median of [bazin=54.17, graham=32.77, gordon>0, lynch=68.99]
    const values = [result.bazin, result.graham, result.gordon, result.lynch].filter(
      (v): v is number => v != null,
    );
    const sorted = [...values].sort((a, b) => a - b);
    const expectedMedian = (sorted[1] + sorted[2]) / 2;
    expect(result.fuenteConsensus).toBeCloseTo(expectedMedian, 1);
  });

  it("should set lynch to null when EPS is missing for STOCK_BR", () => {
    const result = valuateStockBR({
      ticker: "RECENT3",
      targetYield: 6,
      currentPrice: 20.0,
      avgDividend: 1.2,
      eps: null,
      bvps: null,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.methods.lynch).toBeNull();
    expect(result.lynch).toBeNull();
  });
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/lib/__tests__/calculations_stock_br.test.ts -t "Peter Lynch"`
Expected: FAIL — `result.methods.lynch` e `result.lynch` são `undefined`/`null` porque o cálculo ainda não existe.

- [ ] **Step 3: Implementar o cálculo de Lynch em `valuateStockBR`**

Em `src/lib/calculations.ts`, dentro de `valuateStockBR`, logo após o bloco "2. Graham Model" (depois da linha 556, antes do comentário "3. Gordon Model"), adicione:

```typescript
  // 2b. Modified Peter Lynch Fair Value: LPA * (Growth Rate + Dividend Yield)
  let lynch: number | null = null;
  if (eps != null && eps > 0 && currentPrice > 0) {
    const rawDy = (netAvgDividend / currentPrice) * 100;
    const effectiveGrowth = dividendCagr != null && dividendCagr > 0 ? dividendCagr : 6.0;
    const lynchMultiplier = Math.min(25, Math.max(5, effectiveGrowth + rawDy));
    lynch = eps * lynchMultiplier;
  }
```

Em seguida, atualize a linha do consenso (linha 574) para incluir `lynch`:

```typescript
  // 4. Fuente Consensus (Strict Median of Applicable Methods for STOCK_BR)
  const consensus = medianConsensus([bazin, graham, gordon, lynch]);
```

E no bloco de retorno do early-return (preço/dividendo inválido, linhas 530-534 e 537-539), adicione `lynch: null,` em `methods` e no nível de topo — mesmo padrão do Task 1, Step 4.

Por fim, no retorno final (linhas 627-644), inclua `lynch` em `methods` e no nível de topo:

```typescript
  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham,
      gordon,
      lynch,
    },
    assumptions,
    investorProfile: "moderate",
    bazin,
    graham,
    gordon,
    lynch,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: null,
  };
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `npx vitest run src/lib/__tests__/calculations_stock_br.test.ts`
Expected: PASS em todos os testes do arquivo.

- [ ] **Step 5: Adicionar comentário explicativo de `lynch: null` para FII, REIT e ETF**

Em `src/lib/calculations.ts`, localize as 3 ocorrências de `graham: null, // Corporate Graham explicitly forbidden for funds` (FII, ~linha 932), `// ...forbidden for REITs` (~linha 1077) e `// ...strictly forbidden for ETFs` (~linha 1234). Ao lado de cada uma, no mesmo objeto de retorno, adicione a linha correspondente para `lynch`:

Para FII (`valuateFII`, retorno final, próximo à linha 931-933):
```typescript
      graham: null, // Corporate Graham explicitly forbidden for funds
      lynch: null, // Peter Lynch requires per-share EPS, which FIIs do not report
      gordon,
```
E no campo de topo, próximo à linha 938:
```typescript
    graham: null,
    lynch: null,
    gordon,
```

Para REIT (`valuateREIT`, retorno final, próximo à linha 1076-1078 e 1084-1085): mesmo padrão, com o comentário `// Peter Lynch requires per-share EPS, which REITs do not report`.

Para ETF (`valuateETF`, retorno final, próximo à linha 1233-1235 e 1240-1242): mesmo padrão, com o comentário `// Peter Lynch requires per-share EPS, which ETFs (index/strategy baskets) do not have`.

Em cada um dos 3 casos, adicione também `lynch: null,` no `methods` do early-return (bloco de preço/dividendo inválido) de cada função, junto ao `graham: null,` já existente.

- [ ] **Step 6: Rodar toda a suíte de `calculations` para garantir que nada quebrou**

Run: `npx vitest run src/lib/__tests__/calculations_fiis.test.ts src/lib/__tests__/calculations_reits.test.ts src/lib/__tests__/calculations_etfs.test.ts src/lib/__tests__/calc.test.ts`
Expected: PASS em todos.

- [ ] **Step 7: Commit**

```bash
git add src/lib/calculations.ts src/lib/__tests__/calculations_stock_br.test.ts
git commit -m "feat(valuation): adiciona Peter Lynch ao consenso de STOCK_BR

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Ajustar consumidores de UI que liam `.graham` esperando o Lynch de STOCK_US

**Files:**
- Modify: `src/components/ceiling/AssetComparator.tsx:250`
- Modify: `src/components/shared/AssetCard.tsx:344,578`
- Modify: `src/components/ceiling/watchlist/TransactionsPanel.tsx:109`
- Modify: `src/components/portfolio/AddAssetPage.tsx:232`
- Test: `src/lib/__tests__/comparatorCsv.test.ts`, `src/lib/__tests__/thesisSnapshot.test.ts`

**Interfaces:**
- Consumes: `ValuationResult.graham` (agora sempre `null` para STOCK_US) e `ValuationResult.lynch`/`methods.lynch` (Tasks 1 e 2).
- Produces: nenhuma interface nova — apenas preserva o comportamento visual/exportado que hoje mostra o número do Lynch nesses 4 pontos, agora lendo o campo correto via fallback `graham ?? lynch`.

Este é um ajuste de correção de regressão (sem teste dedicado novo): antes da Task 1, `valuation.graham` para STOCK_US continha o valor do Lynch; depois da Task 1, `valuation.graham` é sempre `null` para STOCK_US, o que faria esses 4 pontos da UI passarem a exibir "--"/vazio para ações americanas. O fallback abaixo evita essa regressão sem redesenhar esses componentes (fora do escopo do spec, que só cobre `ConsensusPyramid`).

- [ ] **Step 1: Rodar os testes existentes destes consumidores antes de alterar, para ter uma baseline**

Run: `npx vitest run src/lib/__tests__/comparatorCsv.test.ts src/lib/__tests__/thesisSnapshot.test.ts`
Expected: PASS (baseline atual, antes do ajuste).

- [ ] **Step 2: Ajustar `AssetComparator.tsx`**

Em `src/components/ceiling/AssetComparator.tsx:250`, troque:

```typescript
          graham: val.graham,
```

por:

```typescript
          graham: val.graham ?? val.lynch,
```

- [ ] **Step 3: Ajustar `AssetCard.tsx` (2 ocorrências)**

Em `src/components/shared/AssetCard.tsx:344` e `:578`, troque:

```typescript
          graham={valuation.graham}
```

por:

```typescript
          graham={valuation.graham ?? valuation.lynch}
```

nas duas ocorrências.

- [ ] **Step 4: Ajustar `TransactionsPanel.tsx`**

Em `src/components/ceiling/watchlist/TransactionsPanel.tsx:109`, troque:

```typescript
          grahamPrice: val.methods.graham,
```

por:

```typescript
          grahamPrice: val.methods.graham ?? val.methods.lynch ?? null,
```

- [ ] **Step 5: Ajustar `AddAssetPage.tsx`**

Em `src/components/portfolio/AddAssetPage.tsx:232`, troque:

```typescript
            grahamPrice: val.methods.graham,
```

por:

```typescript
            grahamPrice: val.methods.graham ?? val.methods.lynch ?? null,
```

- [ ] **Step 6: Rodar os testes novamente para confirmar que não regrediram**

Run: `npx vitest run src/lib/__tests__/comparatorCsv.test.ts src/lib/__tests__/thesisSnapshot.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ceiling/AssetComparator.tsx src/components/shared/AssetCard.tsx src/components/ceiling/watchlist/TransactionsPanel.tsx src/components/portfolio/AddAssetPage.tsx
git commit -m "fix(ui): preserva exibição do Lynch de STOCK_US após separar de graham

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Adicionar textos de i18n para Lynch (3 idiomas)

**Files:**
- Modify: `src/lib/i18n/dict.ptBR.ts:87-93` (bloco `tooltips`), `:1910-1913` (bloco `valuationAssumptions`)
- Modify: `src/lib/i18n/dict.en.ts:85-86` (bloco `tooltips`), `:1898-1901` (bloco `valuationAssumptions`)
- Modify: `src/lib/i18n/dict.es.ts:87-88` (bloco `tooltips`), `:1914-1917` (bloco `valuationAssumptions`)

**Interfaces:**
- Consumes: nenhuma interface de código de tasks anteriores.
- Produces: `t.tooltips.lynch`, `t.tooltips.lynchNotApplicable`, `t.valuationAssumptions.lynchTooltipTitle`, `t.valuationAssumptions.lynchTooltipFormula`, `t.valuationAssumptions.lynchTooltipGrowth`, `t.valuationAssumptions.lynchTooltipDividendYield`, `t.valuationAssumptions.lynchTooltipSource` — usados pela Task 5 em `ConsensusPyramid.tsx`.

- [ ] **Step 1: Adicionar chaves em `dict.ptBR.ts`**

No bloco `tooltips`, logo após `grahamNotApplicable: "..."` (linha 88), adicione:

```typescript
    lynch: "Valor justo combinando crescimento de lucros/proventos com o dividend yield atual (Peter Lynch modificado).",
    lynchNotApplicable: "O modelo de Peter Lynch requer lucro por ação (LPA) e não se aplica a fundos ou ETFs.",
```

No bloco `valuationAssumptions`, logo após `grahamTooltipSource: "Fonte: CVM, data LPA/VPA: {{date}}",` (linha 1913), adicione:

```typescript
    lynchTooltipTitle: "Modelo Peter Lynch (Valor Justo Modificado)",
    lynchTooltipFormula: "Fórmula: LPA × (Crescimento + Dividend Yield)",
    lynchTooltipGrowth: "Taxa de crescimento aplicada: {{growth}}%",
    lynchTooltipDividendYield: "Dividend yield líquido: {{dividendYield}}%",
    lynchTooltipSource: "Fonte: {{source}}, data: {{date}}",
```

- [ ] **Step 2: Adicionar chaves em `dict.en.ts`**

No bloco `tooltips`, logo após `grahamNotApplicable: "..."` (linha 86), adicione:

```typescript
    lynch: "Fair value combining earnings/dividend growth with the current dividend yield (Modified Peter Lynch).",
    lynchNotApplicable: "The Peter Lynch model requires earnings per share (EPS) and does not apply to funds or ETFs.",
```

No bloco `valuationAssumptions`, logo após `grahamTooltipSource: "Source: SEC EDGAR, EPS/BVPS date: {{date}}",` (linha 1901), adicione:

```typescript
    lynchTooltipTitle: "Peter Lynch Model (Modified Fair Value)",
    lynchTooltipFormula: "Formula: EPS × (Growth + Dividend Yield)",
    lynchTooltipGrowth: "Applied growth rate: {{growth}}%",
    lynchTooltipDividendYield: "Net dividend yield: {{dividendYield}}%",
    lynchTooltipSource: "Source: {{source}}, date: {{date}}",
```

- [ ] **Step 3: Adicionar chaves em `dict.es.ts`**

No bloco `tooltips`, logo após `grahamNotApplicable: "..."` (linha 88), adicione:

```typescript
    lynch: "Valor justo combinando el crecimiento de beneficios/dividendos con el dividend yield actual (Peter Lynch modificado).",
    lynchNotApplicable: "El modelo de Peter Lynch requiere beneficio por acción (BPA) y no se aplica a fondos ni ETFs.",
```

No bloco `valuationAssumptions`, logo após `grahamTooltipSource: "Fuente: SEC EDGAR, fecha LPA/VPA: {{date}}",` (linha 1917), adicione:

```typescript
    lynchTooltipTitle: "Modelo Peter Lynch (Valor Justo Modificado)",
    lynchTooltipFormula: "Fórmula: BPA × (Crecimiento + Dividend Yield)",
    lynchTooltipGrowth: "Tasa de crecimiento aplicada: {{growth}}%",
    lynchTooltipDividendYield: "Dividend yield neto: {{dividendYield}}%",
    lynchTooltipSource: "Fuente: {{source}}, fecha: {{date}}",
```

- [ ] **Step 4: Verificar que o build de tipos não quebrou**

Run: `npx tsc --noEmit -p .`
Expected: sem novos erros de tipo relacionados a `dict.ptBR.ts`, `dict.en.ts` ou `dict.es.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/dict.ptBR.ts src/lib/i18n/dict.en.ts src/lib/i18n/dict.es.ts
git commit -m "feat(i18n): adiciona textos do modelo Peter Lynch em 3 idiomas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Redesenhar `ConsensusPyramid` para losango dinâmico de 3 ou 4 vértices

**Files:**
- Modify: `src/components/ceiling/watchlist/ConsensusPyramid.tsx` (reescrita quase total)
- Modify: `src/components/ceiling/watchlist/MethodDetailSheet.tsx:15-44` (adicionar `"lynch"` ao union type e ao switch de ícone)
- Modify: `src/components/ceiling/watchlist/AssetDetailSheet.tsx:446` (call site)
- Test: `src/components/ceiling/watchlist/__tests__/ConsensusPyramid.test.tsx`

**Interfaces:**
- Consumes: `ValuationResult.bazin`, `.graham`, `.gordon`, `.lynch`, `.consensus` (Tasks 1 e 2); `t.tooltips.lynch`, `t.tooltips.lynchNotApplicable`, `t.valuationAssumptions.lynchTooltip*` (Task 4).
- Produces: `ConsensusPyramid` passa a aceitar `valuation.lynch` como prop opcional; nenhum outro componente consome `ConsensusPyramid` diretamente além de `AssetDetailSheet.tsx:446`.

- [ ] **Step 1: Escrever o teste que falha, para o caso de 4 vértices (Lynch presente)**

Substitua o conteúdo de `src/components/ceiling/watchlist/__tests__/ConsensusPyramid.test.tsx` por:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ConsensusPyramid } from "../ConsensusPyramid";
import { dict } from "@/lib/i18n";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

describe("ConsensusPyramid (Tier 1 / Item 4)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("exibe 3 vértices quando lynch não é aplicável (ex: FII/REIT/ETF)", () => {
    const valuation = {
      bazin: 45.5,
      graham: 50.0,
      gordon: 42.0,
      lynch: undefined,
      consensus: 45.5,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    // 3 vértices de método (Gordon, Bazin, Graham) + Consenso central = 4 triggers
    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(4);

    expect(screen.getAllByText("R$ 45,50").length).toBe(2); // Bazin e Consenso
    expect(screen.getByText("R$ 50,00")).toBeDefined();
    expect(screen.getByText("R$ 42,00")).toBeDefined();
    expect(screen.queryByText("Lynch")).toBeNull();
  });

  it("exibe 4 vértices quando lynch é aplicável (STOCK_BR/STOCK_US)", () => {
    const valuation = {
      bazin: 45.5,
      graham: 50.0,
      gordon: 42.0,
      lynch: 60.0,
      consensus: 47.75,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    // 4 vértices de método (Gordon, Bazin, Graham, Lynch) + Consenso central = 5 triggers
    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(5);

    expect(screen.getByText("Lynch")).toBeDefined();
    expect(screen.getByText("R$ 60,00")).toBeDefined();
  });

  it("exibe tooltips de não-aplicabilidade quando os modelos são nulos ou inválidos", () => {
    const valuation = {
      bazin: null,
      graham: 0,
      gordon: null,
      lynch: undefined,
      consensus: null,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(4);

    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBe(4); // Gordon, Bazin, Graham e Consenso
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/components/ceiling/watchlist/__tests__/ConsensusPyramid.test.tsx`
Expected: FAIL — o componente atual sempre renderiza 3 vértices fixos (Gordon/Bazin/Graham) e não sabe o que fazer com `lynch`.

- [ ] **Step 3: Adicionar `"lynch"` ao `MethodDetailSheet`**

Em `src/components/ceiling/watchlist/MethodDetailSheet.tsx`, atualize a interface e o switch:

```typescript
interface MethodDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Method type for icon: 'gordon' | 'bazin' | 'graham' | 'lynch' | 'consensus' */
  methodType: "gordon" | "bazin" | "graham" | "lynch" | "consensus";
}
```

```typescript
  const getMethodIcon = () => {
    switch (methodType) {
      case "gordon":
        return "📈";
      case "bazin":
        return "📊";
      case "graham":
        return "🔍";
      case "lynch":
        return "🚀";
      case "consensus":
        return "✨";
    }
  };
```

- [ ] **Step 4: Reescrever `ConsensusPyramid.tsx`**

Substitua o conteúdo de `src/components/ceiling/watchlist/ConsensusPyramid.tsx` por:

```typescript
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { MethodDetailSheet } from "./MethodDetailSheet";

type MethodType = "gordon" | "bazin" | "graham" | "lynch" | "consensus";

interface ValuationData {
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch?: number | null;
  consensus: number | null;
  methodDetails?: {
    gordon?: { formula: string; rate: number; growth: number; source: string; date: string; growthSource: string };
    bazin?: { formula: string; yieldTarget: number; isNetJcp: boolean; source: string; date: string };
    graham?: { formula: string; margin: number; source: string; date: string };
    lynch?: { formula: string; growth: number; dividendYield: number; source: string; date: string };
    consensus?: { methods: string[]; excluded: string[] };
  };
}

interface ConsensusPyramidProps {
  valuation: ValuationData;
  currency: Currency;
}

type DiamondSlot = "top" | "left" | "right" | "bottom";

const SLOT_POSITION_CLASS: Record<DiamondSlot, string> = {
  top: "top-0 left-1/2 -translate-x-1/2",
  left: "bottom-0 left-4",
  right: "bottom-0 right-4",
  bottom: "bottom-0 left-1/2 -translate-x-1/2",
};

const SLOT_COORDS: Record<DiamondSlot, { x: number; y: number }> = {
  top: { x: 160, y: 40 },
  left: { x: 50, y: 220 },
  right: { x: 270, y: 220 },
  bottom: { x: 160, y: 240 },
};

interface VertexConfig {
  key: MethodType;
  label: string;
  value: number | null;
  slot: DiamondSlot;
  conceptTooltip?: string;
  notApplicableTooltip?: string;
}

export function ConsensusPyramid({ valuation, currency }: ConsensusPyramidProps) {
  const { locale, t } = useI18n();
  const [mobileMethodOpen, setMobileMethodOpen] = useState<MethodType | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 375;

  const gordonTooltip = valuation.methodDetails?.gordon
    ? `${t.valuationAssumptions.gordonTooltipFormula}. ${t.valuationAssumptions.gordonTooltipRate.replace("{{rate}}", valuation.methodDetails.gordon.rate.toFixed(2))}. ${t.valuationAssumptions.gordonTooltipGrowth.replace("{{growth}}", valuation.methodDetails.gordon.growth.toFixed(2))}. ${t.valuationAssumptions.gordonTooltipGrowthSource}. ${t.valuationAssumptions.gordonTooltipSource.replace("{{source}}", valuation.methodDetails.gordon.source).replace("{{date}}", valuation.methodDetails.gordon.date)}`
    : t.tooltips?.gordon;

  const bazinTooltip = valuation.methodDetails?.bazin
    ? `${t.valuationAssumptions.bazinTooltipFormula}. ${t.valuationAssumptions.bazinTooltipYieldTarget.replace("{{yieldTarget}}", valuation.methodDetails.bazin.yieldTarget.toFixed(2))}. ${valuation.methodDetails.bazin.isNetJcp ? t.valuationAssumptions.bazinTooltipNetJcp : t.valuationAssumptions.bazinTooltipDividend}. ${t.valuationAssumptions.bazinTooltipSource.replace("{{source}}", valuation.methodDetails.bazin.source).replace("{{date}}", valuation.methodDetails.bazin.date)}`
    : t.tooltips?.bazin;

  const grahamTooltip = valuation.methodDetails?.graham
    ? `${t.valuationAssumptions.grahamTooltipFormula}. ${t.valuationAssumptions.grahamTooltipMargin.replace("{{margin}}", valuation.methodDetails.graham.margin.toFixed(1))}. ${t.valuationAssumptions.grahamTooltipSource.replace("{{source}}", valuation.methodDetails.graham.source).replace("{{date}}", valuation.methodDetails.graham.date)}`
    : t.tooltips?.graham;

  const lynchTooltip = valuation.methodDetails?.lynch
    ? `${t.valuationAssumptions.lynchTooltipFormula}. ${t.valuationAssumptions.lynchTooltipGrowth.replace("{{growth}}", valuation.methodDetails.lynch.growth.toFixed(2))}. ${t.valuationAssumptions.lynchTooltipDividendYield.replace("{{dividendYield}}", valuation.methodDetails.lynch.dividendYield.toFixed(2))}. ${t.valuationAssumptions.lynchTooltipSource.replace("{{source}}", valuation.methodDetails.lynch.source).replace("{{date}}", valuation.methodDetails.lynch.date)}`
    : t.tooltips?.lynch;

  const consensusTooltip = valuation.methodDetails?.consensus
    ? `${t.valuationAssumptions.consensusTooltipMethods.replace("{{methods}}", valuation.methodDetails.consensus.methods.join(", "))}. ${valuation.methodDetails.consensus.excluded.length > 0 ? t.valuationAssumptions.consensusTooltipExcluded.replace("{{excluded}}", valuation.methodDetails.consensus.excluded.join(", ")) : ""}`
    : t.tooltips?.consensus;

  // Lynch only occupies a slot when the caller passes it explicitly (a number, or
  // null for "applicable but no data"). FII/REIT/ETF callers omit the key entirely
  // (or pass undefined) because Lynch is structurally not computed for those classes.
  const hasLynchSlot = valuation.lynch !== undefined;

  const vertices: VertexConfig[] = [
    { key: "gordon", label: "Gordon", value: valuation.gordon, slot: "top", conceptTooltip: gordonTooltip, notApplicableTooltip: t.tooltips?.gordonNotApplicable },
    { key: "bazin", label: "Bazin", value: valuation.bazin, slot: "left", conceptTooltip: bazinTooltip, notApplicableTooltip: t.tooltips?.bazinNotApplicable },
    { key: "graham", label: "Graham", value: valuation.graham, slot: "right", conceptTooltip: grahamTooltip, notApplicableTooltip: t.tooltips?.grahamNotApplicable },
  ];

  if (hasLynchSlot) {
    vertices.push({
      key: "lynch",
      label: "Lynch",
      value: valuation.lynch ?? null,
      slot: "bottom",
      conceptTooltip: lynchTooltip,
      notApplicableTooltip: t.tooltips?.lynchNotApplicable,
    });
  }

  const renderVertex = (vertex: VertexConfig) => {
    const { key, label, value, slot, conceptTooltip, notApplicableTooltip } = vertex;
    const isNull = value === null || value <= 0;
    const tooltipContent = isNull ? notApplicableTooltip : conceptTooltip;
    const positionClass = SLOT_POSITION_CLASS[slot];

    const renderTooltipTrigger = () => {
      if (!tooltipContent) {
        return <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</span>;
      }

      if (isMobile) {
        return (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                  onClick={() => setMobileMethodOpen(key)}
                >
                  {label}
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed" side="top">
                {t.valuationAssumptions.whyThisNumber}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      const side = slot === "top" ? "bottom" : slot === "bottom" ? "top" : "top";

      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                {label}
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side={side as any}
              align="start"
              className="max-w-[280px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed"
            >
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    return (
      <div
        key={key}
        className={`absolute flex flex-col items-center justify-center ${positionClass} ${isNull ? "opacity-60" : ""}`}
      >
        <div className="rounded-md border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md shadow-lg flex flex-col items-center">
          {renderTooltipTrigger()}
          <span className="text-sm font-bold text-white">
            {isNull ? "N/A" : formatCurrency(value, currency, locale)}
          </span>
        </div>
      </div>
    );
  };

  const activeSlots = vertices.map((v) => v.slot);
  const points = activeSlots.map((slot) => `${SLOT_COORDS[slot].x},${SLOT_COORDS[slot].y}`).join(" ");
  const center = { x: 160, y: 150 };

  return (
    <>
      <div className="mb-6 rounded-xl border border-white/5 bg-[#0a0a0c] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/5 pointer-events-none" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

        <h3 className="mb-8 text-center text-xs font-semibold text-white/80 uppercase tracking-widest">
          {t.valuation.pyramidTitle}
        </h3>

        <div className="relative w-full max-w-[320px] mx-auto h-[260px]">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 320 260"
          >
            <polygon
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="text-primary/30"
            />
            {activeSlots.map((slot) => (
              <line
                key={slot}
                x1={SLOT_COORDS[slot].x}
                y1={SLOT_COORDS[slot].y}
                x2={center.x}
                y2={center.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary/30"
              />
            ))}
          </svg>

          {vertices.map(renderVertex)}

          <div className="absolute top-[150px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative rounded-full border border-primary/50 bg-black px-5 py-2.5 shadow-primary/20 backdrop-blur-xl">
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest text-center mb-0.5 drop-shadow-md">
                {t.valuation.consensusBadge}
                {consensusTooltip && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isMobile ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                            onClick={() => setMobileMethodOpen("consensus")}
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="center"
                        className="max-w-[280px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed"
                      >
                        {consensusTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
              <span className="block text-xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {valuation.consensus !== null && valuation.consensus > 0
                  ? formatCurrency(valuation.consensus, currency, locale)
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <>
          <MethodDetailSheet
            isOpen={mobileMethodOpen === "gordon"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.gordonTooltipTitle}
            methodType="gordon"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.gordonTooltipFormula}</p>
              {valuation.methodDetails?.gordon && (
                <>
                  <p>{t.valuationAssumptions.gordonTooltipRate.replace("{{rate}}", valuation.methodDetails.gordon.rate.toFixed(2))}</p>
                  <p>{t.valuationAssumptions.gordonTooltipGrowth.replace("{{growth}}", valuation.methodDetails.gordon.growth.toFixed(2))}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.gordonTooltipGrowthSource}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.gordonTooltipSource.replace("{{source}}", valuation.methodDetails.gordon.source).replace("{{date}}", valuation.methodDetails.gordon.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "bazin"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.bazinTooltipTitle}
            methodType="bazin"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.bazinTooltipFormula}</p>
              {valuation.methodDetails?.bazin && (
                <>
                  <p>{t.valuationAssumptions.bazinTooltipYieldTarget.replace("{{yieldTarget}}", valuation.methodDetails.bazin.yieldTarget.toFixed(2))}</p>
                  <p className="text-muted-foreground">{valuation.methodDetails.bazin.isNetJcp ? t.valuationAssumptions.bazinTooltipNetJcp : t.valuationAssumptions.bazinTooltipDividend}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.bazinTooltipSource.replace("{{source}}", valuation.methodDetails.bazin.source).replace("{{date}}", valuation.methodDetails.bazin.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "graham"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.grahamTooltipTitle}
            methodType="graham"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.grahamTooltipFormula}</p>
              {valuation.methodDetails?.graham && (
                <>
                  <p>{t.valuationAssumptions.grahamTooltipMargin.replace("{{margin}}", valuation.methodDetails.graham.margin.toFixed(1))}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.grahamTooltipSource.replace("{{source}}", valuation.methodDetails.graham.source).replace("{{date}}", valuation.methodDetails.graham.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "lynch"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.lynchTooltipTitle}
            methodType="lynch"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.lynchTooltipFormula}</p>
              {valuation.methodDetails?.lynch && (
                <>
                  <p>{t.valuationAssumptions.lynchTooltipGrowth.replace("{{growth}}", valuation.methodDetails.lynch.growth.toFixed(2))}</p>
                  <p>{t.valuationAssumptions.lynchTooltipDividendYield.replace("{{dividendYield}}", valuation.methodDetails.lynch.dividendYield.toFixed(2))}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.lynchTooltipSource.replace("{{source}}", valuation.methodDetails.lynch.source).replace("{{date}}", valuation.methodDetails.lynch.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "consensus"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.consensusTooltipTitle}
            methodType="consensus"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.consensusTooltipTitle}</p>
              {valuation.methodDetails?.consensus && (
                <>
                  <p>{t.valuationAssumptions.consensusTooltipMethods.replace("{{methods}}", valuation.methodDetails.consensus.methods.join(", "))}</p>
                  {valuation.methodDetails.consensus.excluded.length > 0 && (
                    <p className="text-muted-foreground">{t.valuationAssumptions.consensusTooltipExcluded.replace("{{excluded}}", valuation.methodDetails.consensus.excluded.join(", "))}</p>
                  )}
                </>
              )}
            </div>
          </MethodDetailSheet>
        </>
      )}
    </>
  );
}
```

Nota importante sobre `hasLynchSlot`: como `ValuationData.lynch` é opcional (`lynch?: number | null`), o vértice só aparece quando o chamador passa `lynch` explicitamente (mesmo que `null` por falta de dado pontual). Para FII/REIT/ETF, o call site em `AssetDetailSheet.tsx` deve omitir a chave (`undefined`) — resolvido no Step 5.

- [ ] **Step 5: Ajustar o call site em `AssetDetailSheet.tsx` para omitir `lynch` quando a classe não o suporta**

Abra `src/components/ceiling/watchlist/AssetDetailSheet.tsx`. Primeiro, confira como o tipo do ativo é acessado nesse arquivo:

Run: `grep -n "asset.type\|\.type ===" "src/components/ceiling/watchlist/AssetDetailSheet.tsx" | head -20`

Use os literais de tipo encontrados (provavelmente `"STOCK_BR"` e `"STOCK_US"`, conforme usados em `calculations.ts`) para substituir a linha 446, `<ConsensusPyramid valuation={valuation} currency={asset.currency} />`, por:

```typescript
                      <ConsensusPyramid
                        valuation={{
                          ...valuation,
                          lynch: asset.type === "STOCK_BR" || asset.type === "STOCK_US" ? valuation.lynch : undefined,
                        }}
                        currency={asset.currency}
                      />
```

- [ ] **Step 6: Rodar o teste do componente para confirmar que passa**

Run: `npx vitest run src/components/ceiling/watchlist/__tests__/ConsensusPyramid.test.tsx`
Expected: PASS nos 3 casos.

- [ ] **Step 7: Rodar a suíte completa de testes do projeto**

Run: `npx vitest run`
Expected: PASS em toda a suíte. Se `src/components/ceiling/watchlist/__tests__/AssetDetailSheet.test.tsx` ou `src/lib/audit/__tests__/buildDecisionLog.test.ts` falharem por causa do novo campo `lynch` em mocks de `ValuationResult`, adicione `lynch: null` ao mock correspondente.

- [ ] **Step 8: Verificação manual no navegador**

Inicie o servidor de dev do projeto e abra a tela de detalhes de um ativo STOCK_BR (4 vértices esperados, incluindo Lynch) e de um FII (3 vértices, sem Lynch). Confirme visualmente que o losango de 4 vértices não sobrepõe textos nem estoura o card em telas mobile (375px) e desktop, e que o tooltip/bottom sheet de Lynch abre corretamente.

- [ ] **Step 9: Commit**

```bash
git add src/components/ceiling/watchlist/ConsensusPyramid.tsx src/components/ceiling/watchlist/MethodDetailSheet.tsx src/components/ceiling/watchlist/AssetDetailSheet.tsx src/components/ceiling/watchlist/__tests__/ConsensusPyramid.test.tsx
git commit -m "feat(ui): redesenha ConsensusPyramid como losango dinâmico com Lynch

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Verificação final

**Files:**
- Nenhum arquivo novo — apenas verificação.

- [ ] **Step 1: Rodar a suíte completa de testes**

Run: `npx vitest run`
Expected: PASS em 100% dos testes.

- [ ] **Step 2: Rodar checagem de tipos**

Run: `npx tsc --noEmit -p .`
Expected: sem erros.

- [ ] **Step 3: Buscar por referências residuais que ainda misturem graham/lynch de forma incorreta**

Run: `grep -rn "graham" src --include="*.tsx" --include="*.ts" | grep -i "STOCK_US"`
Expected: nenhuma ocorrência restante, exceto os fallbacks intencionais `graham ?? lynch` da Task 3.

- [ ] **Step 4: Commit final (se houver ajustes pendentes de limpeza)**

```bash
git add -A
git commit -m "chore: verificação final do consenso de 4 métodos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Pular este commit se não houver mudanças pendentes.)
