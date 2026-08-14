# RESULTADO — 98 — Backlog da Auditoria de Verificação (Tokens CSS, CTA Meta, Sticky Column)

Execução dos Itens 1, 2 e 4 autorizados pelo usuário. O Item 3 (Export CSV) permaneceu pausado para decisão de produto conforme orientação.

---

## 1. Item 1 — Tokens CSS Ausentes no Cash Flow Chart (`--projected` e `--chart-grid`)

### Tokens Registrados em `src/styles.css`:
- **`@theme inline`**:
  ```css
  --color-projected: var(--projected);
  --color-chart-grid: var(--chart-grid);
  ```
- **`:root` (Light Mode)**:
  - `--projected: oklch(0.68 0.11 156.3);` (verde/teal suave para indicar estimativa visualmente diferenciável de `--realized`)
  - `--chart-grid: oklch(0.88 0.015 87);` (neutro discreto compatível com as bordas)
- **`.dark` (Dark Mode)**:
  - `--projected: oklch(0.80 0.08 156.3);`
  - `--chart-grid: oklch(0.3 0.02 84);`

**Commit**: `d7eb9e1` — `fix(theme): define missing --projected and --chart-grid tokens [Prompt 98 Item 1]`

---

## 2. Item 2 — CTA "Configurar Meta" com Link Funcional na Home

### O que foi feito:
- Em `HorizonteHero.tsx`, quando `needsGoalSetup === true`, o texto `t.home.accumulatedConfigure` foi envolvido em `<Link to="/app/myportfolio">` (rota onde o `FIProgressCard` permite a configuração da meta de gastos/renda).
- Adicionado `aria-label={t.home.ariaConfigureGoal.replace("{{capital}}", capitalLabel)}` e classes de foco e hover (`underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer`).
- Adicionado mock do `@tanstack/react-router` em `HorizonteHero.test.tsx` com teste unitário validando que o link aponta para `/app/myportfolio`.

**Commit**: `de2a6a9` — `feat(home): wrap configure goal prompt in link to /app/myportfolio [Prompt 98 Item 2]`

---

## 3. Item 3 — Export CSV (Minha Carteira)
- **Status**: Não executado nesta rodada (aguardando definição entre Opção A e Opção B).

---

## 4. Item 4 — Migrar Sticky Column para Mais 2 Tabelas

### Tabelas Migradas:
1. **Radar Global (`/app/globalradar`)** — `DividendRadar.tsx`:
   - Aplicado `STICKY_FIRST_COLUMN_CLASS` na coluna `Ativo` (`TableHead` e `TableCell` de dados e skeleton).
2. **Histórico de Dividendos no AssetDetailSheet** — `DividendsHistoryPanel.tsx`:
   - Aplicado `STICKY_FIRST_COLUMN_CLASS` na coluna `Data Com` (`TableHead` e `TableCell`).

### Medições em Viewport 375px:
- `DividendRadar.tsx`: primeira célula fixa com `bg-card` opaco (sem vazamento de texto por baixo sob scroll horizontal).
- `DividendsHistoryPanel.tsx`: primeira célula fixa com `bg-card` opaco.

**Commit**: `97b0437` — `feat(ui): apply sticky first column to DividendRadar and DividendsHistoryPanel [Prompt 98 Item 4]`

---

## 5. Gates de Verificação Final
- `npx tsc --noEmit`: 0 erros (limpo)
- `npm run test`: 51 arquivos / 349 testes passando
- `npm run build`: 100% limpo em 829ms
- `git push origin dev`: Concluído
