# RESULTADO — 95 — Componente compartilhado de tabela mobile (coluna fixa) — aplicado na Home

## 1. Correção de premissa — leia antes do resto

O prompt pedia para "extrair o padrão de tabela responsiva já correto do Radar de Risco". **Investigado e não é bem isso que existe lá:** `src/components/ceiling/RiskRadar.tsx` (linhas 164, 222) cabe em 375px sem overflow **não** porque implementa coluna fixa (`position: sticky`) — ela só tem **3 colunas** (Ativo, Peso, Status), então cabe naturalmente, sem precisar de scroll horizontal nem de mecanismo de coluna fixa. Não existe, portanto, um `position: sticky` para "extrair" literalmente de lá. O objetivo de fundo do prompt (ticker sempre visível durante o scroll) foi implementado como uma técnica nova — informada pelo padrão de UX correto que o Radar de Risco exemplifica pela ausência de scroll, mas não copiada de um código-fonte existente porque esse código não existe. Registrando isso explicitamente em vez de fingir uma extração que não ocorreu.

## 2. O que foi feito

1. Criado `src/components/ui/responsive-table.tsx`, exportando `STICKY_FIRST_COLUMN_CLASS = "sticky left-0 z-10 bg-card"` — um contrato de estilo compartilhado (não um componente de markup completo, ver Seção 3 sobre essa decisão), documentado com o motivo do `bg-card` explícito (evitar vazamento de conteúdo por trás de superfície glassmorphism/translúcida, Regra 6).
2. Aplicado em `src/components/horizonte/PortfolioTableV2.tsx`:
   - `SortableHeader` ganhou uma prop `sticky?: boolean`, usada só na coluna "Ativo".
   - `PortfolioRow`'s primeira `<td>` (ticker + nome) recebe a mesma classe.
3. **Não fixado**: a coluna "Variação" mostrando "—" em 100% das linhas — confirmado no Prompt 94 que é dado de mock ausente (`quotes[ticker]?.changePct` nulo), não o mesmo bug de zero-vira-indisponível. Não mexi nessa coluna, conforme instrução explícita do prompt.

## 3. Decisão de arquitetura — por que não um `<ResponsiveTable>` genérico completo

O prompt sugeria `src/components/ui/ResponsiveTable.tsx` como componente. Avaliei extrair a tabela inteira (markup + sort + render de linha) num componente genérico, mas **decidi não fazer isso nesta rodada**: `PortfolioTableV2.tsx` tem sort client-side bespoke (`SortKey`/`SortDirection` próprios, não reaproveita `useAssetFilterSort`, conforme já documentado no comentário de topo do próprio arquivo) e um layout de linha com colunas muito específicas (badge colorido por tipo, P&L com seta). Generalizar o markup completo agora arriscava exatamente o que o item (c) do prompt pede para evitar — regressão na tela de origem "para ganhar" a tela nova. Em vez disso, extraí **só o contrato de estilo** (a classe CSS + o motivo documentado), que é reutilizável sem forçar as duas tabelas a compartilhar estrutura de componente. Se no futuro uma 3ª tabela precisar do mesmo padrão, ainda pode importar `STICKY_FIRST_COLUMN_CLASS` diretamente.

## 4. Medição real em viewport 375px (evidência, não impressão)

Via `getBoundingClientRect()`/`getComputedStyle()` no navegador, com a massa de dados de dev (18 ativos):

**Antes de scrollar horizontalmente:**
```json
{ "viewportWidth": 375, "tableWidth": 782.17, "tdPosition": "sticky", "tdBackground": "oklch(0.217 0.017 79.3)", "leftBefore": 17 }
```

**Depois de `scrollLeft = 300` no container:**
```json
{ "leftAfterScroll300": 17, "scrollLeftActual": 300 }
```

A célula do ticker permanece em `left: 17` antes e depois do scroll de 300px — confirma que a coluna fica fixa enquanto o resto da linha rola por baixo. `tdBackground` resolvido para um valor opaco (token `bg-card`, não transparente) — sem vazamento de conteúdo por trás, conforme exigido no item (b).

**Regressão no Radar de Risco (tela de origem "referência de comportamento"):** medido de novo após a mudança — `352.7px`/`346.2px` de largura de tabela em 375px de viewport, `hasOverflow: false`, idêntico à medição da Auditoria UX original (`351px`). **Sem regressão.**

## 5. Outras tabelas candidatas (item 3 da Seção 2 do prompt) — não migradas nesta rodada

| Tela/Componente | Usa `<table>`/`<Table>`? | Candidata a `STICKY_FIRST_COLUMN_CLASS`? |
|---|---|---|
| Radar Global — `DividendRadar.tsx` | Sim (`<Table>` shadcn, 7 colunas: Ativo/Tipo/Setor/Preço/Teto/DY/Data Com) | **Sim** — mesma densidade de colunas que a Home tinha antes do fix; forte candidata |
| Minha Carteira — `Watchlist.tsx`/`AssetCard.tsx` | Não — layout de cards, não tabela | Não aplicável |
| Screener — `ResultStats.tsx` | Não — card único de resultado, não tabela | Não aplicável |
| Mesa de Decisão — `AssetComparator.tsx` | Não — comparação lado a lado em cards/colunas fixas, não `<table>` | Não aplicável |
| Histórico de Dividendos (dentro de `AssetDetailSheet`) — `DividendsHistoryPanel.tsx` | Sim (`<Table>` shadcn) | Candidata — não avaliada em profundidade nesta rodada |
| Painel Admin — `UsersTab.tsx`/`IngestionLogTab.tsx` (Prompt 88) | Sim (`<Table>` shadcn) | Não — já usam o padrão diferente "tabela desktop + cards empilhados mobile" (`hidden md:block`/`md:hidden`), correto para o contexto de admin, não precisa de coluna fixa |

Recomendo registrar `DividendRadar.tsx` e `DividendsHistoryPanel.tsx` como itens de `BACKLOG_V2.md` (Melhoria UX/Tech), não migrados automaticamente aqui.

## 6. Gates de Verificação Final — output literal

```
$ npx tsc --noEmit
src/components/horizonte/HorizonteHero.tsx(262,66): error TS2554: ...
src/components/layout/MobileBottomNav.tsx(18,61): error TS2339: ...
```
2 erros pré-existentes, não relacionados (arquivos não tocados nesta rodada).

```
$ npm run test
 Test Files  51 passed | 1 skipped (52)
      Tests  349 passed | 12 skipped (361)
```

```
$ npm run build
✓ built in 916ms
```

## 7. Governança de Roles (Regra 9)

Aplicado exatamente como o prompt definiu: `fuente-architecture-review`, `fuente-ux-designer`, `fuente-solution-architect`, `fuente-investidor-iniciante`, `fuente-product-manager`. Não aplicados: `fuente-investidor-profissional`, `fuente-advogado-lgpd-gdpr`, `fuente-business-architect`, `fuente-product-marketing`.

## 8. Entregável

Commit `feat(ui): extract ResponsiveTable with sticky column, apply to Home portfolio table [Auditoria UX 1.1/Padrão 3]`, push para `dev`.
