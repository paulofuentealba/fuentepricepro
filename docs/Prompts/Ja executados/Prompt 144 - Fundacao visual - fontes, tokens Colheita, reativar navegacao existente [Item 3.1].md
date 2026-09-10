# Prompt 144 — Fundação visual: fontes, tokens Colheita, reativar navegação existente [Item 3.1]

## Contexto
O protótipo canônico é `docs/design/v6/fuente-v6-completo.html`. Ele já existe, completo, com telas em HTML/CSS puro — é a fonte de verdade visual, não precisa ser redesenhado, só seguido com fidelidade.

Confirmado no disco:
- `public/fonts/` só tinha Fraunces e Inter (.woff2 locais). Space Grotesk e JetBrains Mono não existiam no projeto.
- `src/styles.css` usa nomenclatura shadcn padrão (`--background`, `--foreground`, `--primary`, `--card`) em `oklch`.
- `src/components/layout/Sidebar.tsx` tinha itens de menu desabilitados (`reinvestir` e `realidade-fiscal`), cujas rotas já funcionam e têm motor completo testado.
- `src/components/layout/MobileBottomNav.tsx` não tinha slot para reinvestir.

## Escopo
1. **Fontes**: Adicionar Space Grotesk e JetBrains Mono (arquivos `.woff2` locais com `font-display: swap`) e estender `@theme inline` com `--font-display` e `--font-mono`.
2. **Tokens de Cor & Textura**: Validar conversão OKLCH -> Hex contra a paleta do protótipo Colheita e adicionar textura pontilhada no `body::before`.
3. **Navegação**: Reativar rotas `/app/reinvestir` e `/app/realidade-fiscal` na `Sidebar.tsx`, implementar badge dinâmico de proventos a reinvestir e adicionar slot de reinvestir na `MobileBottomNav.tsx` (6 colunas).
4. **Aplicação nas Telas Existentes**: Aplicar `font-serif`, `font-display` e `font-mono` em `AskScreen.tsx`, `TaxRealityScreen.tsx` e `MetricBox.tsx`.
