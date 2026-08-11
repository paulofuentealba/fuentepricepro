# RESULTADO — A11Y 1: Contraste e navegação por teclado

Correção dos 2 achados reais da auditoria do prompt 54 (`RESULTADO - 54 — Horizonte FI QA Final e Paridade v1.md`).

## 1. Contraste `--h-ink-faint` sobre `--h-paper`

Arquivo: `src/styles/horizonte-tokens.css`

Fórmula usada: luminância relativa WCAG 2.x
`L = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin`, com `C_lin = ((C/255 + 0.055)/1.055)^2.4` para `C/255 > 0.03928`, e contraste `(L1+0.05)/(L2+0.05)` (L1 = mais claro).

### Antes

| Tema  | `--h-paper` | `--h-ink-faint` | Contraste medido |
|-------|-------------|------------------|-------------------|
| Claro | `#f7f4ec` (L=0.9056) | `#9c8f7a` | **2.88:1** |
| Escuro| `#15120c` (L=0.0062) | `#7a6e5c` | **3.75:1** |

Ambos abaixo do mínimo AA (4.5:1) para texto pequeno.

### Depois

| Tema  | `--h-paper` | `--h-ink-faint` (novo) | Contraste calculado |
|-------|-------------|--------------------------|-----------------------|
| Claro | `#f7f4ec` (L=0.9056) | `#756a59` (L≈0.1482) | **≈4.82:1** |
| Escuro| `#15120c` (L=0.0062) | `#8f8067` (L≈0.2225) | **≈4.85:1** |

Ambos acima do mínimo AA de 4.5:1, com margem de segurança (~0.3–0.35 acima do limite) para tolerar arredondamento de renderização.

Verificação de identidade visual: os novos tons mantêm a mesma família cromática (marrom/taupe terroso neutro, sem virar para cinza puro ou outra família de cor):

- Claro: razão R:G:B do token antigo `#9c8f7a` (156:143:122) ≈ 1 : 0.917 : 0.782; do token novo `#756a59` (117:106:89) ≈ 1 : 0.906 : 0.761 — mesma proporção, apenas mais escuro.
- Escuro: razão do token antigo `#7a6e5c` (122:110:92) ≈ 1 : 0.902 : 0.754; do token novo `#8f8067` (143:128:103) ≈ 1 : 0.895 : 0.720 — mesma proporção, apenas mais claro (necessário para contraste contra fundo quase preto).

Tokens ajustados (4 ocorrências, luz e escuro, incluindo os blocos `@media (prefers-color-scheme: dark)` e `[data-theme="dark"]`/`[data-theme="light"]` explícitos):

```css
/* Light (default + [data-theme="light"]) */
--h-ink-faint: #756a59; /* era #9c8f7a */

/* Dark (media query + [data-theme="dark"]) */
--h-ink-faint: #8f8067; /* era #7a6e5c */
```

Nenhum outro token de superfície, acento ou semântica de P&L foi alterado.

## 2. Navegação por teclado em `SortableHeader`

Arquivo: `src/components/horizonte/PortfolioTableV2.tsx` (função `SortableHeader`, ~linhas 166–204 após a alteração).

### Antes

```tsx
<th
  scope="col"
  className="... cursor-pointer select-none ..."
  style={{ color: "var(--h-ink-soft)", textAlign: align }}
  onClick={() => onSort(sortKey)}
>
  {label}
  {isActive ? (direction === "asc" ? " ▲" : " ▼") : ""}
</th>
```

Sem `tabIndex`, sem manipulador de teclado, sem `role="button"`, sem `aria-sort` — não focável, não operável via teclado, e leitores de tela não anunciavam o estado de ordenação.

### Depois

```tsx
<th
  scope="col"
  role="button"
  tabIndex={0}
  aria-sort={ariaSort} // "ascending" | "descending" | "none", conforme a coluna ativa
  className="... cursor-pointer select-none ... focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  style={{ color: "var(--h-ink-soft)", textAlign: align, outlineColor: "var(--h-accent)" }}
  onClick={() => onSort(sortKey)}
  onKeyDown={handleKeyDown} // Enter e Espaço acionam onSort(sortKey), com preventDefault
>
  {label}
  {isActive ? (direction === "asc" ? " ▲" : " ▼") : ""}
</th>
```

Mudanças:

- `tabIndex={0}` — cabeçalho entra na ordem de tabulação.
- `role="button"` — semântica de elemento acionável para tecnologia assistiva (um `<th>` nativo não tem semântica de controle).
- `onKeyDown` trata `Enter` e `Espaço` (`" "`/`"Spacebar"`), chama `onSort(sortKey)` e faz `preventDefault()` (evita scroll da página no Espaço).
- `aria-sort` reflete o estado real da coluna: `"ascending"`/`"descending"` quando a coluna está ativa, `"none"` quando não está — computado a partir do mesmo estado (`active`, `direction`) que já controla o indicador visual (▲/▼), então não há divergência entre o que é anunciado e o que é mostrado.
- Foco visível via `focus-visible:outline` (classe Tailwind) com cor do token de acento da v2 (`var(--h-accent)`), consistente com a identidade visual do Horizonte FI.

Confirmação de operabilidade por teclado: com o novo `tabIndex={0}`, `Tab` percorre as 7 colunas ordenáveis (Ativo, Classe, Posição, Preço médio, Variação, P&L, Dividend Yield) na ordem do DOM; `Enter` ou `Espaço` em qualquer cabeçalho focado dispara `toggleSort(key)` — mesmo comportamento do clique do mouse (mesma função, sem lógica duplicada) — alternando `sortDirection` ou trocando `sortKey`, e o `aria-sort` atualiza no mesmo re-render.

## Verificação

- `npm run test` — 34 arquivos de teste passaram (222 testes, 4 skipped), sem regressões.
- `npm run build` — build de produção concluído sem erros.

## Escopo

Alteração restrita aos dois pontos apontados na auditoria do prompt 54. Nenhum outro token, componente ou comportamento foi modificado.
