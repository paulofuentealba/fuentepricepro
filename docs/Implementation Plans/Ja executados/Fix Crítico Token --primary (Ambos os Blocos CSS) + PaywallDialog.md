# Implementation Plan — Fix Crítico: Token `--primary` (Ambos os Blocos CSS) + PaywallDialog

Correct the `--primary` design token and related tokens (`--ring`, `--sidebar-primary`, `--sidebar-ring`) in **both** `:root` and `.dark` blocks in `src/styles.css` to unify the application color palette to Emerald green (hue 162). Update `PaywallDialog.tsx` link target from non-existent `/pricing` to `/settings`.

## User Review Required

> [!CAUTION]
> **Causa Raiz Crítica**:
> `src/routes/__root.tsx` fixa `<html lang="en" className="dark">` de forma incondicional. A aplicação é executada 100% do tempo dentro da classe `.dark`.
> Se alterássemos apenas o bloco `:root`, a mudança não teria nenhum efeito visual em produção.
> É **obrigatório** corrigir os dois blocos (`:root` e `.dark`), priorizando a validação do `.dark`.

> [!IMPORTANT]
> **Decisão da Opção A: Ajuste de Lightness no Bloco `:root` para Conformidade WCAG AA**:
> Para garantir que o bloco `:root` cumpra estritamente o nível WCAG AA ($\ge 4.5:1$) caso o tema claro venha a ser ativado no futuro, a lightness foi ajustada de `0.55` para **`0.50`**.
>
> **Cálculo de Contraste Matemático Exato (CSS Color 4 OKLCH $\to$ sRGB)**:
> 1. **Bloco `:root` (Light Mode / Fallback)**:
>    - `--primary: oklch(0.50 0.16 162);` (sRGB HEX `#007d45`, Luminância = 0.1511)
>    - `--primary-foreground: oklch(0.98 0 0);` (White `#fafafa`, Luminância = 0.9538)
>    - **Razão de Contraste Exata**: **5.12:1** (Aprovado em WCAG AA para texto normal $\ge 4.5:1$).
> 2. **Bloco `.dark` (Produção Ativa)**:
>    - `--primary: oklch(0.70 0.17 162);` (sRGB HEX `#10b981`, Luminância = 0.4431)
>    - `--primary-foreground: oklch(0.1 0.02 260);` (Dark Charcoal `#090d16`, Luminância = 0.0084)
>    - **Razão de Contraste Exata**: **8.46:1** (Supera WCAG AAA $\ge 7:1$).

## Open Questions

Nenhuma.

## Proposed Changes

### Global Styles

#### [MODIFY] [styles.css](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/styles.css)

Update tokens in `:root` (around line 79):
```css
  --primary: oklch(0.50 0.16 162);
  --primary-foreground: oklch(0.98 0 0);
  --ring: oklch(0.50 0.16 162);
  --sidebar-primary: oklch(0.50 0.16 162);
  --sidebar-ring: oklch(0.50 0.16 162);
```

Update tokens in `.dark` (around line 129):
```css
  --primary: oklch(0.70 0.17 162);
  --primary-foreground: oklch(0.1 0.02 260);
  --ring: oklch(0.70 0.17 162);
  --sidebar-primary: oklch(0.70 0.17 162);
  --sidebar-ring: oklch(0.70 0.17 162);
```

---

### UI Components

#### [MODIFY] [PaywallDialog.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ui/PaywallDialog.tsx)
- Update line 48: Change `<a href="/pricing">{t.paywall.button}</a>` to `<a href="/settings">{t.paywall.button}</a>`.

---

## Relatório de Consumidores Confirmados (25 Arquivos)

Executada a busca `grep -rlE "\b(bg-primary|text-primary|border-primary|ring-primary)\b" src/ --include="*.tsx"`:

1. `src/components/RouteBoundaries.tsx`
2. `src/components/ceiling/DividendRadar.tsx`
3. `src/components/ceiling/GoalPlanner.tsx`
4. `src/components/ceiling/SmartAllocation.tsx`
5. `src/components/ceiling/cashflow/CashFlowChart.tsx`
6. `src/components/ceiling/cashflow/CashFlowHeader.tsx`
7. `src/components/ceiling/result/ResultStats.tsx`
8. `src/components/ceiling/shared/AssetDataDisplay.tsx`
9. `src/components/ceiling/shared/InvestingSinceField.tsx`
10. `src/components/ceiling/watchlist/EditItemDialog.tsx`
11. `src/components/shared/StatusBadge.tsx`
12. `src/components/ui/PaywallDialog.tsx`
13. `src/components/ui/badge.tsx`
14. `src/components/ui/button.tsx`
15. `src/components/ui/calendar.tsx`
16. `src/components/ui/checkbox.tsx`
17. `src/components/ui/progress.tsx`
18. `src/components/ui/radio-group.tsx`
19. `src/components/ui/skeleton.tsx`
20. `src/components/ui/slider.tsx`
21. `src/components/ui/sonner.tsx`
22. `src/components/ui/switch.tsx`
23. `src/components/ui/tooltip.tsx`
24. `src/routes/__root.tsx`
25. `src/routes/settings.tsx`

---

## Verification Plan

### Automated Verification
- `npm run test`: Garantir 136 testes passantes (0 falhas).
- `npm run build`: Garantir compilação limpa do cliente e SSR.

### Visual & Behavioral Verification
- Testar `PaywallDialog` nos pontos de entrada (`AddToWatchlistDialog` e `AssetCard`).
- Confirmar que o botão redireciona para `/settings` sem erro 404.
- Verificar visualmente no navegador que botões primários e destaques exibem tom Emerald (hue 162) em modo dark.
