# 63 — Horizonte FI: `/app-v2/settings` ⚠️ tela mais sensível da leva

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55. **Esta é a tela de maior risco de toda a série** — contém fluxo
de exclusão de conta com reautenticação Firebase e batch-delete no
Firestore. Nenhuma linha de lógica de autenticação, exportação de dado
(LGPD) ou exclusão pode ser tocada nesta etapa — só a casca visual.

## Referência de código (v1)

`src/routes/settings.tsx`: hoje **fora** do shell `app.tsx`/sidebar (layout
próprio, header mini, `min-h-screen`). Usa `useAuth`
(`src/lib/auth-provider.ts`), chamadas diretas ao Firestore (`getDoc`,
`setDoc`, `getDocs`, `writeBatch` em `src/integrations/firebase/client.ts`),
`useInvestorProfile` (`src/lib/useInvestorProfile.ts`),
`calculateProfileTier` (`src/lib/investor-profile.ts`),
`InvestorProfileFlow` (`src/components/onboarding/InvestorProfileFlow.tsx`),
`buildUserDataExport` (`src/lib/dataExport.ts`),
`buildAccountDeletionPaths` (`src/lib/accountDeletion.ts`). UI interna em 3
abas (perfil/assinatura/privacidade) mais um `DeleteAccountWizard` inline
(linhas ~310-593, fluxo de 3 passos com reauth).

## Objetivo

Criar `src/routes/app-v2/settings.tsx`, **dentro do shell `app-v2.tsx`**
desta vez (diferente da v1, que hoje vive fora do shell — isso é uma
correção de consistência: settings deveria estar dentro da navegação
principal). Reaproveitar 100% da lógica — só a apresentação muda.

## O que fazer

1. Ler `src/routes/settings.tsx` **por completo**, sem pular nenhuma
   seção — é o arquivo mais sensível desta leva.
2. Recriar a estrutura de abas com os tokens `--h-*`, preservando:
   - As 3 abas e todo o conteúdo/textos de cada uma.
   - O `DeleteAccountWizard` **byte-a-byte na lógica** (os 3 passos de
     reauth + batch-delete não podem ter uma linha de comportamento
     alterada) — só a estilização visual dos botões/inputs/avisos.
   - Qualquer texto de aviso/confirmação de exclusão permanece **idêntico**
     — não é hora de "melhorar copy" numa tela de exclusão de conta.
3. Incluir "Settings" em `SidebarHorizonte.tsx` (hoje não está na lista de
   navegação da v2 porque não estava na v1 dentro do shell principal) →
   `/app-v2/settings`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória** — navegar pelas 3 abas, abrir o
   wizard de exclusão até o passo antes da ação irreversível (**não
   completar a exclusão de uma conta real durante o teste**), nos dois
   temas.

## Critérios de aceite adicionais (acima da regra geral da leva)

- Diff do arquivo mostra **zero mudança** em qualquer chamada a
  `getDoc`/`setDoc`/`getDocs`/`writeBatch`, `buildAccountDeletionPaths`,
  `buildUserDataExport`, ou nos textos de confirmação de exclusão —
  qualquer mudança nessas linhas deve ser reportada explicitamente como
  desvio, não silenciada.

## Fora de escopo

- Qualquer alteração de comportamento de autenticação, exportação LGPD ou
  exclusão de conta.
