# Prompt para Antigravity — Remoção de Código Morto Confirmado (PR5: Item 11, Tier Alta Confiança)

## Modo de operação

`[EXECUÇÃO]`. Baseado em output real do `knip` (Prompt 149) + triagem de Claude contra `package.json` real. Escopo deliberadamente restrito ao tier de alta confiança — itens ambíguos ficam fora, listados em outro prompt depois de confirmação manual.

**Um commit:**
```
chore(cleanup): remover código morto confirmado - servidor Express legado, componentes shadcn não usados, scripts órfãos [Item 11]
```

## Classificação de severidade (Product Manager)

🟢 Baixa — remoção de código/dependências sem uso, zero risco funcional caso a lista abaixo esteja correta (ver verificação obrigatória).

## Contexto

`npx knip` (rodado no Prompt 149) reportou 54 arquivos, 26 dependências e ~123 exports não utilizados. Claude triou o resultado contra `package.json` real e o histórico do projeto, separando em 3 tiers. Este prompt cobre **só o tier de alta confiança** — os outros tiers (falsos-positivos conhecidos do TanStack Router/framework, e itens que precisam confirmação manual) estão explicitamente fora de escopo.

## Escopo técnico

### 1. Servidor Express legado (confirmado morto — sem script em `package.json` referenciando)
- Deletar `server.production.js`
- Remover dependências `compression`, `express` do `package.json`
- Remover devDependency `nitro`
- Remover dependency `@tanstack/router-plugin` (substituído pelo plugin do `@tanstack/react-start`, já confirmado em `vite.config.ts`)

### 2. Componentes shadcn nunca customizados + dependências Radix associadas

Deletar arquivos:
```
src/components/ui/aspect-ratio.tsx
src/components/ui/avatar.tsx
src/components/ui/breadcrumb.tsx
src/components/ui/carousel.tsx
src/components/ui/command.tsx
src/components/ui/context-menu.tsx
src/components/ui/form.tsx
src/components/ui/input-otp.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/resizable.tsx
src/components/ui/scroll-area.tsx
src/components/ui/separator.tsx
src/components/ui/sidebar.tsx
src/components/ui/sonner.tsx
src/components/ui/toggle-group.tsx
src/components/ui/toggle.tsx
```

Remover dependências:
```
@radix-ui/react-aspect-ratio
@radix-ui/react-avatar
@radix-ui/react-context-menu
@radix-ui/react-menubar
@radix-ui/react-navigation-menu
@radix-ui/react-scroll-area
@radix-ui/react-separator
@radix-ui/react-toggle
@radix-ui/react-toggle-group
@hookform/resolvers
react-hook-form
zod
cmdk
embla-carousel-react
input-otp
react-resizable-panels
```

### 3. Scripts órfãos confirmados

Deletar:
```
scripts/audit-orphan-watchlist-items.ts
scripts/backfill-fii-reit-classification.ts
scripts/fix_investing_since_backfill.ts
scripts/scrape-dados-de-mercado.ts
scripts/seed-feature-gates.ts
scripts/set-admin-claim.ts
scripts/update-feature-gates-permissive.ts
scripts/validate-bolsai-hgbrasil.ts
scripts/validate-cvm.ts
scripts/validate-sec-edgar.ts
scripts/verify-sec-edgar.ts
scripts/execute-dev-pushes.js
```

## Verificação obrigatória ANTES de deletar cada arquivo/dependência

Rodar uma busca real (grep) por cada nome de arquivo/dependência listado acima, no projeto inteiro (incluindo `functions/` se existir como diretório de Firebase Functions separado, e qualquer `.github/workflows/` que possa chamar scripts diretamente por caminho) — o `knip` só varre o grafo de import do Vite; scripts chamados via `package.json` (já confirmado limpo, ver Contexto) ou CI externo não aparecem nele. Se qualquer arquivo tiver uma referência real fora do escopo do `knip`, **remover esse item específico da lista e reportar**, não deletar mesmo assim.

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| `zod`/`react-hook-form` sendo removidos pode quebrar algo se algum formulário novo (não capturado nesta auditoria) começou a usá-los recentemente | O grep de verificação acima cobre isso — se aparecer uso real, excluir da lista |
| Remover dependências do `package.json` exige rodar `npm install` depois para atualizar o `package-lock.json` | Rodar `npm install` após editar `package.json`, antes dos gates |
| Este prompt **não cobre** `MobileBottomNav.tsx`, `WatchlistIO.tsx`, `PortfolioTableV2.tsx`, `landing/showcase/*`, `error-capture.ts`, `resend`, `playwright`, `date-fns` — ficam para depois de confirmação manual | Não expandir escopo por conta própria |

## Proibido

- Tocar em qualquer arquivo/dependência fora das 3 listas acima.
- Remover `ExplorarPage`, `ReinvestirPage`, `RealidadeFiscalPage`, `src/server.ts`, ou qualquer export de rota — são falsos-positivos confirmados (TanStack Router file-based routing).
- Remover `GORDON_HIGH_GROWTH_YEARS`/`GORDON_MAX_GROWTH_VOLATILITY` de `calculations.ts` — são usados internamente, decisão separada (Item 4).

## Governança de roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-solution-architect` | ✅ | Triagem de falso-positivo vs. código morto real |
| `fuente-product-manager` | ✅ | Classificação de severidade acima |
| Demais 6 roles | ❌ | Limpeza técnica sem impacto de UX/negócio/dado pessoal visível |

## Gates de verificação final (colar output literal)

```bash
npm install
npx tsc --noEmit
npm run test
npm run build
```

## Mensagem de commit

```
chore(cleanup): remover código morto confirmado - servidor Express legado, componentes shadcn não usados, scripts órfãos [Item 11]
```
