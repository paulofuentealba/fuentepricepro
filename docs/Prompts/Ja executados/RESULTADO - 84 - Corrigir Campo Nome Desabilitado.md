# RESULTADO — Prompt 84: Corrigir Campo Nome Desabilitado

## Resumo
Corrigido o campo "Nome Completo" na página de Configurações (Perfil) para que seja editável apenas para contas de email/senha, permanecendo desabilitado para contas Google.

## Ações Realizadas

### 1. `src/routes/settings.tsx`
- **Problema**: O `Input` do nome usava `user.displayName` diretamente e estava sempre `disabled` com classe `bg-muted/50`.
- **Solução**:
  - Alterado para usar o estado local `name` (já existente e populado via Firestore no `useEffect`)
  - Adicionado `onChange={(e) => setName(e.target.value)}` para atualizar o estado local
  - Condicional `disabled={isGoogle}` — só desabilita para contas Google
  - Classe condicional `className={isGoogle ? "bg-muted/50" : ""}` — remove fundo cinza quando editável
  - Adicionado `aria-disabled={isGoogle}` para acessibilidade
  - Adicionado texto explicativo condicional (via i18n) quando `isGoogle` é true: *"Nome gerenciado pelo Google. Altere nas configurações da sua conta Google."*

### 2. `src/lib/i18n/dict.ptBR.ts`
- Adicionada chave `nameGoogleLocked` em `settings.profile`:
  ```typescript
  nameGoogleLocked: "Nome gerenciado pelo Google. Altere nas configurações da sua conta Google."
  ```

### 3. `src/lib/i18n/dict.en.ts`
- Adicionada chave `nameGoogleLocked` em `settings.profile`:
  ```typescript
  nameGoogleLocked: "Name is managed by Google. Change it in your Google Account settings."
  ```

### 4. `src/lib/i18n/dict.es.ts`
- Adicionada chave `nameGoogleLocked` em `settings.profile`:
  ```typescript
  nameGoogleLocked: "El nombre lo gestiona Google. Cámbialo en la configuración de tu cuenta de Google."
  ```

## Validação
- �� `npx tsc --noEmit` — Type check passa (após adicionar chaves em todos os 3 dicionários)
- �� `npm run test` — 322 testes passam
- �� `npm run build` — Build bem-sucedido

## Comportamento Esperado
| Tipo de Conta | Campo Nome | Comportamento |
|---------------|------------|---------------|
| Email/Senha | Editável | Usuário digita, clica "Salvar Alterações", persiste no Firestore e Firebase Auth |
| Google | Desabilitado (somente leitura) | Exibe nome vindo do Google, mostra hint explicativo, não envia `name` no save |

## Notas Técnicas
- O `handleSaveProfile` já existia e já salvava `name` no Firestore (`updateProfile({ name })`) e atualizava `displayName` no Firebase Auth para contas não-Google
- O estado `name` já era populado do Firestore no `useEffect` inicial
- A detecção `isGoogle` já existia: `user?.providerData?.some(p => p.providerId === "google.com")`
- Nenhuma lógica de backend nova foi necessária — apenas "ligar os pontos" no frontend