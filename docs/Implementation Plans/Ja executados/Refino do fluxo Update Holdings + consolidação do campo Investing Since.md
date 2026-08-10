# Implementation Plan: Refino do fluxo "Update Holdings" + consolidação do campo Investing Since

Consolidate the duplicated "Investing Since" date picker implementations into a single, reusable `InvestingSinceField` component. When an asset has recorded transactions, the "Investing Since" field becomes **read-only** displaying the date of the first transaction with a contextual tooltip hint. When no transactions exist, it remains manually editable via Popover + Calendar. Additionally, refine the "Average Price" label and tooltip behavior in `EditItemDialog`, update i18n dictionaries across EN, PT-BR, and ES, update `PROMPTS_LOG.md` & `BACKLOG_V2.md`, and enforce strict AGENTS.md compliance.

## AGENTS.md Governance Confirmation (Rule 7)

> [!NOTE]
> **Explicit Confirmation**: `docs/AGENTS.md` has been read in full. All 7 rules (Reusability, Global i18n Enforcement, Data Isolation, Financial SSOT, Mobile-First, Premium Aesthetics, AGENTS.md Precedence) are understood and strictly enforced.
> **Conflict Check**: No conflicts exist between the user prompt/plan and `AGENTS.md`. All rules (especially Reusability, i18n without hardcode, and Mobile-First layout) are honored in this design.

## User Review Required

> [!IMPORTANT]
> **Read-only Investing Since Behavior**: Assets with existing transactions will no longer allow manual overrides of `investingSince` in `EditItemDialog` or `AssetDetailSheet`. The value automatically locks to the timestamp of the earliest transaction (`Math.min(...tickerTxs.map(tx => tx.date))`).
> 
> **Mobile-first Layout Guarantee (Rule 5)**: In read-only mode, `InvestingSinceField` renders with flex styling (`inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-border/50 bg-background/60 text-xs font-medium`) matching the exact height, line-height, and padding of the editable button trigger. This prevents layout shifting or vertical misalignment on mobile viewports.
> 
> **i18n String Preservation & Verification**:
> - `form.avgPrice` changes from `"Average price (optional)"` to `"Average price"` (EN), `"Preço médio (opcional)"` to `"Preço médio"` (PT-BR), and `"Precio medio (opcional)"` to `"Precio medio"` (ES), preserving existing Spanish terminology choice.
> - `transactions.add` changes to `"Add Transaction"` (EN) and `"Agregar Transacción"` (ES), maintaining `"Lançar Transação"` (PT-BR). Title of `TransactionForm.tsx` creation modal will be visually verified.

## Proposed Changes

### Shared Components

#### [NEW] [InvestingSinceField.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/shared/InvestingSinceField.tsx)
- Create shared component `InvestingSinceField` with props:
  ```ts
  interface InvestingSinceFieldProps {
    value: number | undefined;
    onChange: (date: Date) => void;
    firstTransactionDate: number | null;
    className?: string;
  }
  ```
- Logic & Styling:
  - If `firstTransactionDate != null`:
    - Renders static, non-clickable layout displaying formatted month/year (`mmm/yyyy`, e.g. `Fev/2026`) with `CalendarIcon` and an `InfoTooltip` with key `form.investingSinceReadOnlyHint`.
    - Styled with Tailwind classes to guarantee identical height/line-height/border alignment as the editable trigger button across mobile and desktop.
    - Ignores `value` and `onChange`.
  - If `firstTransactionDate == null`:
    - Renders editable `Popover` + `Calendar` (disabled for `date > new Date() || date < new Date("1990-01-01")`), triggering `onChange`.

---

### Watchlist & Holdings UI

#### [MODIFY] [EditItemDialog.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/EditItemDialog.tsx)
- Compute `firstTransactionDate`:
  `const firstTransactionDate = tickerTxs.length ? Math.min(...tickerTxs.map(tx => tx.date)) : null;`
