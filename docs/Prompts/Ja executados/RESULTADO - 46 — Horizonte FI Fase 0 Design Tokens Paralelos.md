# RESULTADO — 46 — Horizonte FI Fase 0 Design Tokens Paralelos

## O que foi implementado

Criado o sistema de tokens da nova identidade visual "Horizonte FI" (v2), isolado
sob o seletor `[data-app-version="horizonte"]`, sem alterar `src/styles.css`
(v1) e sem importar o novo arquivo em nenhum componente/rota existente.

### Arquivos criados

- `src/styles/horizonte-tokens.css` — custom properties da paleta petróleo
  (paper/ink/accent/success/danger/warning), tipografia (Fraunces Variable +
  Inter Variable via `@font-face` local), escala de tamanhos, radii, sombras e
  opacidades de estado. Segue a mesma estrutura de precedência de
  `styles.css`:
  1. `[data-app-version="horizonte"]` (light, default)
  2. `@media (prefers-color-scheme: dark)` com `:not([data-theme="light"])`
  3. `[data-app-version="horizonte"][data-theme="dark"]` (override explícito)
  4. `[data-app-version="horizonte"][data-theme="light"]` (override explícito)
- `public/fonts/fraunces-variable-normal.woff2`
- `public/fonts/fraunces-variable-italic.woff2`
- `public/fonts/inter-variable-normal.woff2`
- `public/fonts/inter-variable-italic.woff2`

Ambos os arquivos (fontes + tokens) já existiam no working tree como
untracked ao início desta etapa (preparados previamente), e foram conferidos
linha a linha contra a especificação do prompt 46 antes do commit:
paleta petróleo (`--h-paper`, `--h-ink`, `--h-accent`, `--h-success`,
`--h-danger` com os valores exatos especificados), separação semântica
P&L vs. accent respeitada, `@font-face` apontando para `/fonts/*.woff2` local
(sem `<link>` de CDN), e nenhuma referência ao arquivo em `src/`.

### Verificações de escopo

- `grep -rn "horizonte-tokens" src/` → nenhum resultado (arquivo não
  importado em nenhum lugar, conforme exigido).
- `src/styles.css`, `Sidebar.tsx` e nenhuma rota foram tocados nesta etapa.
- Nenhuma rota nova foi criada.

## Resultado real dos testes/build

### `npm run build`

```
✓ built in 1.01s
```
Build completo sem erros, output da v1 gerado normalmente (nenhuma classe/token
novo referenciado por bundles existentes).

### `npm run test -- --run`

```
 Test Files  31 passed | 1 skipped (32)
      Tests  199 passed | 4 skipped (203)
   Start at  13:08:17
   Duration  24.30s
```
Todos os testes passando (skips pré-existentes, não relacionados a esta etapa).

Não foi feita verificação manual do Network tab do navegador (checagem visual
de "zero request para fonts.googleapis.com") porque o arquivo de tokens ainda
não é importado por nenhuma página renderizável — não há como a v2 disparar
requests de fonte nesta fase. Essa validação faz sentido a partir do próximo
prompt (import + ativação da v2), quando o arquivo passar a ser carregado de
fato.

## Desvios do plano original

Nenhum desvio de escopo. Os valores exatos de `--h-ink-soft`, `--h-ink-faint`
e `--h-line` (não especificados numericamente no prompt, que remete ao
protótipo Artifact) foram preenchidos com os valores já presentes no arquivo
preparado previamente por Paulo, mantendo consistência com a paleta petróleo
aprovada.

## Commit

Arquivos adicionados via `git add` (apenas os relevantes a esta etapa):
- `src/styles/horizonte-tokens.css`
- `public/fonts/fraunces-variable-normal.woff2`
- `public/fonts/fraunces-variable-italic.woff2`
- `public/fonts/inter-variable-normal.woff2`
- `public/fonts/inter-variable-italic.woff2`
- `docs/Prompts/RESULTADO - 46 — Horizonte FI Fase 0 Design Tokens Paralelos.md`

Mensagem de commit: `Horizonte FI 46 - Design tokens paralelos`
