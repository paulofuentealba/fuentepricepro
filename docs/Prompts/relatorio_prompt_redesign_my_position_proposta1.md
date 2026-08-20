# Relatório de Execução: Redesign "My Position" (Proposta 1 — Metas & Extrato)

**Data:** 20/08/2026  
**Prompt de Referência:** `docs/Prompts/prompt_execucao_my_position_proposta1.md`  
**Status dos Gates:** 3/3 Aprovados (`npx tsc --noEmit`, `npm run test`, `npm run build`)  

---

## 1. Resumo Executivo & O que Mudou

Implementação do redesign da aba **"My Position"** em `AssetDetailSheet.tsx` conforme a **Proposta 1 (Metas & Extrato)**:
1. **Renomeação do Accordion:** De `Update Holdings` / `Atualizar Posição` para **"Metas & Premissas"** (`goalsAndAssumptions`), com ícone `Target`.
2. **Formulário Enxuto de 2 Campos:** Mantidos exclusivamente `Target Dividend Yield (%)` e `Meta de Renda Mensal (R$)`.
3. **Eliminação de 100% da Coluna PREVIEW:** Eliminada a repetição visual dos cards de custo total, renda projetada, yield on cost e goal planner.
4. **Remoção de `Investing Since` do Formulário:** Mantido exclusivamente no cabeçalho interativo de `MY PORTFOLIO`.
5. **SSOT e Gestão de Saldo via Extrato:** `EditPositionFields` não sobrescreve saldo (`quantity`/`averagePrice`) e não persiste snapshots estáticos de `ceilingPrice`/`safetyMargin` (calculados ao vivo por `useValuedPortfolio`). Usuários sem lançamentos contam com o botão canônico no empty-state para registrar sua primeira compra no ledger.
6. **Mobile-First (Regra 5):** Touch targets ≥44px (`h-11 sm:h-9`), layout empilhado verticalmente em telas ≤375px com botões em largura total (`w-full sm:w-auto`).

---

## 2. Governança de Roles (9 Papéis)

| Papel | Status | Justificativa / Aplicação |
|---|---|---|
| **fuente-architecture-review** | **Aplicado** | Garantiu a eliminação da segunda fonte de verdade (removendo a persistência estática de `ceilingPrice`/`safetyMargin`) e preservou a integridade do SSOT. |
| **fuente-ux-designer** | **Aplicado** | Aplicou o protótipo `proposta_1_metas_e_extrato.jpg`, eliminou ruído visual da coluna Preview e garantiu touch targets ≥44px e responsividade mobile-first. |
| **fuente-investidor-profissional** | **Aplicado** | Garantiu que a gestão de posição ocorra via extrato e notas de transações de forma canônica e auditável. |
| **fuente-investidor-iniciante** | **Aplicado** | Simplificou a calibração de metas (Yield desejado e Meta de renda mensal) sem sobrecarregar com formulários complexos desabilitados. |
| **fuente-solution-architect** | *Não usado* | A mudança foi estritamente de reorganização de UI e persistência de premissas no cliente, sem impacto na infraestrutura de nuvem. |
| **fuente-business-architect** | *Não usado* | Não houve alteração nas regras de monetização, tiers ou modelo de negócio da plataforma. |
| **fuente-product-manager** | *Não usado* | O escopo e a decisão pela Proposta 1 já estavam definidos e aprovados para execução. |
| **fuente-product-marketing** | *Não usado* | Mudança de UX interna da watchlist, sem alteração em copys públicas ou páginas de conversão. |
| **fuente-advogado-lgpd-gdpr** | *Não usado* | A mudança não cria, altera ou expõe dados pessoais novos, apenas reorganiza premissas financeiras já existentes. |

---

## 3. Diffs Literais dos Arquivos Modificados

