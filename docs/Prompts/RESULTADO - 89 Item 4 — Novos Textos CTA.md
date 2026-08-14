# RESULTADO — 89 Item 4 — Novos Textos de CTA (Botões "Terminal")

## Textos aplicados (3 dicionários)

| Chave | pt-BR | en | es |
|---|---|---|---|
| `landing.ctaTerminal` | "Minha Independência Financeira" | "My Financial Independence" | "Mi Independencia Financiera" |
| `landing.goToTerminal` | "Meu Painel" | "My Dashboard" | "Mi Panel" |

## Decisão sobre o texto do `ctaTerminal` — checkpoint com Paulo

O texto originalmente aprovado, **"Ver Minha Independência Financeira"**, não coube no botão da landing em mobile (375px): medição real no navegador (viewport 375×812) mostrou o botão com 413px de largura (`whitespace-nowrap`), estourando a tela em ~54px, com o texto cortado. Perguntei a Paulo em vez de decidir sozinho, conforme instrução explícita do prompt.

- **1ª rodada:** Paulo escolheu remover o verbo "Ver" → "Minha Independência Financeira". Medido de novo: 378.75px, ainda estourando por ~20px.
- **2ª rodada:** perguntei novamente; Paulo escolheu **manter o texto completo** e reduzir padding/fonte do botão especificamente no breakpoint mobile, em vez de trocar o texto por uma versão mais curta.

Implementado em `src/routes/index.tsx`: o botão do CTA agora usa `text-sm sm:text-lg` e `px-5 py-4 sm:px-8 sm:py-6` (ícone `ArrowRight` também escalado: `h-4 w-4 sm:h-5 sm:w-5`) — abaixo do breakpoint `sm` (640px) o botão fica mais compacto; a partir de `sm` volta ao tamanho original (`text-lg`, `px-8 py-6`). Medido de novo após a mudança: **289.9px de largura em 375px de viewport** (cabe com folga) e **volta a 18px/32px de padding em 1280px** (desktop inalterado).

## Gate de saída
1. `npx tsc --noEmit` — 0 erros nos arquivos deste item.
2. `npx vitest run` — 340 testes passados, 0 falhas.
3. `npm run build` — build limpo.
4. **Medição real em mobile (375px) e desktop (1280px), pt-BR:** confirmado acima via `getBoundingClientRect()`/`getComputedStyle()` no navegador — botão cabe em ambos os breakpoints, sem quebra de layout. **Não verificado visualmente em en/es** neste ambiente (textos mais curtos que o pt-BR, portanto matematicamente cabem também, mas Paulo pode querer conferir visualmente antes de considerar 100% fechado).
