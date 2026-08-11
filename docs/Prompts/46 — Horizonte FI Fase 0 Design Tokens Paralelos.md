# 46 — Horizonte FI: Fase 0, Design Tokens Paralelos

## Contexto

Nova identidade visual "Horizonte FI" aprovada por Paulo (paleta petróleo,
tipografia Fraunces + Inter) a partir de protótipo em Claude Artifact. Esta é a
**primeira** de 9 prompts em sequência (46-54) para construir uma **v2 de
frontend em paralelo**, sem tocar a v1 em produção.

Regra não-negociável em todos os prompts desta série: **nenhuma lógica de
negócio nova**. Toda a inteligência de cálculo (consenso de valuation, FI
progress, renda realizada, cash flow) já existe em `src/lib/` — este épico é
100% camada de apresentação.

## Objetivo desta etapa

Criar o sistema de tokens da v2 **sem modificar** `src/styles.css` (que serve a
v1 hoje). Os tokens devem viver isolados, ativáveis só na v2.

## O que fazer

1. Criar `src/styles/horizonte-tokens.css` com custom properties sob um seletor
   de escopo `[data-app-version="horizonte"]` (nunca em `:root` puro — isso
   vazaria para a v1):
   - Paleta (petróleo, aprovada):
     - `--h-paper: #F7F4EC` / dark `#15120C`
     - `--h-paper-raised: #FFFFFF` / dark `#1E1911`
     - `--h-ink: #211C13` / dark `#F1EADA`
     - `--h-ink-soft`, `--h-ink-faint`, `--h-line` (ver protótipo Artifact para
       valores exatos — Paulo tem o link salvo)
     - `--h-accent: #2C6B63` / dark `#7BB5AB`
     - `--h-accent-strong: #1F4E47` / dark `#A3D0C7`
     - `--h-success: #3E7856` / `--h-danger: #AE4A34` (semântica de P&L,
       **nunca** reutilizar `--h-accent` para ganho/perda — essa separação é o
       ponto central da nova identidade, não é negociável nesta etapa)
   - Repetir os blocos para `@media (prefers-color-scheme: dark)` e para
     `[data-theme="dark"]` / `[data-theme="light"]` explícitos (mesmo padrão
     dos tokens atuais de `styles.css` — copiar a estrutura de precedência).
2. Inline as fontes Fraunces (variável, pesos 300-900) e Inter (variável,
   100-900) como `@font-face` com `src: url(...)` apontando para arquivos em
   `public/fonts/` (baixar os `.ttf`/`.woff2` de fontsource ou Google Fonts,
   licença OFL — **não** usar `<link>` para CDN externo, o app já roda sem
   dependência de rede para fontes).
3. Não importar este arquivo em nenhum lugar ainda — próximo prompt cuida
   disso.

## Critérios de aceite

- `npm run build` continua passando sem alteração de output da v1 (diff visual
  zero na v1 — nenhuma classe/token compartilhado).
- Arquivo novo isolado, não referenciado por nenhum componente existente.
- Fontes carregam localmente (checar Network tab, zero request para
  fonts.googleapis.com).

## Fora de escopo (não fazer aqui)

- Não criar rota nova, não tocar `Sidebar.tsx`, não tocar `styles.css`.