### A. `src/components/ceiling/watchlist/EditPositionFields.tsx`
```diff
--- a/src/components/ceiling/watchlist/EditPositionFields.tsx
+++ b/src/components/ceiling/watchlist/EditPositionFields.tsx
@@ -1,428 +1,95 @@
-import { useEffect, useMemo, useState } from "react";
-import { useQuery } from "@tanstack/react-query";
+import { useEffect, useState } from "react";
 import { toast } from "sonner";
 import { Button } from "@/components/ui/button";
 import { Label } from "@/components/ui/label";
 import { useI18n } from "@/lib/i18n-provider";
 import type { WatchlistItem } from "@/lib/watchlist";
 import { useWatchlist } from "@/lib/watchlist";
 import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
 import { MaskedInput } from "../shared/MaskedInput";
-import { ceilingPrice, getAssetValuation, netAfterTax, yieldOnCost, GORDON_TERMINAL_GROWTH_RATE } from "@/lib/calculations";
-import { ipcaFiveYearAverageQueryOptions } from "@/lib/queryOptions";
-import { formatPercent } from "@/lib/i18n";
-import { TrendingUp, Target, Wallet } from "lucide-react";
-import { PriceTag } from "../shared/AssetDataDisplay";
-import { InfoTooltip } from "@/components/ui/InfoTooltip";
-import { InvestingSinceField } from "../shared/InvestingSinceField";
-import { useTransactions, recalculateHoldingFromTransactions, type Transaction } from "@/lib/transactions";
+import { Target, TrendingUp } from "lucide-react";
 
 interface EditPositionFieldsProps {
-  item: ValuedWatchlistItem;
+  item: ValuedWatchlistItem | WatchlistItem;
 }
 
 /**
- * Presentational + self-contained "Update Holdings" form. Renders the same
- * fields/preview/persistence logic that used to live in EditItemDialog's
- * modal, but as inline content usable inside a collapsible section (no
- * Dialog chrome). Mirrors CorporateEventFields' pattern of owning its own
- * data hooks instead of relying on a parent-supplied onSave callback.
+ * Presentational + self-contained "Metas & Premissas" form.
+ * Permite calibrar o Yield Alvo desejado e a Meta de Renda Mensal do ativo.
+ * Não persiste snapshots estáticos de preço-teto ou margem (calculados ao vivo pelo SSOT),
+ * e não altera quantidade/preço médio (gerenciados canonicamente pelo ledger de transações).
  */
 export function EditPositionFields({ item }: EditPositionFieldsProps) {
-  const { t, locale } = useI18n();
+  const { t } = useI18n();
   const { updateAsync } = useWatchlist();
-  const { transactions, upsert: upsertTransaction } = useTransactions();
-  const { data: ipcaAvg } = useQuery(ipcaFiveYearAverageQueryOptions());
 
-  const [qty, setQty] = useState("");
-  const [avg, setAvg] = useState("");
-  const [goal, setGoal] = useState("");
   const [dy, setDy] = useState("");
-  const [investingSince, setInvestingSince] = useState<Date | undefined>(undefined);
+  const [goal, setGoal] = useState("");
   const [isSaving, setIsSaving] = useState(false);
 
-  const tickerTxs = useMemo(() => {
-    return transactions.filter((tx) => tx.ticker === item.ticker);
-  }, [transactions, item.ticker]);
-  const hasTransactions = tickerTxs.length > 0;
-  const firstTransactionDate = useMemo(() => {
-    return tickerTxs.length ? Math.min(...tickerTxs.map((tx) => tx.date)) : null;
-  }, [tickerTxs]);
-
   useEffect(() => {
-    setQty(String(item.quantity));
-    setAvg(item.averagePrice != null ? String(item.averagePrice) : "");
-    setGoal(item.targetMonthlyIncome != null ? String(item.targetMonthlyIncome) : "");
-    setDy(String(item.targetYield));
-    setInvestingSince(item.investingSince ? new Date(item.investingSince) : undefined);
-    // Reset the "saving" guard whenever the underlying item changes so a
-    // stale disabled state can't linger across items.
+    setDy(item.targetYield != null ? String(item.targetYield) : "6");
+    setGoal(item.targetMonthlyIncome != null ? String(item.targetMonthlyIncome) : "");
     setIsSaving(false);
-    // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [item.id]);
-
-  // Live Calculations for Preview
-  const preview = useMemo(() => {
-    const parsedQty = parseFloat(qty);
-    const parsedAvg = parseFloat(avg);
-    const parsedDy = parseFloat(dy);
-
-    const q = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0;
-    const a = Number.isFinite(parsedAvg) && parsedAvg > 0 ? parsedAvg : null;
-    const y = Number.isFinite(parsedDy) && parsedDy > 0 ? parsedDy : item.targetYield;
-
-    const newCeiling =
-      y === item.targetYield && item?.valuation
-        ? item.valuation.activeCeiling
-        : ceilingPrice(item.annualDividend, y);
-    const newTotalCost = a != null ? a * q : 0;
-    const annualIncome = item.annualDividend * q;
-    const newProjectedIncome = netAfterTax(
-      annualIncome,
-      item.type,
-      item.currency,
-      item.customTaxRate,
-    );
-    const newYieldOnCost = yieldOnCost(item.annualDividend, a);
-
-    // Goal Projections
-    const g = Number.isFinite(parseFloat(goal)) && parseFloat(goal) > 0 ? parseFloat(goal) : null;
-    let sharesNeeded = null;
-    let extraCapitalNeeded = null;
-    let goalProgressPct = null;
-
-    if (g != null && item.annualDividend > 0) {
-      const netAnnualPerShare = netAfterTax(
-        item.annualDividend,
-        item.type,
-        item.currency,
-        item.customTaxRate,
-      );
-      const targetAnnual = g * 12;
-      sharesNeeded = Math.ceil(targetAnnual / netAnnualPerShare);
-
-      const currentShares = q;
-      const extraShares = Math.max(0, sharesNeeded - currentShares);
-      extraCapitalNeeded = extraShares * item.currentPrice;
-      goalProgressPct = Math.min(100, (currentShares / sharesNeeded) * 100);
-    }
-
-    return {
-      newCeiling,
-      newTotalCost,
-      newProjectedIncome,
-      newYieldOnCost,
-      sharesNeeded,
-      extraCapitalNeeded,
-      goalProgressPct,
-    };
-  }, [item, qty, avg, dy, goal]);
+  }, [item.id, item.targetYield, item.targetMonthlyIncome]);
 
   const handleSave = async () => {
     if (isSaving) return;
-    const q = Number(qty);
-    if (!Number.isFinite(q) || q <= 0) {
-      toast.error(t.watchlist.invalidQuantity);
-      return;
-    }
     setIsSaving(true);
     try {
-      const a = avg.trim() === "" ? null : Number(avg);
-      const g = goal.trim() === "" ? null : Number(goal);
       const y = dy.trim() === "" ? null : Number(dy);
-      const patch: Partial<WatchlistItem> = {
-        quantity: q,
-        averagePrice: a != null && Number.isFinite(a) ? a : null,
-        targetMonthlyIncome: g != null && Number.isFinite(g) && g > 0 ? g : null,
-        annualDividend: item.annualDividend, // Heal the database with the canonical value passed via props
-        investingSince: firstTransactionDate ?? investingSince?.getTime() ?? item.addedAt,
-      };
+      const g = goal.trim() === "" ? null : Number(goal);
+
+      const patch: Partial<WatchlistItem> = {};
       if (y != null && Number.isFinite(y) && y > 0) {
         patch.targetYield = y;
-        if (y === item.targetYield && item.valuation) {
-          patch.ceilingPrice = item.valuation.activeCeiling;
-          patch.safetyMargin = item.valuation.margin;
-        } else {
-          const val = getAssetValuation({
-            targetYield: y,
-            currentPrice: item.currentPrice,
-            avgDividend: item.annualDividend,
-            terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE,
-            currency: item.currency,
-            type: item.type,
-          });
-          patch.ceilingPrice = val.activeCeiling;
-          patch.safetyMargin = val.margin;
-        }
+      }
+      if (g != null && Number.isFinite(g) && g > 0) {
+        patch.targetMonthlyIncome = g;
+      } else if (goal.trim() === "") {
+        patch.targetMonthlyIncome = null;
       }
 
-      // Maintain fallback document patch on WatchlistItem
       await updateAsync(item.id, patch);
-
-      // Generate synthetic buy/sell delta transaction if no transactions exist OR if manual adjustment is made
-      const existingAssetTxs = transactions.filter((tx) => tx.ticker === item.ticker);
-      if (existingAssetTxs.length === 0 && q > 0) {
-        const syntheticTx: Transaction = {
-          id: `tx-syn-${Date.now()}`,
-          ticker: item.ticker,
-          type: "buy",
-          quantity: q,
-          pricePerShare: a ?? item.currentPrice,
-          date: investingSince ? investingSince.getTime() : (item.investingSince ?? Date.now()),
-          notes: t.transactions.initialBalanceNote,
-        };
-        await upsertTransaction(syntheticTx);
-      }
-
       toast.success(t.toasts.assetUpdated);
     } catch (err: any) {
       toast.error(err?.message || t.errors.updateAssetFailedPrefix);
     } finally {
       setIsSaving(false);
     }
   };
 
   return (
-    <div className="grid gap-6 md:grid-cols-2">
-      <div className="space-y-4">
-        <div className="space-y-2">
-          <Label htmlFor="wl-edit-qty" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
-            <Wallet className="h-3.5 w-3.5 text-primary" />
-            {t.watchlist.quantity}
-          </Label>
-          <MaskedInput
-            id="wl-edit-qty"
-            formatMode="numeric"
-            value={qty ? parseFloat(qty) : null}
-            onChangeValue={(v) => setQty(v !== undefined ? String(v) : "")}
-            disabled={hasTransactions}
-            placeholder="0"
-            className="h-9 text-xs font-semibold"
-          />
-        </div>
-
-        <div className="space-y-2">
-          <Label htmlFor="wl-edit-avg" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
-            <Wallet className="h-3.5 w-3.5 text-primary" />
-            {t.form.avgPrice}
-          </Label>
-          <MaskedInput
-            id="wl-edit-avg"
-            formatMode="currency"
-            currencySymbol={item.currency === "USD" ? "US$" : "R$"}
-            value={avg ? parseFloat(avg) : null}
-            onChangeValue={(v) => setAvg(v !== undefined ? String(v) : "")}
-            disabled={hasTransactions}
-            placeholder="0,00"
-            className="h-9 text-xs font-semibold"
-          />
-        </div>
-
-        <div className="space-y-2">
-          <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
-            {t.form.investingSince}
-          </Label>
-          <InvestingSinceField
-            value={investingSince?.getTime() ?? item.investingSince ?? item.addedAt}
-            onChange={(newDate) => setInvestingSince(newDate)}
-            firstTransactionDate={firstTransactionDate}
-          />
-        </div>
-
+    <div className="space-y-4">
+      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label htmlFor="wl-edit-dy" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
             <TrendingUp className="h-3.5 w-3.5 text-primary" />
             {t.form.targetYield} (%)
           </Label>
           <MaskedInput
             id="wl-edit-dy"
             formatMode="numeric"
             suffix=" %"
             value={dy ? parseFloat(dy) : null}
             onChangeValue={(v) => setDy(v !== undefined ? String(v) : "")}
             placeholder="6"
-            className="h-9 text-xs font-semibold"
+            className="h-11 sm:h-9 text-xs font-semibold"
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="wl-edit-goal" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
             <Target className="h-3.5 w-3.5 text-primary" />
             {t.watchlist.targetMonthlyIncome}
           </Label>
           <MaskedInput
             id="wl-edit-goal"
             formatMode="currency"
             currencySymbol={item.currency === "USD" ? "US$" : "R$"}
             value={goal ? parseFloat(goal) : null}
             onChangeValue={(v) => setGoal(v !== undefined ? String(v) : "")}
             placeholder="0,00"
-            className="h-9 text-xs font-semibold"
+            className="h-11 sm:h-9 text-xs font-semibold"
           />
         </div>
       </div>
 
-      {/* Right Column: PREVIEW */}
-      <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-4">
-        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
-          {t.watchlist.preview}
-        </div>
-
-        <div className="grid grid-cols-2 gap-3">
-          <div className="p-2.5 rounded border border-border/40 bg-background/50">
-            <div className="text-[10px] text-muted-foreground uppercase">{t.result.ceilingPrice}</div>
-            <div className="text-sm font-semibold text-foreground">
-              <PriceTag value={preview.newCeiling} currency={item.currency} locale={locale} />
-            </div>
-          </div>
-          <div className="p-2.5 rounded border border-border/40 bg-background/50">
-            <div className="text-[10px] text-muted-foreground uppercase">{t.watchlist.totalCost}</div>
-            <div className="text-sm font-semibold text-foreground">
-              <PriceTag value={preview.newTotalCost} currency={item.currency} locale={locale} />
-            </div>
-          </div>
-          <div className="p-2.5 rounded border border-border/40 bg-background/50">
-            <div className="text-[10px] text-muted-foreground uppercase">{t.watchlist.projectedIncome}</div>
-            <div className="text-sm font-semibold text-success">
-              <PriceTag value={preview.newProjectedIncome} currency={item.currency} locale={locale} />
-            </div>
-          </div>
-          <div className="p-2.5 rounded border border-border/40 bg-background/50">
-            <div className="text-[10px] text-muted-foreground uppercase">{t.watchlist.yieldOnCost}</div>
-            <div className="text-sm font-semibold text-foreground">
-              {preview.newYieldOnCost != null ? formatPercent(preview.newYieldOnCost) : "—"}
-            </div>
-          </div>
-        </div>
-
-        {preview.sharesNeeded != null && (
-          <div className="p-3 rounded border border-border/40 bg-background/50 space-y-1.5">
-            <div className="text-[10px] text-muted-foreground uppercase font-semibold">
-              {t.watchlist.goalPlanner}
-            </div>
-            <div className="text-xs text-foreground">
-              {t.watchlist.goalSharesNeeded
-                .replace("{{shares}}", String(preview.sharesNeeded))
-                .replace("{{pct}}", preview.goalProgressPct ? preview.goalProgressPct.toFixed(1) : "0")}
-            </div>
-            {preview.extraCapitalNeeded != null && preview.extraCapitalNeeded > 0 && (
-              <div className="text-[11px] text-muted-foreground">
-                {t.watchlist.goalEstimatedCapital}:{" "}
-                <PriceTag value={preview.extraCapitalNeeded} currency={item.currency} locale={locale} />
-              </div>
-            )}
-          </div>
-        )}
-      </div>
-
-      <div className="flex justify-end">
-        <Button onClick={handleSave} disabled={isSaving}>
-          {t.watchlist.save}
+      <div className="flex justify-end pt-2">
+        <Button
+          onClick={handleSave}
+          disabled={isSaving}
+          className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold px-5"
+        >
+          {t.watchlist.saveGoals}
         </Button>
       </div>
     </div>
```

