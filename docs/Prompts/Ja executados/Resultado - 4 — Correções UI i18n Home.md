# Resultado — Prompt 4: Correções UI i18n Home

**Data:** 2026-08-11
**Branch:** `dev`
**Prompt original:** `docs/Prompts/prompt_4_correcoes_ui_i18n_home.md`

---

## Resumo executivo

| Item | Descrição | Status |
|------|-----------|--------|
| 1 | `formatMonthsAsYearsMonths` i18n | ✅ Concluído |
| 2 | Investigar "R$ 0,00" no sidebar | ✅ Concluído (sem fix necessário — não reprodutível) |
| 3 | Aporte mensal no hero | ✅ Já implementado (prompt anterior) |
| 4 | "Horizonte FI" hardcoded → i18n | ✅ Concluído (3 ocorrências substituídas) |
| 5 | Tabs renomeadas + novo tab Home | ✅ Concluído |
| Gates | tsc, test, build, Playwright | ✅ Todos passaram |

**Código fonte da verificação:** `scratch/verify_sidebar_home.mjs`

---

## Item 1 — `formatMonthsAsYearsMonths` i18n

### O que foi feito

A função `formatMonthsAsYearsMonths` em `src/lib/formatters.ts` recebia `locale` como parâmetro mas **não o usava** — sempre formatava em português ("X anos e X meses"). Agora consulta os dicionários i18n corretamente.

### Alterações

**`src/lib/formatters.ts`**
- Adicionados imports diretos dos dicionários (`dict.en`, `dict.ptBR`, `dict.es`) — não via `./i18n` para evitar import circular (i18n.ts → formatters.ts → i18n.ts)
- Criado `MONTHS_COMMON: Record<Locale, typeof en.common>` como lookup table
- Corpo da função agora lê `common.year`, `common.years`, `common.month`, `common.months`, `common.durationSeparator`, `common.lessThanOneMonth` do lookup

**`src/lib/i18n/dict.en.ts`**
- Adicionadas 6 chaves em `common`: `year`, `years`, `month`, `months`, `lessThanOneMonth`, `durationSeparator`

**`src/lib/i18n/dict.ptBR.ts`**
- Mesmas 6 chaves: `year:"ano"`, `years:"anos"`, `month:"mês"`, `months:"meses"`, `lessThanOneMonth:"menos de 1 mês"`, `durationSeparator:"e"`

**`src/lib/i18n/dict.es.ts`**
- Mesmas 6 chaves: `year:"año"`, `years:"años"`, `month:"mes"`, `months:"meses"`, `lessThanOneMonth:"menos de 1 mes"`, `durationSeparator:"y"`

### Testes (`src/lib/__tests__/formatters.test.ts`)

Todos os chamados atualizados para passar locale. Novos cenários adicionados:

| Cenário | pt-BR | EN | ES |
|---------|-------|----|----|
| 26 meses | 2 anos e 2 meses | 2 years and 2 months | 2 años y 2 meses |
| 13 meses | 1 ano e 1 mês | 1 year and 1 month | 1 año y 1 mes |
| 24 meses | 2 anos | 2 years | 2 años |
| 6 meses | 6 meses | 6 months | 6 meses |
| 0.4 meses | menos de 1 mês | less than 1 month | menos de 1 mes |

---

## Item 2 — Investigar "R$ 0,00" no sidebar

### Investigação realizada

1. **Revisão de código** — Vasculhado `Sidebar.tsx`, `MobileBottomNav.tsx`, `Header.tsx` — nenhum elemento monetário no sidebar
2. **Git archaeology** — O `SummaryCard` isolado que existia antes do commit `389d8db` foi removido e movido para o hero. Não existe mais como componente standalone
3. **SSR HTML inspection** — Obtido HTML cru do servidor; `<aside>` contém apenas elementos de navegação (nav items, links, badges de lock). Zero "R$"
4. **Playwright headless** — Script `scratch/verify_sidebar_home.mjs` executado em 3 idiomas:
   - `en`: `found: false, count: 0` — text nodes com "R$" no aside: `(none)`
   - `ptBR`: `found: false, count: 0` — text nodes com "R$" no aside: `(none)`
   - `es`: `found: false, count: 0` — text nodes com "R$" no aside: `(none)`

### Conclusão

O elemento "R$ 0,00 sem label, sem contexto" descrito no prompt **não é reprodutível** no estado atual do código. Os cards "Patrimônio Total R$ 0,00" etc. existem no conteúdo principal (coluna direita), **não no sidebar**, e possuem labels claros ("PATRIMÔNIO TOTAL", "PROVENTOS RECEBIDOS (ANO)"). Provavelmente era um artefato de uma versão anterior.

