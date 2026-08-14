# RESULTADO — 49 — Horizonte FI: Rota paralela e layout base

## O que foi implementado

Criada a rota paralela `/app-v2` (TanStack Router, file-based) com layout
base — sidebar e topbar usando os tokens do prompt 46 — sem nenhuma tela de
conteúdo real, conforme escopo do prompt.

1. **`src/routes/app-v2.tsx`** — layout raiz da v2, espelhando
   `src/routes/app.tsx`: mesmo `useAuth()` (nenhuma verificação de sessão
   nova ou duplicada), mesmo shell (`Header`, `GuestWarningBanner`,
   `MobileBottomNav`, `FeedbackWidget`). Aplica `data-app-version="horizonte"`
   no elemento raiz para ativar os tokens `--h-*` só nesta subárvore, e
   importa `@/styles/horizonte-tokens.css` diretamente no módulo da rota (não
   globalmente), garantindo que a v1 não carregue as fontes Fraunces/Inter.
2. **`src/components/layout-v2/SidebarHorizonte.tsx`** — mesma lista de
   navegação, mesmas chaves/hrefs/ícones de `src/components/layout/Sidebar.tsx`
   (myportfolio, screener, comparator, riskradar, globalradar, cashflow,
   smartallocation, snowballeffectsimulator, wiki), estilizada com os tokens
   `--h-*`: marca "Horizonte FI" em `var(--h-font-display)` (Fraunces), itens
   em `var(--h-font-body)` (Inter), accent petróleo (`--h-accent`/
   `--h-accent-strong`) no item ativo. Todos os links continuam apontando
   para as rotas v1 (`/app/...`) — nenhuma tela foi migrada ainda.
3. **`src/routes/app-v2/index.tsx`** — página placeholder ("Horizonte FI v2
   — em construção") só para validar que a rota monta e o layout renderiza
   corretamente com os tokens. Sem lógica de dado.
4. Acesso a `/app-v2` fica disponível só via URL direta — nenhum link foi
   adicionado a partir da v1 (`src/routes/app.tsx` e
   `src/components/layout/Sidebar.tsx` não foram tocados).

## Desvio do plano original (e correção)

Ao iniciar a tarefa, o diretório de trabalho já continha (não commitados)
`src/routes/app-v2.tsx`, `src/routes/app-v2/index.tsx` e
`src/components/layout-v2/SidebarHorizonte.tsx` de uma execução anterior
incompleta desta mesma série. Esses arquivos avançavam escopo dos prompts
seguintes (o `index.tsx` já continha o dashboard real do prompt 51, com
`useValuedPortfolio`, `useTransactions`, cálculo de proventos realizados
etc.; e a sidebar já linkava "Dashboard" para dentro de `/app-v2`, antecipando
a migração dos prompts 51/52).

Como o prompt 49 explicita "fora de escopo: nenhuma lógica de dado nova,
nenhuma tela de conteúdo real ainda", os dois arquivos foram reescritos para
aderir estritamente a este prompt:
- `app-v2/index.tsx` voltou a ser um placeholder estático, sem hooks de
  dado.
- `SidebarHorizonte.tsx` voltou a reaproveitar exatamente a mesma lista de
  navegação (chaves e hrefs) de `Sidebar.tsx`, todos apontando para rotas
  v1, sem antecipar a migração do Dashboard/Carteira.

`src/routes/app-v2.tsx` já estava alinhado ao escopo do prompt 49 e foi
mantido como estava.

Não foi tocado `src/components/horizonte/HorizonteHero.tsx` (havia uma
modificação local não commitada, pertencente ao trabalho do prompt 50/51) —
está fora do escopo desta tarefa e não é referenciado pelo placeholder desta
etapa.

## Arquivos criados/alterados

- `src/routes/app-v2.tsx` (criado)
- `src/routes/app-v2/index.tsx` (criado)
- `src/components/layout-v2/SidebarHorizonte.tsx` (criado)

## Critérios de aceite — verificação

- `/app-v2` requer login (mesma proteção da v1): a v1 (`src/routes/app.tsx`)
  não possui `beforeLoad` de redirecionamento — o acesso sem login é
  permitido em modo "guest" com `GuestWarningBanner`. `app-v2.tsx` reutiliza
  exatamente o mesmo `useAuth()` e o mesmo `GuestWarningBanner`, portanto a
  proteção é idêntica.
- `/app` (v1) continua idêntica: `src/routes/app.tsx` e
  `src/components/layout/Sidebar.tsx` não foram tocados (confirmado por
  `git status`/`git diff` antes do commit).
- Fontes Fraunces/Inter carregam só dentro de `/app-v2`: o `@font-face` de
  `horizonte-tokens.css` só é importado no módulo `app-v2.tsx`, nunca em
  arquivo global (`main.tsx`/`__root.tsx` não foram alterados).
- Dark/light mode funcionam em `/app-v2`: os tokens `--h-*` reagem a
  `[data-theme="dark"]`/`[data-theme="light"]` conforme já implementado no
  prompt 46; o toggle existente do app não foi alterado.

## Resultado real de testes/build

### `npm run build`

```
✓ built in 905ms
```

Build completo sem erros (client + server), incluindo os novos chunks
`app-v2-*.js` gerados pelo TanStack Router para a nova rota.

### `npm run test`

```
 Test Files  34 passed | 1 skipped (35)
      Tests  221 passed | 4 skipped (225)
   Start at  14:55:50
   Duration  3.47s
```

Nenhum teste quebrou; nenhum teste novo foi adicionado (não há lógica de
dado nova nesta etapa, conforme "fora de escopo").

## Pendências / próximos passos

- Prompt 50 (Hero canvas) já está commitado (`HorizonteHero.tsx`), mas ainda
  não está integrado a nenhuma rota — a integração é do prompt 51 (Dashboard
  v2), que substituirá o placeholder criado aqui.
- Prompt 51/52 devem atualizar `SidebarHorizonte.tsx` para apontar
  Dashboard/Carteira para `/app-v2` conforme cada tela for migrada.