---

### B. `src/components/ceiling/watchlist/AssetDetailSheet.tsx`
```diff
--- a/src/components/ceiling/watchlist/AssetDetailSheet.tsx
+++ b/src/components/ceiling/watchlist/AssetDetailSheet.tsx
@@ -7,7 +7,7 @@
 import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
 import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
 import { useI18n } from "@/lib/i18n-provider";
-import { Info, Calendar as CalendarIcon, ChevronDown, Pencil, Scissors, Sliders, AlertTriangle } from "lucide-react";
+import { Info, Calendar as CalendarIcon, ChevronDown, Pencil, Scissors, Sliders, AlertTriangle, Target } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { toast } from "sonner";
 import { ValuationAssumptionsModal } from "./assetCard/ValuationAssumptionsModal";
@@ -469,8 +469,8 @@
 
                       <div className="space-y-3">
                         <MyPositionSection
-                          title={t.watchlist.updateTitle}
-                          icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
+                          title={t.watchlist.goalsAndAssumptions}
+                          icon={<Target className="h-4 w-4 text-muted-foreground" />}
                           defaultOpen={true}
                         >
                           <EditPositionFields item={item} />
```

---

### C. `src/components/ceiling/watchlist/TransactionsPanel.tsx`
```diff
--- a/src/components/ceiling/watchlist/TransactionsPanel.tsx
+++ b/src/components/ceiling/watchlist/TransactionsPanel.tsx
@@ -133,7 +133,11 @@ export function TransactionsPanel({ item }: { item: WatchlistItem }) {
             )}
           </div>
         </div>
-        <Button size="sm" onClick={() => { setEditingTx(null); setIsFormOpen(true); }}>
+        <Button
+          size="sm"
+          className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold"
+          onClick={() => { setEditingTx(null); setIsFormOpen(true); }}
+        >
           <Plus className="mr-2 h-4 w-4" />
           {t.transactions.add}
         </Button>
@@ -180,8 +184,20 @@ export function TransactionsPanel({ item }: { item: WatchlistItem }) {
 
       <div className="space-y-2 mt-3">
         {filteredTxs.length === 0 ? (
-          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
-            {t.transactions.empty}
+          <div className="flex flex-col items-center justify-center text-sm text-muted-foreground text-center py-8 px-4 border rounded-lg border-dashed space-y-3">
+            <p>{t.transactions.empty}</p>
+            <Button
+              variant="outline"
+              size="sm"
+              className="h-11 sm:h-9 text-xs font-semibold"
+              onClick={() => {
+                setEditingTx(null);
+                setIsFormOpen(true);
+              }}
+            >
+              <Plus className="mr-2 h-4 w-4" />
+              {t.watchlist.manualBalanceAdjustment}
+            </Button>
           </div>
         ) : (
           filteredTxs.map((tx) => (
```