### Ação tomada

Nenhuma correção de código necessária. Documentado com evidência.

---

## Item 3 — Aporte mensal no hero

### Status

Já implementado em prompt anterior (commit `389d8db` e `4ca916a`). O hero exibe "Aporte deste mês" no estado com ativos, com o valor vindo de `getMonthlyNetContribution`. Não houve alteração adicional neste prompt.

---

## Item 4 — "Horizonte FI" hardcoded → i18n

### O que foi feito

Substituídas todas as ocorrências user-visible de `"Horizonte FI"` hardcoded por `t.tabs.financialIndependence`, que renderiza "Financial Independence" (EN), "Independência Financeira" (PT-BR) o "Independencia Financiera" (ES).

### Arquivos alterados

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `src/components/horizonte/HorizonteHero.tsx` | 269 | `{/* vazio */}` → label existente | `{t.tabs.financialIndependence}` (empty state) |
| `src/components/horizonte/HorizonteHero.tsx` | 293 | `{/* vazio */}` → label existente | `{t.tabs.financialIndependence}` (header state) |
| `src/components/horizonte/PortfolioTableV2.tsx` | 99 | `HORIZONTE FI` | `{t.tabs.financialIndependence}` |

**Nota:** A linha 99 do `PortfolioTableV2.tsx` não estava no prompt original — foi encontrada como terceira ocorrência durante a varredura e substituída por consistência (mesmo componente na mesma página home).

---

## Item 5 — Tabs renomeadas + novo tab Home

### Alterações nos dicionários

**`tabs` renomeadas** (em todos os 3 dicts):

| Chave antiga | Chave nova | EN | PT-BR | ES |
|---|---|---|---|---|
| `calculator` | `screener` | Screener | Screener | Screener |
| — | `financialIndependence` (nova) | Financial Independence | Independência Financeira | Independencia Financiera |

`portfolio` permanece inalterada.

### Componentes alterados

**`src/components/layout/Sidebar.tsx`**
- Import `Compass` adicionado ao lucide-react
- Novo tab inserido como **primeiro item**: `{ key: "home", path: "/app/", label: t.tabs.financialIndependence, icon: Compass }`
- Referência `t.tabs.calculator` → `t.tabs.screener`

**`src/components/layout/MobileBottomNav.tsx`**
- Referência `t.tabs.calculator` → `t.tabs.screener`

---

## Gates de verificação

### `npx tsc --noEmit`
```
✔ Sem erros de tipo
Exit code: 0
```

### `npm run test`
```
✓ 237 passed | 4 skipped (37 test files, 1 skipped)
Duration: 18.59s
```

### `npm run build`
```
✓ built in 730ms
dist/index.html          0.63 kB │ gzip:  0.35 kB
dist/assets/index.css  113.29 kB │ gzip: 18.41 kB
dist/assets/index.js   831.80 kB │ gzip: 260.43 kB
Exit code: 0
```

### Playwright — DOM inspection
```
en:   'R$ 0,00' occurrences inside <aside>: 0 (found=false)
ptBR: 'R$ 0,00' occurrences inside <aside>: 0 (found=false)
es:   'R$ 0,00' occurrences inside <aside>: 0 (found=false)
```

### Screenshots (verificados visualmente)

| Locale | Sidebar | Hero | Cards | Portfolio Table |
|--------|---------|------|-------|-----------------|
| EN | ✅ Financial Independence, My Portfolio, Screener, … | ✅ Empty state com label i18n | ✅ Total Net Worth R$ 0,00 (com label) | ✅ Financial Independence no empty state |
| PT-BR | ✅ Independência Financeira, Minha Carteira, Screener, … | ✅ Empty state com label i18n | ✅ Patrimônio Total R$ 0,00 (com label) | ✅ Independência Financeira no empty state |

---

## Arquivos modificados (resumo)

```
src/lib/formatters.ts                          — imports de dict, MONTHS_COMMON, locale-aware
src/lib/i18n/dict.en.ts                        — +6 common keys, tabs renomeadas
src/lib/i18n/dict.ptBR.ts                      — +6 common keys, tabs renomeadas
src/lib/i18n/dict.es.ts                        — +6 common keys, tabs renomeadas
src/components/layout/Sidebar.tsx               — novo tab Home + Compass import + screener rename
src/components/layout/MobileBottomNav.tsx        — screener rename
src/components/horizonte/HorizonteHero.tsx       — 2x "Horizonte FI" → t.tabs.financialIndependence
src/components/horizonte/PortfolioTableV2.tsx    — 1x "HORIZONTE FI" → t.tabs.financialIndependence
src/lib/__tests__/formatters.test.ts            — locale param em todos os calls + 12 novos assertions
```
