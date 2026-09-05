# Portfólio Global Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/app/myportfolio` (today: `FIProgressCard` + `Watchlist.tsx`) with a read-only "Portfólio Global" page — patrimônio/alocação header (kept from today), broker custody cards, and a unified positions table with valuation status — while adding a `broker` field to the data model, captured automatically on broker-note import and manually on Add Asset / position edit.

**Architecture:** Four new presentational components under `src/components/portfolio/` compose data already produced by `useValuedPortfolio()`. A new `broker?: string | null` field is added to `WatchlistItem`, populated by three write paths (import, manual add, manual edit) that already exist — no new persistence layer. `AssetDetailSheet` (already decoupled, prop-driven) is reused unchanged as the edit surface, triggered by a table-row click instead of a grid-card click. `Watchlist.tsx` and its exclusive subcomponents are deleted once nothing imports them.

**Tech Stack:** React 18, TypeScript, TanStack Router/Query, Firebase/Firestore, Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-04-portfolio-global-redesign-design.md`

## Global Constraints

- Rule 4 (SSOT): no valuation math (Bazin/Graham/Gordon/margin) is reimplemented anywhere in this plan — every task consumes `useValuedPortfolio()` / `src/lib/selectors/recommendedAction.ts` / `src/lib/selectors/taxRegimeLabel.ts` (already built for the Dashboard) as-is.
- Rule 2 (i18n): every user-visible string goes through `t.*` in all three dicts (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`). No hardcoded UI text.
- Rule 1 (reuse): `AllocationChart`, `AssetDetailSheet`, `computeRecommendedAction`, `computeTaxRegimeKey`, `getPositionValue`, `formatCurrency`/`formatPercent` are reused verbatim, never re-implemented.
- Rule 5 (mobile-first): the positions table uses the existing sticky-first-column pattern (`STICKY_FIRST_COLUMN_CLASS` from `src/components/ui/responsive-table.tsx`) inside a horizontally-scrolling container — the same pattern already used elsewhere in the app, not a new one.
- Broker is a free-text field with suggestions, not a closed enum (see spec's Solution Architect verdict) — `KNOWN_BROKER_LABELS` is a suggestion list, not a validation constraint.
- `git commit` after every task, following existing commit style (no `--no-verify`, message ends with the Claude co-author trailer per this session's attribution instructions).

---

### Task 1: Promote broker labels to a shared module + add `broker` to `WatchlistItem`

**Files:**
- Create: `src/lib/brokers.ts`
- Modify: `src/lib/watchlist.ts` (add field to `WatchlistItem` interface, after `investingSince: number;` at line 67)
- Modify: `src/components/portfolio/BrokerNoteImportPage.tsx` (replace local `BROKER_LABELS` with the import from `src/lib/brokers.ts`)
- Test: `src/lib/__tests__/brokers.test.ts`

**Interfaces:**
- Produces: `export type SupportedBroker = "XP" | "CLEAR" | "RICO" | "MODAL" | "BTG" | "INTER" | "NUINVEST" | "ORAMA" | "GENIAL" | "ITAU" | "BRADESCO" | "SANTANDER" | "BB" | "CAIXA" | "SCHWAB";` and `export const KNOWN_BROKER_LABELS: Record<SupportedBroker, string>` from `src/lib/brokers.ts`.
- Produces: `WatchlistItem.broker?: string | null` — consumed by Tasks 2, 3, 4, 7, 8.

- [ ] **Step 1: Write the failing test for the shared module**

```typescript
// src/lib/__tests__/brokers.test.ts
import { describe, it, expect } from "vitest";
import { KNOWN_BROKER_LABELS, type SupportedBroker } from "../brokers";

describe("KNOWN_BROKER_LABELS", () => {
  it("has a label for every SupportedBroker key", () => {
    const keys = Object.keys(KNOWN_BROKER_LABELS) as SupportedBroker[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(typeof KNOWN_BROKER_LABELS[key]).toBe("string");
      expect(KNOWN_BROKER_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it("includes BTG and SCHWAB (matching the prototype's example brokers)", () => {
    expect(KNOWN_BROKER_LABELS.BTG).toBe("BTG Pactual");
    expect(KNOWN_BROKER_LABELS.SCHWAB).toBe("Charles Schwab");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/brokers.test.ts`
Expected: FAIL with "Cannot find module '../brokers'"

- [ ] **Step 3: Create the shared module**

```typescript
// src/lib/brokers.ts
/**
 * Known custody institutions whose broker-note PDF layout `brokerNoteParser.ts` can parse
 * automatically. This is a suggestion list for the free-text `WatchlistItem.broker` field
 * (see watchlist.ts) — not a closed enum. A user's real broker (e.g. Avenue Securities) may
 * not have a supported parser yet but is still a valid value to type into that field.
 */
export type SupportedBroker =
  | "XP"
  | "CLEAR"
  | "RICO"
  | "MODAL"
  | "BTG"
  | "INTER"
  | "NUINVEST"
  | "ORAMA"
  | "GENIAL"
  | "ITAU"
  | "BRADESCO"
  | "SANTANDER"
  | "BB"
  | "CAIXA"
  | "SCHWAB";

export const KNOWN_BROKER_LABELS: Record<SupportedBroker, string> = {
  XP: "XP Investimentos",
  CLEAR: "Clear Corretora",
  RICO: "Rico Investimentos",
  MODAL: "ModalMais",
  BTG: "BTG Pactual",
  INTER: "Banco Inter",
  NUINVEST: "NuInvest",
  ORAMA: "Órama",
  GENIAL: "Genial Investimentos",
  ITAU: "Itaú Corretora",
  BRADESCO: "Bradesco / Ágora",
  SANTANDER: "Santander / Toro",
  BB: "Banco do Brasil",
  CAIXA: "Caixa Econômica Federal",
  SCHWAB: "Charles Schwab",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/brokers.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Update `brokerNoteParser.ts`'s `SupportedBroker`/`ALL_SUPPORTED_BROKERS` export to re-export from the new module (avoid two competing definitions)**

Open `src/lib/dataIngestion/brokerNoteParser.ts` and find its own `SupportedBroker` type/`ALL_SUPPORTED_BROKERS` array definition. Replace the type definition with `export type { SupportedBroker } from "@/lib/brokers";` and keep `ALL_SUPPORTED_BROKERS` as `Object.keys(KNOWN_BROKER_LABELS) as SupportedBroker[]` (import `KNOWN_BROKER_LABELS` from `@/lib/brokers`), so there is exactly one source of truth for the broker list.

- [ ] **Step 6: Update `BrokerNoteImportPage.tsx` to import the shared labels instead of its local copy**

In `src/components/portfolio/BrokerNoteImportPage.tsx`, delete the local `const BROKER_LABELS: Record<SupportedBroker, string> = { ... }` block (lines 31-47) and add `import { KNOWN_BROKER_LABELS } from "@/lib/brokers";` to the imports. Replace every remaining reference to `BROKER_LABELS` in the file with `KNOWN_BROKER_LABELS`.

- [ ] **Step 7: Add the `broker` field to `WatchlistItem`**

In `src/lib/watchlist.ts`, after the line `investingSince: number;` (line 67) and before the closing `}` of the interface (line 68), add:

```typescript
  /** Custody institution (free text; suggestions come from src/lib/brokers.ts). Null/undefined
   * for positions created before this field existed, or never assigned one manually. */
  broker?: string | null;
```

- [ ] **Step 8: Run the full existing test suite for regressions**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all existing tests still pass (the new optional field is backward-compatible with every existing `WatchlistItem` literal in the codebase).

- [ ] **Step 9: Commit**

```bash
git add src/lib/brokers.ts src/lib/__tests__/brokers.test.ts src/lib/watchlist.ts src/lib/dataIngestion/brokerNoteParser.ts src/components/portfolio/BrokerNoteImportPage.tsx
git commit -m "$(cat <<'EOF'
feat(portfolio): add broker field to WatchlistItem and shared broker labels

Promotes BROKER_LABELS out of BrokerNoteImportPage into src/lib/brokers.ts
as the single source of truth, and adds the optional broker field that
later tasks will populate from import/manual entry.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Persist the auto-detected broker on note import

**Files:**
- Modify: `src/lib/dataIngestion/brokerNoteImport.ts` (`consolidateTradesToWatchlistItems`)
- Modify: `src/components/portfolio/BrokerNoteImportPage.tsx` (pass `detectedBroker` into the call)
- Test: `src/lib/dataIngestion/__tests__/brokerNoteImport.test.ts` (extend existing tests if the file exists, else create it)

**Interfaces:**
- Consumes: `KNOWN_BROKER_LABELS`, `SupportedBroker` from `src/lib/brokers.ts` (Task 1); `WatchlistItem.broker` (Task 1).
- Produces: `consolidateTradesToWatchlistItems(trades, existingTransactions, newlyCreatedTransactions, assetDataMap, detectedBroker?: SupportedBroker | null): WatchlistItem[]` — each returned item has `broker` set to `KNOWN_BROKER_LABELS[detectedBroker]` when `detectedBroker` is provided, else `null`.

- [ ] **Step 1: Check for an existing test file and write the failing test**

```typescript
// src/lib/dataIngestion/__tests__/brokerNoteImport.test.ts
import { describe, it, expect } from "vitest";
import { consolidateTradesToWatchlistItems } from "../brokerNoteImport";

describe("consolidateTradesToWatchlistItems — broker persistence", () => {
  const trade = { ticker: "BBAS3", quantity: 100, price: 25.5, date: "01/06/2024" };

  it("sets broker from the label map when detectedBroker is provided", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], [], {}, "BTG");
    expect(items).toHaveLength(1);
    expect(items[0].broker).toBe("BTG Pactual");
  });

  it("sets broker to null when detectedBroker is omitted", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], []);
    expect(items).toHaveLength(1);
    expect(items[0].broker).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dataIngestion/__tests__/brokerNoteImport.test.ts`
Expected: FAIL — `items[0].broker` is `undefined`, not `"BTG Pactual"` / not strictly `null`.

- [ ] **Step 3: Implement — add the parameter and set the field**

In `src/lib/dataIngestion/brokerNoteImport.ts`, add the import and the parameter:

```typescript
import { KNOWN_BROKER_LABELS, type SupportedBroker } from "@/lib/brokers";
```

Change the function signature:

```typescript
export function consolidateTradesToWatchlistItems(
  trades: { ticker: string; quantity: number; price: number; date: string }[],
  existingTransactions: Transaction[],
  newlyCreatedTransactions: Transaction[],
  assetDataMap: Record<string, any> = {},
  detectedBroker?: SupportedBroker | null,
): WatchlistItem[] {
```

And in the `itemsToImport.push({ ... })` object (the one ending `investingSince: ...` before `} as WatchlistItem);`), add:

```typescript
      broker: detectedBroker ? KNOWN_BROKER_LABELS[detectedBroker] : null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dataIngestion/__tests__/brokerNoteImport.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire the call site in `BrokerNoteImportPage.tsx`**

Find the call `const itemsToImport = consolidateTradesToWatchlistItems(validTrades, transactions, newlyCreatedTransactions, assetDataMap,);` (around line 257-262) and add the 5th argument using the component's existing `detectedBroker` state:

```typescript
      const itemsToImport = consolidateTradesToWatchlistItems(
        validTrades,
        transactions,
        newlyCreatedTransactions,
        assetDataMap,
        detectedBroker,
      );
```

- [ ] **Step 6: Run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dataIngestion/brokerNoteImport.ts src/lib/dataIngestion/__tests__/brokerNoteImport.test.ts src/components/portfolio/BrokerNoteImportPage.tsx
git commit -m "$(cat <<'EOF'
feat(portfolio): persist auto-detected broker on note import

parseBrokerNote already detects the broker layout; this wires that
detection into the WatchlistItem written on import instead of
discarding it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add manual broker entry to Add Asset

**Files:**
- Modify: `src/components/portfolio/AddAssetPage.tsx`
- Modify: `src/lib/i18n/dict.ptBR.ts`, `src/lib/i18n/dict.en.ts`, `src/lib/i18n/dict.es.ts` (new `portfolio.brokerLabel`/`portfolio.brokerPlaceholder` keys)
- Test: `src/components/portfolio/__tests__/AddAssetPage.test.tsx` (extend if it exists, else skip automated test for this task — see Step 5 note)

**Interfaces:**
- Consumes: `KNOWN_BROKER_LABELS` from `src/lib/brokers.ts` (Task 1); `WatchlistItem.broker` (Task 1).
- Produces: nothing new consumed by later tasks — this is a leaf UI change.

- [ ] **Step 1: Add i18n keys**

In `src/lib/i18n/dict.ptBR.ts`, add a new top-level `portfolio:` block. Find the closing `},` of the `dashboard:` block (search for `taxRegime: {` inside `dashboard:` and its closing `},` right before `admin: {`) and insert a new sibling block right after `dashboard: { ... },` and before `admin: {`:

```typescript
  portfolio: {
    brokerLabel: "Corretora",
    brokerPlaceholder: "Selecione ou digite a corretora",
    brokerOther: "Outra corretora",
  },
```

Repeat in `dict.en.ts` (in the same relative position, after its `dashboard: { ... },` block):

```typescript
  portfolio: {
    brokerLabel: "Broker",
    brokerPlaceholder: "Select or type the broker",
    brokerOther: "Other broker",
  },
```

And in `dict.es.ts`:

```typescript
  portfolio: {
    brokerLabel: "Corretora",
    brokerPlaceholder: "Selecciona o escribe la corretora",
    brokerOther: "Otra corretora",
  },
```

- [ ] **Step 2: Run typecheck to confirm the three dicts still match shape**

Run: `npx tsc --noEmit`
Expected: 0 errors (the dicts don't share a strict interface today, but a mismatched shape would surface wherever `t.portfolio.*` is used in Step 4 below if a dict were missing the key).

- [ ] **Step 3: Add broker state and the field to the form**

In `src/components/portfolio/AddAssetPage.tsx`, add local state near the other form state (`quantity`, `pricePerShare`, etc.):

```typescript
  const [broker, setBroker] = useState<string>("");
```

Initialize it from an existing item when editing (in the `useEffect` that sets `setWorkingItem(existingItem)`, around line 81):

```typescript
    if (existingItem) {
      setWorkingItem(existingItem);
      setBroker(existingItem.broker ?? "");
      return;
    }
```

Add the field to the JSX, near the quantity/price inputs (find the `<Label htmlFor=` block for quantity and add a sibling block right before or after it):

```typescript
          <div className="space-y-2">
            <Label htmlFor="add-asset-broker" className="text-xs font-semibold text-foreground">
              {t.portfolio.brokerLabel}
            </Label>
            <Input
              id="add-asset-broker"
              list="known-brokers"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder={t.portfolio.brokerPlaceholder}
              className="h-11 sm:h-9"
            />
            <datalist id="known-brokers">
              {Object.values(KNOWN_BROKER_LABELS).map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </div>
```

Add the two new imports at the top of the file:

```typescript
import { Input } from "@/components/ui/input";
import { KNOWN_BROKER_LABELS } from "@/lib/brokers";
```

(Skip the `Input` import if the file already imports it — check first with a quick read of the existing import block.)

- [ ] **Step 4: Persist `broker` on save**

In `handleSubmit`, change the `upsertWatchlistItem` call (line 258) to include the field:

```typescript
      upsertWatchlistItem({
        ...workingItem,
        quantity: finalQty,
        averagePrice: finalAvg,
        broker: broker.trim() || null,
      });
```

- [ ] **Step 5: Manual verification (no existing automated test file for this page)**

Run: `npx tsc --noEmit`
Expected: 0 errors. This page has no existing `__tests__` file as of this plan — adding full test coverage for the whole Add Asset flow is out of scope for this task (it would require mocking `useWatchlist`, `useTransactions`, `assetQueryOptions`, `quoteQueryOptions` — a pre-existing gap, not one this plan introduces). Verify manually in the dev server: open `/app/add-asset`, pick a ticker, confirm the "Corretora" field appears with a datalist of known brokers, type a custom value, save, and confirm the saved `WatchlistItem` in Firestore/local storage has `broker` set.

- [ ] **Step 6: Commit**

```bash
git add src/components/portfolio/AddAssetPage.tsx src/lib/i18n/dict.ptBR.ts src/lib/i18n/dict.en.ts src/lib/i18n/dict.es.ts
git commit -m "$(cat <<'EOF'
feat(portfolio): add manual broker entry to Add Asset page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add broker backfill to position edit (Metas & Premissas)

**Files:**
- Modify: `src/components/ceiling/watchlist/EditPositionFields.tsx`
- Test: `src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx` (already exists per the repo listing — extend it)

**Interfaces:**
- Consumes: `KNOWN_BROKER_LABELS` from `src/lib/brokers.ts` (Task 1); `WatchlistItem.broker` (Task 1); `t.portfolio.brokerLabel`/`brokerPlaceholder` (Task 3).
- Produces: nothing new consumed by later tasks — leaf UI change.

- [ ] **Step 1: Read the existing test file to match its mocking pattern**

Open `src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx` to see how `useWatchlist`/`updateAsync` are mocked before writing the new test — match that exact pattern rather than introducing a second one.

- [ ] **Step 2: Write the failing test**

Add this test to the existing file (adapt the mock setup already present in the file for `useWatchlist`'s `updateAsync`):

```typescript
  it("saves the broker field via updateAsync", async () => {
    const item = {
      id: "STOCK_BR:BBAS3",
      ticker: "BBAS3",
      currency: "BRL",
      targetYield: 6,
      targetMonthlyIncome: null,
      broker: null,
    } as any;

    render(<EditPositionFields item={item} />);

    const brokerInput = screen.getByLabelText(/corretora/i);
    fireEvent.change(brokerInput, { target: { value: "BTG Pactual" } });

    const saveButton = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalledWith(
        item.id,
        expect.objectContaining({ broker: "BTG Pactual" }),
      );
    });
  });
```

(Use whatever the file's existing mock function for `updateAsync` is actually named — inspect Step 1's output and substitute `mockUpdateAsync` for the real identifier.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx`
Expected: FAIL — no element matches label `/corretora/i` yet.

- [ ] **Step 4: Implement the field**

In `src/components/ceiling/watchlist/EditPositionFields.tsx`, add state and import:

```typescript
import { KNOWN_BROKER_LABELS } from "@/lib/brokers";
```

```typescript
  const [broker, setBroker] = useState("");
```

Update the initializing `useEffect` (currently sets `dy`/`goal`) to also seed `broker`:

```typescript
  useEffect(() => {
    setDy(item.targetYield != null ? String(item.targetYield) : "6");
    setGoal(item.targetMonthlyIncome != null ? String(item.targetMonthlyIncome) : "");
    setBroker(item.broker ?? "");
    setIsSaving(false);
  }, [item.id, item.targetYield, item.targetMonthlyIncome, item.broker]);
```

Add `broker` to the save patch in `handleSave`:

```typescript
      const patch: Partial<WatchlistItem> = {};
      if (y != null && Number.isFinite(y) && y > 0) {
        patch.targetYield = y;
      }
      if (g != null && Number.isFinite(g) && g > 0) {
        patch.targetMonthlyIncome = g;
      } else if (goal.trim() === "") {
        patch.targetMonthlyIncome = null;
      }
      patch.broker = broker.trim() || null;
```

Add the field to the JSX, inside the existing `grid grid-cols-1 sm:grid-cols-2 gap-4` block, as a third field (the grid will wrap it to a new row on `sm:grid-cols-2`):

```typescript
        <div className="space-y-2">
          <Label htmlFor="wl-edit-broker" className="text-xs font-semibold text-foreground">
            {t.portfolio.brokerLabel}
          </Label>
          <input
            id="wl-edit-broker"
            list="wl-edit-known-brokers"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            placeholder={t.portfolio.brokerPlaceholder}
            className="h-11 sm:h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold"
          />
          <datalist id="wl-edit-known-brokers">
            {Object.values(KNOWN_BROKER_LABELS).map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
        </div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 6: Run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/ceiling/watchlist/EditPositionFields.tsx src/components/ceiling/watchlist/__tests__/EditPositionFields.test.tsx
git commit -m "$(cat <<'EOF'
feat(portfolio): allow backfilling broker on existing positions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `PortfolioSummaryHeader` component (extracted patrimônio/alocação header)

**Files:**
- Create: `src/components/portfolio/PortfolioSummaryHeader.tsx`
- Test: `src/components/portfolio/__tests__/PortfolioSummaryHeader.test.tsx`

**Interfaces:**
- Consumes: `AllocationChart` from `@/components/ceiling/watchlist/AllocationChart` (props: `items: WatchlistItem[]`); `ValuedWatchlistItem` from `@/lib/useValuedPortfolio`; `t.watchlist.consolidatedNetWorth`, `t.watchlist.consolidatedNetWorthSub`, `t.watchlist.consolidatedIncome`, `t.watchlist.consolidatedIncomeSub` (already exist, verified in dict.ptBR.ts lines 536-538).
- Produces: `PortfolioSummaryHeader({ valuedItems, totals, currency, isLoading }): JSX.Element` — consumed by Task 9 (`myportfolio.tsx`).

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/portfolio/__tests__/PortfolioSummaryHeader.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioSummaryHeader } from "../PortfolioSummaryHeader";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/components/ceiling/watchlist/AllocationChart", () => ({
  AllocationChart: () => <div data-testid="allocation-chart" />,
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      watchlist: {
        consolidatedNetWorth: "Patrimônio Consolidado",
        consolidatedNetWorthSub: "Patrimônio Total",
        consolidatedIncome: "Renda Passiva Projetada",
        consolidatedIncomeSub: "Renda Anual Total",
      },
    },
  }),
}));