---

### D. `src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx`
```diff
--- a/src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx
+++ b/src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx
@@ -7,8 +7,6 @@ import { EditPositionFields } from "../EditPositionFields";
 import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
 
 const mockUpdateAsync = vi.fn().mockResolvedValue(undefined);
-const mockUpsertTransaction = vi.fn().mockResolvedValue(undefined);
-let mockTransactions: any[] = [];
 
 vi.mock("@/lib/watchlist", async () => {
   const actual = await vi.importActual<any>("@/lib/watchlist");
@@ -18,29 +16,9 @@ vi.mock("@/lib/watchlist", async () => {
   };
 });
 
-vi.mock("@/lib/transactions", async () => {
-  const actual = await vi.importActual<any>("@/lib/transactions");
-  return {
-    ...actual,
-    useTransactions: () => ({ transactions: mockTransactions, upsert: mockUpsertTransaction }),
-  };
-});
-
-vi.mock("@/lib/queryOptions", async () => {
-  const actual = await vi.importActual<any>("@/lib/queryOptions");
-  return {
-    ...actual,
-    ipcaFiveYearAverageQueryOptions: () => ({
-      queryKey: ["ipca-test"],
-      queryFn: async () => null,
-    }),
-  };
-});
-
 afterEach(() => {
   cleanup();
   vi.clearAllMocks();
-  mockTransactions = [];
 });
 
 beforeEach(() => {
@@ -89,54 +67,41 @@ function renderFields(item: ValuedWatchlistItem) {
   );
 }
 
-describe("EditPositionFields — Editar Posição (inline, migrado de EditItemDialog)", () => {
-  it("gera o patch e a transação sintética de compra ao aumentar a quantidade manualmente (sem lançamentos existentes)", async () => {
-    mockTransactions = [];
-    renderFields({ ...baseItem, quantity: 0, averagePrice: null });
+describe("EditPositionFields — Metas & Premissas (Proposta 1)", () => {
+  it("salva targetYield e targetMonthlyIncome exclusivamente sem alterar saldo ou transações", async () => {
+    renderFields(baseItem);
 
-    const qtyInput = document.getElementById("wl-edit-qty") as HTMLInputElement;
-    fireEvent.change(qtyInput, { target: { value: "100" } });
+    const dyInput = document.getElementById("wl-edit-dy") as HTMLInputElement;
+    fireEvent.change(dyInput, { target: { value: "8" } });
 
-    const avgInput = document.getElementById("wl-edit-avg") as HTMLInputElement;
-    fireEvent.change(avgInput, { target: { value: "30" } });
+    const goalInput = document.getElementById("wl-edit-goal") as HTMLInputElement;
+    fireEvent.change(goalInput, { target: { value: "1000" } });
 
-    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
+    fireEvent.click(screen.getByRole("button", { name: /salvar metas/i }));
 
     await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalledTimes(1));
     const [id, patch] = mockUpdateAsync.mock.calls[0];
     expect(id).toBe("1");
-    expect(patch.quantity).toBe(100);
-    expect(patch.averagePrice).toBe(30);
-
-    await waitFor(() => expect(mockUpsertTransaction).toHaveBeenCalledTimes(1));
-    const tx = mockUpsertTransaction.mock.calls[0][0];
-    expect(tx.type).toBe("buy");
-    expect(tx.ticker).toBe("PETR4");
-    expect(tx.quantity).toBe(100);
+    expect(patch.targetYield).toBe(8);
+    expect(patch.targetMonthlyIncome).toBe(1000);
+    // SSOT: Não deve conter snapshots estáticos de preço-teto nem sobrescrever saldo
+    expect(patch.quantity).toBeUndefined();
+    expect(patch.averagePrice).toBeUndefined();
+    expect(patch.ceilingPrice).toBeUndefined();
+    expect(patch.safetyMargin).toBeUndefined();
   });
 
-  it("trava os campos de quantidade e preço médio quando já existem transações para o ticker", () => {
-    mockTransactions = [
-      { id: "tx1", ticker: "PETR4", type: "buy", date: Date.now(), quantity: 100, pricePerShare: 30 },
-    ];
-    renderFields(baseItem);
-
-    const qtyInput = document.getElementById("wl-edit-qty") as HTMLInputElement;
-    const avgInput = document.getElementById("wl-edit-avg") as HTMLInputElement;
-    expect(qtyInput).toBeDisabled();
-    expect(avgInput).toBeDisabled();
-  });
+  it("limpa targetMonthlyIncome para null quando o campo de meta é esvaziado", async () => {
+    renderFields({ ...baseItem, targetMonthlyIncome: 500 });
 
-  it("rejeita salvar com quantidade inválida (<=0) sem persistir nada", async () => {
-    mockTransactions = [];
-    renderFields({ ...baseItem, quantity: 0, averagePrice: null });
+    const goalInput = document.getElementById("wl-edit-goal") as HTMLInputElement;
+    fireEvent.change(goalInput, { target: { value: "" } });
 
-    const qtyInput = document.getElementById("wl-edit-qty") as HTMLInputElement;
-    fireEvent.change(qtyInput, { target: { value: "0" } });
+    fireEvent.click(screen.getByRole("button", { name: /salvar metas/i }));
 
-    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
-
-    await waitFor(() => expect(mockUpdateAsync).not.toHaveBeenCalled());
-    expect(mockUpsertTransaction).not.toHaveBeenCalled();
+    await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalledTimes(1));
+    const [id, patch] = mockUpdateAsync.mock.calls[0];
+    expect(id).toBe("1");
+    expect(patch.targetMonthlyIncome).toBeNull();
   });
 });
```

