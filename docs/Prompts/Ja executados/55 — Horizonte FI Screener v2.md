# 55 — Horizonte FI: `/app-v2/screener`

## Contexto

Esta é a primeira de uma nova leva de prompts (55-64) que estende a v2
"Horizonte FI" para **todas** as rotas autenticadas — a rodada anterior
(46-54) cobriu só Dashboard e Carteira, e isso gerou a reclamação correta de
que "ficou uma rota nova isolada e todo o resto diferente". A partir daqui,
cada prompt migra uma tela inteira.

**Regra nova, não-negociável nesta leva**: nenhum agente pode marcar uma etapa
como concluída sem **verificação visual real** — suba o dev server
(`npm run dev`), abra a rota no navegador (via ferramenta de browser
disponível — carregue as ferramentas certas com `ToolSearch` se estiverem
deferidas), navegue até `/app-v2/<rota>` logado com um usuário de teste, e
**olhe o resultado renderizado antes de dizer que terminou** — nos dois
temas (claro/escuro) e em pelo menos uma largura mobile (375px). Leitura de
código não substitui isso. Na rodada anterior, um dos agentes reportou "não
consegui confirmar visualmente" e ainda assim o resultado saiu ruim — isso
não pode se repetir.

## Referência de código (v1)

`src/routes/app/screener.tsx` (não lazy): usa `useMutation`/`useQueryClient`
com `assetQueryOptions(ticker)` (`src/lib/queryOptions.ts:53`), `?ticker=`
como search param validado, lazy `AssetForm`
(`src/components/ceiling/AssetForm.tsx`), `AssetCard` variant="search"
(`src/components/shared/AssetCard.tsx`), `ResultSkeleton`, `ErrorBoundary`,
`useI18n`. Layout de duas colunas: formulário de busca + card de resultado.

## Objetivo

Criar `src/routes/app-v2/screener.tsx`, reaproveitando **exatamente** os
mesmos hooks/queries/componentes de dado da v1 (`assetQueryOptions`,
`AssetForm`, `AssetCard`) — só a casca visual muda (tokens `--h-*`,
tipografia Fraunces/Inter, paleta petróleo, layout dentro do shell
`app-v2.tsx` com `SidebarHorizonte`).

## O que fazer

1. Ler `src/routes/app/screener.tsx` por completo antes de tocar em
   qualquer coisa.
2. Criar a rota v2 espelhando a mesma lógica de estado (search param
   `?ticker=`, mutation, error boundary), com o layout reestilizado:
   card de busca com tokens `--h-*`, resultado em `AssetCard` (o componente
   em si pode continuar usando classes Tailwind normais — não precisa
   reescrever `AssetCard`, só o contêiner da página precisa herdar os
   tokens v2 via `data-app-version="horizonte"` já ativo no shell).
3. Atualizar `SidebarHorizonte.tsx` (`src/components/layout-v2/`) para o
   item "Screener" apontar para `/app-v2/screener` em vez de `/app/screener`.
4. `npm run test` e `npm run build`.
5. **Verificação visual obrigatória** (ver regra acima) — buscar um ticker
   real (ex.: `PETR4` ou `MXRF11`) e confirmar que o card de resultado
   renderiza corretamente com os novos tokens, nos dois temas.

## Critérios de aceite

- Busca funciona identicamente à v1 (mesmo ticker retorna o mesmo resultado).
- Erro de ticker inválido exibe o mesmo tratamento de erro da v1, só
  restilizado.
- Evidência de verificação visual no documento de resultado (descrição do
  que foi visto, não só "passou nos testes").

## Fora de escopo

- Não alterar `AssetForm.tsx`/`AssetCard.tsx`/`ErrorBoundary.tsx` em si —
  só o contêiner da página v2.
