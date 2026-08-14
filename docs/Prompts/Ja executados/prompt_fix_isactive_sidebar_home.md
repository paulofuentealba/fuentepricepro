# Prompt para Claude Code — Corrigir `isActive` do Tab "Home" no Sidebar

## Bug confirmado

`src/components/layout/Sidebar.tsx`, dentro de `tabs.map(...)`:

```ts
const isActive = location.pathname.startsWith(path);
```

O novo tab "home" (adicionado no prompt anterior) usa `path: "/app/"`.
Como **toda** rota autenticada começa com `/app/` (`/app/screener`,
`/app/cashflow`, etc.), esse `startsWith` faz o tab "Independência
Financeira" aparecer destacado/ativo em **todas as páginas**, não só na
home.

## Correção

```ts
const isActive =
  path === "/app/"
    ? location.pathname === "/app/" || location.pathname === "/app"
    : location.pathname.startsWith(path);
```

(Tratar `/app` sem barra final também, já que o TanStack Router pode
normalizar de qualquer um dos dois jeitos — confirmar qual formato real
`location.pathname` retorna antes de finalizar.)

## Verificação obrigatória

1. Navegar para `/app/screener` (ou qualquer outra rota) e confirmar que
   **só** o tab correspondente aparece destacado, não mais o "home"
   simultaneamente.
2. Navegar para `/app/` e confirmar que o tab "home" aparece destacado
   normalmente.
3. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos.

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
