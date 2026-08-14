# 84 — Corrigir Campo Nome Sempre Desabilitado em Configurações (Bug de Autenticação)

## Contexto e causa raiz confirmada

`src/routes/settings.tsx`, aba Perfil:

```tsx
<Input value={user.displayName || ""} disabled className="bg-muted/50" />
```

O campo Nome está **sempre desabilitado**, incondicionalmente — usuário
que criou conta com e-mail/senha (sem Google) não tem como preencher o
nome nunca, mesmo que `user.displayName` esteja vazio (como no
screenshot real de Paulo). A lógica pra distinguir a origem da conta já
existe no mesmo arquivo (`providerData.some(p => p.providerId ===
"google.com")`, usada hoje só na seção de exclusão de conta) — nunca foi
aplicada aqui.

Confirmados 2 problemas adicionais que também precisam de correção,
não só o `disabled`:

1. `handleSaveProfile` (linha ~83) só persiste `phone`/`location` no
   Firestore — não grava o nome em lugar nenhum, nem Firestore nem
   Firebase Auth.
2. `useAuth()` (`src/lib/auth-provider.tsx`) não tem mecanismo de
   atualizar o objeto `user` em memória depois de uma mudança de perfil
   — mesmo corrigindo os 2 pontos acima, a tela não refletiria o nome
   novo sem logout/login manual.

## Regra de negócio (confirmada por Paulo)

- **Conta via Google**: nome vem do Google, campo continua **desabilitado**
  (Google é a fonte da verdade pra esse dado).
- **Conta via e-mail/senha**: campo **habilitado**, editável e salvável.

## Escopo técnico

### 1. Computar `isGoogle` no escopo do componente (não só na seção de exclusão)

Extrair a checagem `providerData.some(p => p.providerId ===
"google.com")` pra uma variável no topo do componente (ou memoizada),
reaproveitada tanto na seção de exclusão de conta (já existe) quanto
agora no campo Nome — não duplicar a lógica.

### 2. Campo Nome condicionalmente editável

```tsx
<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
  disabled={isGoogle}
  className={isGoogle ? "bg-muted/50" : undefined}
/>
```

Novo estado local `const [name, setName] = useState("")`, inicializado a
partir de `user.displayName` (fallback pra um campo `name` já salvo no
Firestore, se existir de uma tentativa anterior de salvar — verificar se
já existe leitura de perfil do Firestore em algum lugar do componente
pra reaproveitar, dado que `phone`/`location` já são lidos de algum
lugar — confirmar a fonte antes de assumir).

### 3. `handleSaveProfile` grava o nome de verdade

Quando `!isGoogle`: chamar `updateProfile(auth.currentUser, {
displayName: name })` (Firebase Auth SDK, `firebase/auth`) **além** do
`setDoc` já existente pra `phone`/`location` — considerar também gravar
`name` no mesmo documento Firestore (`users/{uid}`), pra ter uma cópia
consistente e não depender só do Firebase Auth pra exibir o nome em
outros lugares do app que talvez já leiam de Firestore em vez de
`user.displayName` direto (investigar se algum componente já faz isso
antes de decidir se grava nos dois lugares ou só num).

Quando `isGoogle`: não tentar `updateProfile` (o campo está desabilitado,
não deveria nem estar no payload de salvar, mas garantir que o handler
não tenta sobrescrever o nome do Google por engano mesmo que o state
`name` exista).

### 4. Refletir a mudança na UI sem precisar logout/login

Depois de `updateProfile()` bem-sucedido, chamar `auth.currentUser.reload()`
seguido de alguma forma de notificar o `AuthProvider` que o `user` mudou
— investigar a forma mais simples dado que `onAuthStateChanged` não
dispara automaticamente só por causa de `updateProfile`. Se não houver
um jeito limpo de forçar isso pelo Provider atual, uma alternativa
aceitável é o próprio `settings.tsx` manter um `name` local que já reflete
o valor salvo imediatamente após sucesso (otimista), mesmo que o objeto
`user` do contexto global só atualize depois — reportar qual caminho foi
escolhido.

## Regras obrigatórias

- Não alterar o comportamento pra contas Google — continuam com o campo
  desabilitado, nome sempre vindo do Google.
- Não quebrar `phone`/`location`, que já funcionam.

## Testes obrigatórios

1. Conta Google: campo Nome desabilitado, valor = `user.displayName`.
2. Conta e-mail/senha: campo Nome habilitado, editável.
3. Salvar nome numa conta e-mail/senha → confirma que persiste (Firestore
   e/ou Firebase Auth, conforme decisão do item 3) e que a UI reflete o
   novo valor sem precisar recarregar a página.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot do campo habilitado numa conta de teste e-mail/senha, e
   desabilitado numa conta de teste Google

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
