# Plano de Implementação — Prompt 98 (Backlog da Auditoria UX)

Seguindo as diretrizes de `AGENTS.md` (Regras 1 a 9) e a governança das 9 skills, este plano cobre os 4 itens do Prompt 98 com seus respectivos pontos de atenção, decisões de arquitetura e gates de verificação.

---

## Item 1 (🔴 Prioridade Alta) — Tokens CSS Ausentes no Cash Flow Chart
- **Objetivo**: Corrigir a renderização das linhas de grade e projeções no `CashFlowChart.tsx`, definindo os tokens CSS `--chart-grid` e `--projected` que hoje estão ausentes em `src/styles.css`.
- **Arquivos a alterar**:
  - `src/styles.css`
- **Lógica e Escolha de Cores**:
  - No `:root` (light mode):
    - `--chart-grid: oklch(0.88 0.015 87);` (neutro discreto compatível com bordas)
    - `--projected: oklch(0.65 0.12 156.3);` (verde/teal suave para indicar estimativa)
  - No `.dark` (dark mode):
    - `--chart-grid: oklch(0.3 0.02 84);` (neutro escuro discreto)
    - `--projected: oklch(0.78 0.08 156.3);` (verde/teal suave para indicar estimativa)
  - No `@theme inline`:
    - `--color-chart-grid: var(--chart-grid);`
    - `--color-projected: var(--projected);`
- **Verificação**:
  - `npx tsc --noEmit`, `npm run test`, `npm run build`.
  - Inspecionar via DevTools em `/app/cashflow` confirmando que o elemento `<line>` da grade possui `stroke` computado válido (diferente de `"none"`).

---

## Item 2 (🟡) — CTA "Configurar Meta" com Link Funcional na Home
- **Objetivo**: Permitir que o usuário sem meta de gastos/renda configurada consiga clicar no texto e navegar diretamente para a configuração.
- **Arquivos a alterar**:
  - `src/components/horizonte/HorizonteHero.tsx`
- **Lógica**:
  - A meta mensal de gastos (`monthlyLivingCostGoal`) é configurada no `FIProgressCard`, localizado no topo da rota `/app/myportfolio` (Minha Carteira).
  - Envolver o texto `t.home.accumulatedConfigure` em um componente `<Link to="/app/myportfolio">` do TanStack Router.
  - Adicionar `className="underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer"` e `aria-label={t.home.ariaConfigureGoal.replace("{{capital}}", capitalLabel)}`.
- **Verificação**:
  - `npx tsc --noEmit`, `npm run test`, `npm run build`.
  - Teste manual: clicar no texto e validar a navegação para `/app/myportfolio`.

---

## Item 3 (🟠) — Export CSV Incompleto (Decisão de Produto Requerida)

> [!IMPORTANT]
> **Decisão necessária antes de codar:**
> O formato atual de 4 colunas (`Ticker, Type, Quantity, AveragePrice`) em `src/lib/csv.ts` (`buildWatchlistCsv`) é o mesmo consumido pelo importador (`useWatchlistCsvImport.ts`).
>
> Temos **2 opções** para avançar:
>
> 1. **Opção A (Manter Simetria / Bidirecional)**:
>    - Ampliar tanto `buildWatchlistCsv` quanto `useWatchlistCsvImport.ts` para suportar colunas extras de posição (`TargetYield`, `Sector`, `InvestingSince`, `TargetMonthlyIncome`).
>    - *Vantagem*: Permite o ciclo completo de "Exportar CSV da Carteira → Editar em Planilha → Reimportar".
>
> 2. **Opção B (Dois Exports Distintos / Relatório Completo)**:
>    - Manter `buildWatchlistCsv` com 4 colunas para import/export rápido.
>    - Criar uma nova função `buildWatchlistFullCsv` (e botão correspondente) que exporta uma visão analítica completa da carteira (Ticker, Nome, Tipo, Moeda, Preço Atual, Preço Médio, Quantidade, Preço Teto, Margem de Segurança, DY Anual, Dividendos Anuais, Setor, Meta Mensal, Data Início).
>    - *Vantagem*: Sem risco de quebrar o import de posições existente; oferece um relatório gerencial rico para o investidor.

---

## Item 4 (🟡) — Sticky Column em Mais 2 Tabelas
- **Objetivo**: Evitar a perda de visibilidade da primeira coluna em telas mobile (<=375px) durante o scroll horizontal.
- **Arquivos a alterar**:
  - `src/components/ceiling/DividendRadar.tsx` (Radar Global — 7 colunas)
  - `src/components/ceiling/watchlist/DividendsHistoryPanel.tsx` (Histórico de Dividendos no AssetDetailSheet)
- **Lógica**:
  - Aplicar `STICKY_FIRST_COLUMN_CLASS` (importado de `@/components/ui/responsive-table`) na primeira coluna (`TableHead` e primeira `TableCell`).
  - Garantir o background opaco do card para evitar vazamento visual no scroll.
- **Verificação**:
  - `npx tsc --noEmit`, `npm run test`, `npm run build`.
  - Medição de `left` e largura em viewport 375px antes e após scroll horizontal.

---

## Perguntas para o Usuário
1. Para o **Item 3 (Export CSV)**, você prefere a **Opção A** (simetria bidirecional com import atualizado) ou a **Opção B** (export analítico completo separado)?
2. Deseja que eu execute os Itens 1, 2 e 4 imediatamente enquanto você decide o Item 3?
