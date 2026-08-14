# RESULTADO — 89 Item 3 — Limpeza da Barra de Contexto do Header

## 3.1 Tagline removida do contexto logado
`src/components/ceiling/Header.tsx` — o `<p>` da tagline (`t.appTagline`) e o `<span className="sr-only">` que a duplicava para leitores de tela agora só renderizam quando `variant === "landing"`. Dentro do app (`variant === "app"`), nem o texto visível nem o `sr-only` aparecem — removido de fato do fluxo, não só escondido visualmente. O `<h1>{t.appTitle}</h1>` sozinho ("Fuente Price Pro") foi considerado suficiente como contexto de marca dentro do app — não é conteúdo único de página (isso já é comunicado por landmarks/título da página), então nenhum `aria-label` adicional foi necessário.

## 3.2 Cotação USD/BRL condicional
- Criado hook reusável `useHasUSDAssets()` em `src/lib/useHasUSDAssets.ts` — reaproveita `useWatchlist()` (já existente) e verifica `items.some(i => i.currency === "USD")`. Não foi criada lógica de detecção nova: `currency` já é o SSOT de moeda por ativo (usado em `useValuedPortfolio`, `allocation.ts`, etc.) — cobre STOCK_US, REIT e ETFs denominados em USD, todos os quais têm `currency: "USD"`.
- Em `Header.tsx`, o badge de cotação (`variant === "app" && fx?.USDBRL`) agora só renderiza quando `hasUSDAssets === true`. Enquanto `useHasUSDAssets()` está carregando, um `Skeleton` do mesmo tamanho (`h-6 w-28`) ocupa o lugar — evita layout shift.

## Gate de saída
1. `npx tsc --noEmit` — 0 erros nos arquivos deste item.
2. `npx vitest run` — 340 testes passados, 0 falhas.
3. `npm run build` — build limpo.
4. **Teste manual — parcialmente verificado.** Este ambiente não tem uma conta de teste logada com dados reais de portfólio (sem credenciais/sessão real). Verificado via leitura de código que a lógica é: `usdAssetsLoading` → skeleton; `!usdAssetsLoading && hasUSDAssets && fx?.USDBRL` → cotação; caso contrário, nada (o container é `flex gap-2`, então o elemento ausente não deixa espaço vazio — sem ajuste de layout adicional necessário). **Ação pendente para Paulo:** confirmar visualmente com uma conta logada com e sem ativos USD, em mobile e desktop, antes de considerar este item 100% validado.
