# PROMPT — Correção: Link "Admin" ausente no menu (Sidebar) + Reordenação
> Copiar e colar no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Causa raiz já diagnosticada e confirmada por mim direto no código — não é
necessário reinvestigar: `useAuth()` (`src/lib/auth-provider.tsx`) nunca lê o custom claim
`isAdmin` do token, então nenhuma parte da UI (incluindo `Sidebar.tsx`) sabe se o usuário logado é
admin. O guard de rota em `admin.tsx` já funciona (`beforeLoad` já checa `getIdTokenResult`), o
problema é só a ausência de link visível no menu.

## ITEM ÚNICO — Expor `isAdmin` no `useAuth()` e adicionar item "Admin" no Sidebar

**Arquivo 1:** `src/lib/auth-provider.tsx`

**Plano:**
- Adicionar `isAdmin: boolean` ao `AuthCtx`.
- No `onAuthStateChanged`, após obter `currentUser`, chamar `currentUser.getIdTokenResult()` (sem
  forçar refresh no listener geral — usar cache normal do token; forçar refresh já é feito
  separadamente pela rota `/admin`) e ler `claims.isAdmin === true`.
- Investigar se há necessidade de expor um `refreshAdminClaim()` no contexto pra re-checar depois
  de uma concessão de claim recente sem precisar de logout/login — avalie se vale a pena adicionar
  agora ou se é over-engineering para o caso de uso atual (você mesmo já teve que fazer logout/login
  pra pegar o claim novo do Gutierre da última vez — se isso for aceitável como fluxo normal, não
  precisa resolver agora).

**Arquivo 2:** `src/components/layout/Sidebar.tsx`

**Plano:**
- Importar `isAdmin` de `useAuth()`.
- Adicionar item de menu "Admin" (usar ícone `ShieldAlert` ou `LayoutDashboard`, já importado em
  outros arquivos do projeto — confirme qual ícone já é usado em contexto administrativo antes de
  escolher) que só renderiza quando `isAdmin === true`.
- **Posicionamento solicitado:** o item Admin deve aparecer como **primeira opção do dropdown do
  perfil** (`DropdownMenuContent`), acima de "Settings" — não na navegação principal (`tabs`), já
  que Admin não é uma aba de uso diário, é uma área separada de administração.
- Aplicar a mesma chave de tradução em `dict.ptBR.ts`/`dict.en.ts`/`dict.es.ts` (usar
  `t.admin.title` que já existe, não crie chave nova) — zero hardcode.

**Arquivo 3 (se aplicável):** `src/components/ceiling/Header.tsx`

- Investigar se esse componente (usado em `variant="landing"`) também precisa do mesmo tratamento —
  se ele também renderiza um dropdown de conta pro usuário logado, aplicar a mesma correção lá.

**Risco:** baixo — é aditivo, só aparece pra quem já tem o claim confirmado pelo backend.

## Roles Governança (Rule 9)

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório padrão |
| fuente-ux-designer | SIM | Decide posicionamento exato do item no dropdown (acima de Settings, conforme solicitado) e escolha de ícone consistente |
| fuente-solution-architect | NÃO | Correção pontual de UI, sem decisão arquitetural nova |
| Demais roles | NÃO | Sem impacto em dado pessoal, negócio, ou cálculo financeiro |

## Gates de Verificação (obrigatórios, output literal)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Traga o diff completo (`git diff src/`) junto com os 3 gates antes de eu aprovar o commit.