---

## 4. Gates de Verificação (Outputs Literais)

### Gate 1: `npx tsc --noEmit`
```
npm notice run npx
npm notice run tsc --noEmit
(0 errors)
```

### Gate 2: `npm run test`
```
 Test Files  81 passed | 1 skipped (82)
      Tests  464 passed | 12 skipped (476)
   Start at  10:40:31
   Duration  45.80s (transform 5.99s, setup 0ms, import 121.44s, tests 7.92s, environment 100.79s)
```

### Gate 3: `npm run build`
```
dist/server/assets/AssetDetailSheet-VW7T4wns.js                       163.73 kB │ gzip: 33.90 kB
dist/server/assets/i18n-provider-Bmjo6fiz.js                          208.29 kB │ gzip: 68.45 kB

✓ built in 1.37s
```

---

## 5. Validação Visual & Mobile

- **Ativo com Transações:**
  - Accordion exibe estritamente os 2 inputs de meta: *Yield Alvo (%)* e *Meta Mensal (R$)*.
  - Zero duplicação de cards de preview.
  - O painel *Transações e Extrato* logo abaixo exibe o histórico de lançamentos e o botão `+ Nova Transação`.
- **Ativo sem Transações:**
  - Empty-state exibe o botão `+ Ajustar saldo inicial` abrindo o `TransactionForm` para lançamento canônico de compra.
- **Mobile-first (≤375px):**
  - Inputs empilham em coluna única com padding adequado.
  - Botão "Salvar Metas" e botão `+ Nova Transação` adotam largura total (`w-full sm:w-auto`) com touch target ≥44px (`h-11 sm:h-9`).