const mockItems: ValuedWatchlistItem[] = [];

describe("PortfolioSummaryHeader", () => {
  it("renders the allocation chart and both hero cards with formatted values", () => {
    render(
      <PortfolioSummaryHeader
        valuedItems={mockItems}
        totals={{ consolidatedNetWorth: 872405.05, consolidatedIncome: 34605.4 }}
        currency="BRL"
        isLoading={false}
      />,
    );

    expect(screen.getByTestId("allocation-chart")).toBeInTheDocument();
    expect(screen.getByText("Patrimônio Consolidado")).toBeInTheDocument();
    expect(screen.getByText("Renda Passiva Projetada")).toBeInTheDocument();
    expect(screen.getByText(/872\.405,05/)).toBeInTheDocument();
  });

  it("shows skeletons instead of values while loading", () => {
    render(
      <PortfolioSummaryHeader
        valuedItems={mockItems}
        totals={{ consolidatedNetWorth: 0, consolidatedIncome: 0 }}
        currency="BRL"
        isLoading={true}
      />,
    );
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/portfolio/__tests__/PortfolioSummaryHeader.test.tsx`
Expected: FAIL with "Cannot find module '../PortfolioSummaryHeader'"

- [ ] **Step 3: Implement the component**

```typescript
// src/components/portfolio/PortfolioSummaryHeader.tsx
import { Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationChart } from "@/components/ceiling/watchlist/AllocationChart";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

interface PortfolioSummaryHeaderProps {
  valuedItems: ValuedWatchlistItem[];
  totals: { consolidatedNetWorth: number; consolidatedIncome: number };
  currency: Currency;
  isLoading: boolean;
}

export function PortfolioSummaryHeader({
  valuedItems,
  totals,
  currency,
  isLoading,
}: PortfolioSummaryHeaderProps) {
  const { locale, t } = useI18n();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AllocationChart items={valuedItems} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col rounded-xl border border-primary/30 bg-background p-4 lg:p-6">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t.watchlist.consolidatedNetWorth}
          </span>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <div className="flex items-center gap-2 text-4xl lg:text-5xl font-bold tabular-nums">
              <Globe className="h-8 w-8 text-primary" />
              <span className="bg-gradient-to-r from-white via-primary to-cyan-500 bg-clip-text text-transparent">
                {formatCurrency(totals.consolidatedNetWorth, currency, locale)}
              </span>
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground/80">
            {t.watchlist.consolidatedNetWorthSub}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-primary/20 bg-background py-4 px-4 lg:px-6">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t.watchlist.consolidatedIncome}
          </span>
          {isLoading ? (
            <Skeleton className="h-7 w-36" />
          ) : (
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Globe className="h-5 w-5 text-primary" />
              {formatCurrency(totals.consolidatedIncome, currency, locale)}
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground/80">
            {t.watchlist.consolidatedIncomeSub}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/portfolio/__tests__/PortfolioSummaryHeader.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/portfolio/PortfolioSummaryHeader.tsx src/components/portfolio/__tests__/PortfolioSummaryHeader.test.tsx
git commit -m "$(cat <<'EOF'
feat(portfolio): add PortfolioSummaryHeader (allocation + net worth/income)

Extracted from WatchlistKpiSection — keeps only the 2 blocks the user
asked to preserve from the old /myportfolio page, dropping the
USD/BRL breakdown and top/worst performer cards that don't belong to
the new Portfólio Global layout.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `BrokerCustodyCards` component

**Files:**
- Create: `src/components/portfolio/BrokerCustodyCards.tsx`
- Modify: `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (add `portfolio.custodyEyebrow`, `portfolio.custodyTitle`, `portfolio.unassignedBroker` keys, in the same `portfolio:` block created in Task 3)
- Test: `src/components/portfolio/__tests__/BrokerCustodyCards.test.tsx`

**Interfaces:**
- Consumes: `ValuedWatchlistItem` from `@/lib/useValuedPortfolio`; `getPositionValue` from `@/lib/calculations`; `formatCurrency` from `@/lib/formatters`.
- Produces: `BrokerCustodyCards({ valuedItems, currency, macroRates, isLoading }): JSX.Element` — consumed by Task 9.

- [ ] **Step 1: Add i18n keys**

Add to the `portfolio:` block in all three dicts (created in Task 3 Step 1):

ptBR:
```typescript
    custodyEyebrow: "Custódia por Corretora",
    custodyTitle: "Onde seus ativos estão guardados",
    unassignedBroker: "Não informado",
```

en:
```typescript
    custodyEyebrow: "Custody by Broker",
    custodyTitle: "Where your assets are held",
    unassignedBroker: "Not set",
```

es:
```typescript
    custodyEyebrow: "Custodia por Corretora",
    custodyTitle: "Dónde están tus activos",
    unassignedBroker: "No informado",
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/components/portfolio/__tests__/BrokerCustodyCards.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrokerCustodyCards } from "../BrokerCustodyCards";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      portfolio: {
        custodyEyebrow: "Custódia por Corretora",
        custodyTitle: "Onde seus ativos estão guardados",
        unassignedBroker: "Não informado",
      },
    },
  }),
}));

function makeItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 26.94,
    quantity: 1200,
    averagePrice: 26.94,
    annualDividend: 2,
    targetYield: 6,
    ceilingPrice: 30,
    safetyMargin: 10,
    paymentMonths: [],
    payoutRatio: null,
    addedAt: 0,
    investingSince: 0,
    livePrice: 26.94,
    sector: "",
    isClosedPosition: false,
    isBffMode: true,
    valuation: {} as any,
    broker: null,
    ...overrides,
  } as ValuedWatchlistItem;
}

describe("BrokerCustodyCards", () => {
  it("groups positions by broker and buckets unassigned ones", () => {
    const items = [
      makeItem({ id: "1", ticker: "BBAS3", broker: "BTG Pactual" }),
      makeItem({ id: "2", ticker: "HGLG11", broker: "BTG Pactual" }),
      makeItem({ id: "3", ticker: "AAPL", broker: null }),
    ];

    render(<BrokerCustodyCards valuedItems={items} currency="BRL" isLoading={false} />);

    expect(screen.getByText("BTG Pactual")).toBeInTheDocument();
    expect(screen.getByText("Não informado")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/portfolio/__tests__/BrokerCustodyCards.test.tsx`
Expected: FAIL with "Cannot find module '../BrokerCustodyCards'"

- [ ] **Step 4: Implement the component**

```typescript
// src/components/portfolio/BrokerCustodyCards.tsx
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPositionValue } from "@/lib/calculations";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

interface BrokerCustodyCardsProps {
  valuedItems: ValuedWatchlistItem[];
  currency: Currency;
  macroRates?: { cdi: number; ipca: number };
  isLoading: boolean;
}

export function BrokerCustodyCards({
  valuedItems,
  currency,
  macroRates,
  isLoading,
}: BrokerCustodyCardsProps) {
  const { locale, t } = useI18n();

  const groups = useMemo(() => {
    const byBroker = new Map<string, number>();
    for (const item of valuedItems) {
      if (item.isClosedPosition) continue;
      const key = item.broker?.trim() || t.portfolio.unassignedBroker;
      const value = getPositionValue(item, macroRates);
      byBroker.set(key, (byBroker.get(key) ?? 0) + value);
    }
    return Array.from(byBroker.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [valuedItems, macroRates, t.portfolio.unassignedBroker]);

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-4">
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.portfolio.custodyEyebrow}
        </div>
        <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
          {t.portfolio.custodyTitle}
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {groups.map(([broker, value]) => (
            <div key={broker} className="rounded-lg border border-border p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{broker}</div>
              <div className="mt-1 font-serif text-lg font-semibold text-foreground">
                {formatCurrency(value, currency, locale)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/portfolio/__tests__/BrokerCustodyCards.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/components/portfolio/BrokerCustodyCards.tsx src/components/portfolio/__tests__/BrokerCustodyCards.test.tsx src/lib/i18n/dict.ptBR.ts src/lib/i18n/dict.en.ts src/lib/i18n/dict.es.ts
git commit -m "$(cat <<'EOF'
feat(portfolio): add BrokerCustodyCards grouping positions by broker

Positions without a broker set are bucketed under "Não informado" so
the sum of cards always matches total net worth (UX designer's
requirement — omitting them silently would make the totals mismatch).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `PortfolioPositionsTable` component

**Files:**
- Create: `src/components/portfolio/PortfolioPositionsTable.tsx`
- Modify: `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (add `portfolio.columnAsset`, `columnBroker`, `columnQty`, `columnAvgPrice`, `columnPrice`, `columnTotal`, `columnPnl`, `columnYoc`, `columnStatus` keys to the `portfolio:` block)
- Test: `src/components/portfolio/__tests__/PortfolioPositionsTable.test.tsx`

**Interfaces:**
- Consumes: `ValuedWatchlistItem`; `computeRecommendedAction`/`RecommendedActionKey` from `@/lib/selectors/recommendedAction` (already built for the Dashboard, reused as-is); `getPositionValue`, `netAfterTax` from `@/lib/calculations`; `formatCurrency`/`formatPercent` from `@/lib/formatters`; `STICKY_FIRST_COLUMN_CLASS` from `@/components/ui/responsive-table`; `Table`/`TableHeader`/`TableRow`/`TableHead`/`TableBody`/`TableCell` from `@/components/ui/table`; `Badge` from `@/components/ui/badge`.
- Produces: `PortfolioPositionsTable({ valuedItems, onSelectItem, isLoading }): JSX.Element` — consumed by Task 9. `onSelectItem: (item: ValuedWatchlistItem) => void`.

- [ ] **Step 1: Add i18n keys**

ptBR (inside `portfolio:` block):
```typescript
    columnAsset: "Ativo",
    columnBroker: "Corretora",
    columnQty: "Qtd.",
    columnAvgPrice: "Preço Médio",
    columnPrice: "Cotação Atual",
    columnTotal: "Total Atual",
    columnPnl: "Lucro / Prejuízo",
    columnYoc: "Yield on Cost",
    columnStatus: "Status vs Teto",
```

en:
```typescript
    columnAsset: "Asset",
    columnBroker: "Broker",
    columnQty: "Qty.",
    columnAvgPrice: "Avg. Price",
    columnPrice: "Current Price",
    columnTotal: "Current Total",
    columnPnl: "Profit / Loss",
    columnYoc: "Yield on Cost",
    columnStatus: "Ceiling Status",
```

es:
```typescript
    columnAsset: "Activo",
    columnBroker: "Corretora",
    columnQty: "Cant.",
    columnAvgPrice: "Precio Medio",
    columnPrice: "Cotización Actual",
    columnTotal: "Total Actual",
    columnPnl: "Ganancia / Pérdida",
    columnYoc: "Yield on Cost",
    columnStatus: "Estado vs Techo",
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/components/portfolio/__tests__/PortfolioPositionsTable.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortfolioPositionsTable } from "../PortfolioPositionsTable";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      portfolio: {
        columnAsset: "Ativo",
        columnBroker: "Corretora",
        columnQty: "Qtd.",
        columnAvgPrice: "Preço Médio",
        columnPrice: "Cotação Atual",
        columnTotal: "Total Atual",
        columnPnl: "Lucro / Prejuízo",
        columnYoc: "Yield on Cost",
        columnStatus: "Status vs Teto",
        emptyPositions: "Nenhuma posição ainda",
      },
      dashboard: {
        matrix: {
          actionBuy: "Comprar",
          actionWatch: "Observar",
          actionAvoid: "Esticado / Evitar",
          actionYieldTrap: "Alerta: Yield Trap",
          actionNoData: "Sem dados",
        },
      },
    },
  }),
}));

function makeItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 26.94,
    quantity: 1200,
    averagePrice: 26.94,
    annualDividend: 2,
    targetYield: 6,
    ceilingPrice: 30,
    safetyMargin: 10,
    paymentMonths: [],
    payoutRatio: null,
    customTaxRate: null,
    addedAt: 0,
    investingSince: 0,
    livePrice: 26.94,
    sector: "",
    isClosedPosition: false,
    isBffMode: true,
    broker: "BTG Pactual",
    valuation: { margin: 12, activeCeiling: 30, dividendYield: 7.5, isUnavailable: false, yieldTrapWarning: false } as any,
    ...overrides,
  } as ValuedWatchlistItem;
}

describe("PortfolioPositionsTable", () => {
  it("renders a row per position and calls onSelectItem on row click", () => {
    const item = makeItem({});
    const onSelectItem = vi.fn();

    render(<PortfolioPositionsTable valuedItems={[item]} onSelectItem={onSelectItem} isLoading={false} />);

    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("BTG Pactual")).toBeInTheDocument();

    fireEvent.click(screen.getByText("BBAS3"));
    expect(onSelectItem).toHaveBeenCalledWith(item);
  });

  it("shows the empty state when there are no positions", () => {
    render(<PortfolioPositionsTable valuedItems={[]} onSelectItem={vi.fn()} isLoading={false} />);
    expect(screen.getByText("Nenhuma posição ainda")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/portfolio/__tests__/PortfolioPositionsTable.test.tsx`
Expected: FAIL with "Cannot find module '../PortfolioPositionsTable'"

- [ ] **Step 4: Implement the component**

```typescript
// src/components/portfolio/PortfolioPositionsTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { computeRecommendedAction, type RecommendedActionKey } from "@/lib/selectors/recommendedAction";
import { netAfterTax } from "@/lib/calculations";

const ACTION_BADGE_VARIANT: Record<RecommendedActionKey, "success" | "warning" | "destructive" | "outline"> = {
  buy: "success",
  watch: "warning",
  avoid: "destructive",
  yieldTrap: "destructive",
  noData: "outline",
};

interface PortfolioPositionsTableProps {
  valuedItems: ValuedWatchlistItem[];
  onSelectItem: (item: ValuedWatchlistItem) => void;
  isLoading: boolean;
}

export function PortfolioPositionsTable({ valuedItems, onSelectItem, isLoading }: PortfolioPositionsTableProps) {
  const { locale, t } = useI18n();

  const actionLabel: Record<RecommendedActionKey, string> = {
    buy: t.dashboard.matrix.actionBuy,
    watch: t.dashboard.matrix.actionWatch,
    avoid: t.dashboard.matrix.actionAvoid,
    yieldTrap: t.dashboard.matrix.actionYieldTrap,
    noData: t.dashboard.matrix.actionNoData,
  };

  const positions = valuedItems.filter((item) => !item.isClosedPosition);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (positions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.portfolio.emptyPositions}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className={STICKY_FIRST_COLUMN_CLASS}>{t.portfolio.columnAsset}</TableHead>
            <TableHead>{t.portfolio.columnBroker}</TableHead>
            <TableHead>{t.portfolio.columnQty}</TableHead>
            <TableHead>{t.portfolio.columnAvgPrice}</TableHead>
            <TableHead>{t.portfolio.columnPrice}</TableHead>
            <TableHead>{t.portfolio.columnTotal}</TableHead>
            <TableHead>{t.portfolio.columnPnl}</TableHead>
            <TableHead>{t.portfolio.columnYoc}</TableHead>
            <TableHead>{t.portfolio.columnStatus}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((item) => {
            const livePrice = item.livePrice ?? item.currentPrice ?? 0;
            const avgPrice = item.averagePrice ?? 0;
            const total = livePrice * item.quantity;
            const invested = avgPrice * item.quantity;
            const pnl = total - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            const netAnnualDividendPerShare = netAfterTax(
              item.annualDividend || 0,
              item.type,
              item.currency,
              item.customTaxRate,
            );
            const yoc = avgPrice > 0 ? (netAnnualDividendPerShare / avgPrice) * 100 : 0;
            const action = computeRecommendedAction(item);

            return (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => onSelectItem(item)}
              >
                <TableCell className={STICKY_FIRST_COLUMN_CLASS}>
                  <div className="font-semibold text-foreground">{item.ticker}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.broker || "—"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(avgPrice, item.currency, locale)}</TableCell>
                <TableCell>{formatCurrency(livePrice, item.currency, locale)}</TableCell>
                <TableCell>{formatCurrency(total, item.currency, locale)}</TableCell>
                <TableCell className={pnl >= 0 ? "text-success" : "text-destructive"}>
                  {formatCurrency(pnl, item.currency, locale)} ({formatPercent(pnlPct, locale, 1)})
                </TableCell>
                <TableCell>{formatPercent(yoc, locale, 2)}</TableCell>
                <TableCell>
                  <Badge variant={ACTION_BADGE_VARIANT[action]}>{actionLabel[action]}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Add the missing `emptyPositions` i18n key**

Add to the `portfolio:` block in all three dicts:

ptBR: `emptyPositions: "Nenhuma posição ainda",`
en: `emptyPositions: "No positions yet",`
es: `emptyPositions: "Ninguna posición todavía",`

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/portfolio/__tests__/PortfolioPositionsTable.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/portfolio/PortfolioPositionsTable.tsx src/components/portfolio/__tests__/PortfolioPositionsTable.test.tsx src/lib/i18n/dict.ptBR.ts src/lib/i18n/dict.en.ts src/lib/i18n/dict.es.ts
git commit -m "$(cat <<'EOF'
feat(portfolio): add PortfolioPositionsTable with sticky-column mobile layout

Reuses computeRecommendedAction (already built for the Dashboard) for
the Status vs Teto column instead of reimplementing the verdict logic.
Row click opens the position's detail sheet via onSelectItem.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `PortfolioEmptyState` component

**Files:**
- Create: `src/components/portfolio/PortfolioEmptyState.tsx`
- Modify: `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (add `portfolio.emptyStateTitle`, `emptyStateDesc`, `emptyStateAddAsset`, `emptyStateImportNote` keys)
- Test: `src/components/portfolio/__tests__/PortfolioEmptyState.test.tsx`

**Interfaces:**
- Consumes: `Link` from `@tanstack/react-router`; `Button` from `@/components/ui/button`.
- Produces: `PortfolioEmptyState(): JSX.Element` — consumed by Task 9.

- [ ] **Step 1: Add i18n keys**

ptBR:
```typescript
    emptyStateTitle: "Nenhuma posição ainda",
    emptyStateDesc: "Adicione um ativo manualmente ou importe sua nota de corretagem para começar.",
    emptyStateAddAsset: "Adicionar Ativo",
    emptyStateImportNote: "Importar Nota de Corretagem",
```

en:
```typescript
    emptyStateTitle: "No positions yet",
    emptyStateDesc: "Add an asset manually or import your broker note to get started.",
    emptyStateAddAsset: "Add Asset",
    emptyStateImportNote: "Import Broker Note",
```

es:
```typescript
    emptyStateTitle: "Ninguna posición todavía",
    emptyStateDesc: "Agrega un activo manualmente o importa tu nota de corretaje para empezar.",
    emptyStateAddAsset: "Agregar Activo",
    emptyStateImportNote: "Importar Nota de Corretaje",
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/components/portfolio/__tests__/PortfolioEmptyState.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioEmptyState } from "../PortfolioEmptyState";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: {
      portfolio: {
        emptyStateTitle: "Nenhuma posição ainda",
        emptyStateDesc: "Adicione um ativo manualmente ou importe sua nota de corretagem para começar.",
        emptyStateAddAsset: "Adicionar Ativo",
        emptyStateImportNote: "Importar Nota de Corretagem",
      },
    },
  }),
}));

describe("PortfolioEmptyState", () => {
  it("renders both CTA links", () => {
    render(<PortfolioEmptyState />);
    expect(screen.getByRole("link", { name: "Adicionar Ativo" })).toHaveAttribute("href", "/app/add-asset");
    expect(screen.getByRole("link", { name: "Importar Nota de Corretagem" })).toHaveAttribute(
      "href",
      "/app/import-broker-note",
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/portfolio/__tests__/PortfolioEmptyState.test.tsx`
Expected: FAIL with "Cannot find module '../PortfolioEmptyState'"

- [ ] **Step 4: Implement the component**

```typescript
// src/components/portfolio/PortfolioEmptyState.tsx
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";

export function PortfolioEmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h2 className="font-serif text-lg font-semibold text-foreground">{t.portfolio.emptyStateTitle}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t.portfolio.emptyStateDesc}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/app/add-asset">{t.portfolio.emptyStateAddAsset}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app/import-broker-note">{t.portfolio.emptyStateImportNote}</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/portfolio/__tests__/PortfolioEmptyState.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/components/portfolio/PortfolioEmptyState.tsx src/components/portfolio/__tests__/PortfolioEmptyState.test.tsx src/lib/i18n/dict.ptBR.ts src/lib/i18n/dict.en.ts src/lib/i18n/dict.es.ts
git commit -m "$(cat <<'EOF'
feat(portfolio): add PortfolioEmptyState with Add Asset / Import Note CTAs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Rewrite `/app/myportfolio` to orchestrate the new components

**Files:**
- Modify: `src/routes/app/myportfolio.tsx` (full rewrite)
- Test: `src/routes/app/__tests__/myportfolio.test.tsx` (new)

**Interfaces:**
- Consumes: `PortfolioSummaryHeader` (Task 5), `BrokerCustodyCards` (Task 6), `PortfolioPositionsTable` (Task 7), `PortfolioEmptyState` (Task 8), `AssetDetailSheet` (existing, unchanged, props `{ item, onClose }`), `useValuedPortfolio()` (existing, unchanged).

- [ ] **Step 1: Write the failing test**

```typescript
// src/routes/app/__tests__/myportfolio.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockValuedItems: any[] = [];
let mockIsAppLoading = false;

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    totals: { consolidatedNetWorth: 100000, consolidatedIncome: 5000 },
    isAppLoading: mockIsAppLoading,
    macroRates: undefined,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({ settings: { displayCurrency: "BRL" } }),
}));

vi.mock("@/components/portfolio/PortfolioSummaryHeader", () => ({
  PortfolioSummaryHeader: () => <div data-testid="summary-header" />,
}));
vi.mock("@/components/portfolio/BrokerCustodyCards", () => ({
  BrokerCustodyCards: () => <div data-testid="custody-cards" />,
}));
vi.mock("@/components/portfolio/PortfolioPositionsTable", () => ({
  PortfolioPositionsTable: ({ onSelectItem }: any) => (
    <button onClick={() => onSelectItem({ id: "x", ticker: "X" })}>open-detail</button>
  ),
}));
vi.mock("@/components/portfolio/PortfolioEmptyState", () => ({
  PortfolioEmptyState: () => <div data-testid="empty-state" />,
}));
vi.mock("@/components/ceiling/watchlist/AssetDetailSheet", () => ({
  AssetDetailSheet: ({ item }: any) => (item ? <div data-testid="detail-sheet">{item.ticker}</div> : null),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
}));

import { Route } from "../myportfolio";

describe("/app/myportfolio", () => {
  it("renders the summary header, custody cards, and positions table when there are positions", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push({ id: "1", ticker: "BBAS3", isClosedPosition: false });
    const MyPortfolio = Route.component;
    render(<MyPortfolio />);

    expect(screen.getByTestId("summary-header")).toBeInTheDocument();
    expect(screen.getByTestId("custody-cards")).toBeInTheDocument();
    expect(screen.getByText("open-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("opens the AssetDetailSheet when a row is selected", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push({ id: "1", ticker: "BBAS3", isClosedPosition: false });
    const MyPortfolio = Route.component;
    render(<MyPortfolio />);

    screen.getByText("open-detail").click();
    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("X");
  });

  it("renders the empty state when there are no positions", () => {
    mockValuedItems.length = 0;
    const MyPortfolio = Route.component;
    render(<MyPortfolio />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/app/__tests__/myportfolio.test.tsx`
Expected: FAIL — current `myportfolio.tsx` doesn't export the shape this test expects (no `PortfolioSummaryHeader` etc. rendered).

- [ ] **Step 3: Implement the rewrite**

```typescript
// src/routes/app/myportfolio.tsx
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { PortfolioSummaryHeader } from "@/components/portfolio/PortfolioSummaryHeader";
import { BrokerCustodyCards } from "@/components/portfolio/BrokerCustodyCards";
import { PortfolioPositionsTable } from "@/components/portfolio/PortfolioPositionsTable";
import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { AssetDetailSheet } from "@/components/ceiling/watchlist/AssetDetailSheet";

export const Route = createFileRoute("/app/myportfolio")({
  component: MyPortfolio,
});

/**
 * Portfólio Global — reescrita baseada na seção "VIEW 2: PORTFÓLIO GLOBAL" do protótipo
 * aprovado (ver docs/superpowers/specs/2026-09-04-portfolio-global-redesign-design.md).
 * Substitui o antigo Watchlist.tsx (grid/tabela + dialogs inline de add/edit/CSV) por uma
 * página read-only; editar uma posição existente continua possível via clique na linha,
 * que abre o mesmo AssetDetailSheet de sempre.
 */
function MyPortfolio() {
  const { valuedItems, totals, isAppLoading, macroRates } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const [selectedItem, setSelectedItem] = useState<ValuedWatchlistItem | null>(null);

  const activePositions = valuedItems.filter((item) => !item.isClosedPosition);
  const hasPositions = activePositions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PortfolioSummaryHeader
        valuedItems={valuedItems}
        totals={totals}
        currency={settings.displayCurrency}
        isLoading={isAppLoading}
      />

      {!isAppLoading && !hasPositions ? (
        <PortfolioEmptyState />
      ) : (
        <>
          <BrokerCustodyCards
            valuedItems={valuedItems}
            currency={settings.displayCurrency}
            macroRates={macroRates}
            isLoading={isAppLoading}
          />

          <PortfolioPositionsTable
            valuedItems={valuedItems}
            onSelectItem={setSelectedItem}
            isLoading={isAppLoading}
          />
        </>
      )}

      <AssetDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routes/app/__tests__/myportfolio.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/app/myportfolio.tsx src/routes/app/__tests__/myportfolio.test.tsx
git commit -m "$(cat <<'EOF'
feat(portfolio): rewrite /app/myportfolio as the new Portfólio Global page

Orchestrates PortfolioSummaryHeader, BrokerCustodyCards,
PortfolioPositionsTable, and PortfolioEmptyState. Row click on the
positions table still opens AssetDetailSheet for editing — no
management capability is lost, only the entry point moved from a grid
card to a table row.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Remove dead code (`Watchlist.tsx` and its exclusive subcomponents)

**Files:**
- Delete: `src/components/ceiling/Watchlist.tsx`
- Delete (conditionally — see Step 1): any file under `src/components/ceiling/watchlist/` that becomes unreferenced once `Watchlist.tsx` is gone.

**Interfaces:** None — this task only removes code, it produces nothing new.

- [ ] **Step 1: Confirm `Watchlist.tsx` has no remaining importers**

Run: `grep -rn "ceiling/Watchlist\"" src --include="*.tsx" --include="*.ts"`
Expected: no matches (Task 9 already removed the only import, in the old `myportfolio.tsx`).

- [ ] **Step 2: List every file `Watchlist.tsx` itself imports from `./watchlist/`**

Run: `grep -n "from \"./watchlist/" src/components/ceiling/Watchlist.tsx`
This produces the candidate list: `AddAssetDropdown`, `WatchlistToolbar`, `WatchlistAssetGrid`, `WatchlistDialogs`, `DataManagement`, `WatchlistActionsContext` (from the imports read during planning) — plus whatever else the grep shows.

- [ ] **Step 3: For each candidate file, confirm it has no OTHER importer before deleting**

Run this once per candidate (example for `WatchlistAssetGrid`):

```bash
grep -rln "WatchlistAssetGrid" src --include="*.tsx" --include="*.ts" | grep -v "__tests__"
```

If the only match is `Watchlist.tsx` itself (and its own test file), it's safe to delete both the component and its test. If any OTHER file imports it (e.g. `AssetCardHeader` tests reference `assetCard/` helpers that might be shared — check carefully), **do not delete it** — leave it in place and note it in the commit message as "kept, still referenced by X".

- [ ] **Step 4: Delete `Watchlist.tsx` and every confirmed-orphaned file from Step 3**

Use `git rm` for each confirmed file, e.g.:

```bash
git rm src/components/ceiling/Watchlist.tsx
git rm src/components/ceiling/watchlist/AddAssetDropdown.tsx
git rm src/components/ceiling/watchlist/WatchlistToolbar.tsx
git rm src/components/ceiling/watchlist/WatchlistAssetGrid.tsx
git rm src/components/ceiling/watchlist/WatchlistDialogs.tsx
git rm src/components/ceiling/watchlist/DataManagement.tsx
git rm src/components/ceiling/watchlist/WatchlistActionsContext.tsx
# and any matching __tests__ files for the above
```

(Adjust this exact list based on what Steps 2-3 actually found — this plan cannot enumerate the final list without running those greps live, since the file may import more or fewer helpers than seen during the design spike.)

- [ ] **Step 5: Run the full suite + build to confirm nothing broke**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 0 type errors, all tests pass, build succeeds. If `tsc` reports an unresolved import, that file was deleted incorrectly — restore it with `git checkout -- <path>` and re-check Step 3 for that file (something else was importing it after all).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(portfolio): remove Watchlist.tsx and its exclusive subcomponents

Watchlist.tsx is no longer imported anywhere after myportfolio.tsx's
rewrite (Task 9). Every subcomponent deleted here was confirmed to
have no other importer before removal (AGENTS.md Rule 3 — no dead
code left "just in case").

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Final verification gate (AGENTS.md Rule 8 — all 3 gates)

**Files:** None — verification only.

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: 0 failures.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Manual browser check**

Start the dev server and navigate to `/app/myportfolio`. Confirm:
- Patrimônio/alocação header renders at the top with real data.
- Custody cards show per-broker totals (or "Não informado" if no broker data exists yet for this user).
- Positions table renders, clicking a row opens the detail sheet.
- Adding a new asset via `/app/add-asset` shows the "Corretora" field.
- Importing a broker note via `/app/import-broker-note` results in positions with `broker` set to the detected institution.

- [ ] **Step 5: Report gate status**

Per AGENTS.md Rule 8, state explicitly in the final report: "`npx tsc --noEmit`: 0 erros. `npm run test` (vitest): 0 falhas. `npm run build`: sucesso." — all three, not just two.