- Replace legacy `Popover`/`Calendar` block with `<InvestingSinceField value={investingSince?.getTime()} onChange={setInvestingSince} firstTransactionDate={firstTransactionDate} />`.
- Update `onSave` logic to use `investingSince: firstTransactionDate ?? investingSince?.getTime() ?? item?.addedAt`.
- Replace fixed text `<p>` box for transactions count with an `InfoTooltip` placed right next to `<Label htmlFor="wl-edit-avg">{t.form.avgPrice}</Label>` when `hasTransactions` is `true`.

#### [MODIFY] [AssetDetailSheet.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/AssetDetailSheet.tsx)
- Inside `AssetHoldings`, fetch `transactions` from `useTransactions()` and compute `firstTransactionDate` using the exact canonical SSOT filter pattern used in `TransactionsPanel.tsx` and `EditItemDialog.tsx`:
  ```ts
  const { transactions } = useTransactions();
  const firstTransactionDate = useMemo(() => {
    const tickerTxs = transactions.filter(tx => tx.ticker === item.ticker);
    return tickerTxs.length ? Math.min(...tickerTxs.map(tx => tx.date)) : null;
  }, [transactions, item.ticker]);
  ```
- Replace legacy Popover/Calendar in `AssetHoldings` with `<InvestingSinceField ... />`.
- Ensure `update(item.id, { investingSince: ... })` is never called when `firstTransactionDate != null`.

---

### i18n Dictionaries

#### [MODIFY] [dict.en.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.en.ts)
#### [MODIFY] [dict.ptBR.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.ptBR.ts)
#### [MODIFY] [dict.es.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.es.ts)
- Update `form.avgPrice`:
  - EN: `"Average price"`
  - PT-BR: `"Preço médio"`
  - ES: `"Precio medio"`
- Add `form.investingSinceReadOnlyHint`:
  - EN: `"Date of first transaction"`
  - PT-BR: `"Data do primeiro lançamento"`
  - ES: `"Fecha de la primera transacción"`
- Update `transactions.add`:
  - EN: `"Add Transaction"`
  - PT-BR: `"Lançar Transação"` (keep as is)
  - ES: `"Agregar Transacción"`

---

### Documentation & Logs

#### [MODIFY] [PROMPTS_LOG.md](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/PROMPTS_LOG.md)
- Append prompt summary and prompt log details to the end of `docs/PROMPTS_LOG.md`.

#### [MODIFY] [BACKLOG_V2.md](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/BACKLOG_V2.md)
- Add task resolution entry under "Itens já resolvidos" section in `docs/BACKLOG_V2.md` to maintain SSOT for project backlog and architectural decisions.

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify unit test suite.
- Run `npm run build` (or `tsc --noEmit`) to verify TypeScript compilation and i18n contract completeness.

### Manual Verification

1. **Mobile Viewport & Alignment (Rule 5)**:
   - Inspect `AssetDetailSheet` → `My Position` tab and `EditItemDialog` on mobile resolution (375px - 414px width).
   - Confirm read-only `InvestingSinceField` aligns perfectly in height and line-spacing with adjacent elements without overflowing or breaking layout.
   - Confirm no JS exceptions or `isBargain is not defined` errors occur in `AssetHoldings` or `AssetDetailSheet`.

2. **Asset with Transactions**:
   - Open `EditItemDialog` for an asset with logged transactions (e.g. `VALE3`).
   - Check that "Investing Since" displays static `mmm/yyyy` date of 1st transaction with tooltip hint on hover (`form.investingSinceReadOnlyHint`).
   - Check that "Average price" has an `InfoTooltip` indicating "Calculated from X transactions" and no fixed `<p>` text below it.
   - Open `AssetDetailSheet` → `My Position` tab and check that "Investing Since" is static with tooltip.

3. **Asset without Transactions**:
   - Open `EditItemDialog` for an asset with zero transactions.
   - Check that "Investing Since" renders popover button with calendar picker.

4. **TransactionForm Title & Buttons**:
   - Click "Add Transaction" button in `TransactionsPanel.tsx` and verify dialog title renders `Add Transaction` (EN) / `Lançar Transação` (PT-BR) / `Agregar Transacción` (ES).
   - Check button text in `TransactionsPanel.tsx`.

5. **i18n Check**:
   - Confirm labels for `Average price` in EN (`Average price`), PT-BR (`Preço médio`), ES (`Precio medio`) without "(optional)".
