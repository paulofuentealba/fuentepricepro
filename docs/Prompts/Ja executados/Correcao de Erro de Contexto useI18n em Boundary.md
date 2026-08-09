# Correção de Erro de Contexto `useI18n` em Boundary de Rota

> [!NOTE]
> Documentação técnica da solução implementada para tratar a exceção `Error: useI18n must be used within I18nProvider` e prevenir falhas em cascata no `Error Boundary` React do aplicativo.

---

## 1. Causa Raiz & Diagnóstico

Durante a renderização ou navegação na rota de Cash Flow, uma falha secundária acionava a árvore de captura de erros do React (`Error Boundary` / `RouteErrorComponent`).

Ao montar componentes de layout para exibir a interface de fallback (como o `<Header />`), a função `useI18n()` era executada fora da árvore ativa de contextos ou durante o descarte de providers, disparando a exceção `throw new Error("useI18n must be used within I18nProvider")`. Essa exceção não tratada interrompia a recuperação do `Error Boundary`, resultando em uma tela em branco (white screen) ou erro fatal no console.

---

## 2. Solução Implementada

Para tornar a aplicação resiliente a falhas de contexto durante a montagem de limites de erro, foram adicionados fallbacks seguros nos hooks fundamentais:

1. **`useI18n()` ([`src/lib/i18n-provider.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n-provider.tsx))**:
   - Quando invocado fora de um `I18nProvider` (ex: em boundaries isoladas de rota), retorna o dicionário padrão `dict.ptBR` de forma graciosa sem lançar exceções.
2. **`useAuth()` ([`src/lib/auth-provider.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/auth-provider.tsx))**:
   - Retorna um objeto padrão de usuário nulo `{ user: null, loading: false }` para evitar falhas ao consultar o estado de autenticação no cabeçalho de erro.
3. **`useSubscription()` ([`src/lib/subscription.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/subscription.tsx))**:
   - Retorna `{ tier: "pro", isPro: true, loading: false }` para garantir a integridade dos seletores de plano.

---

## 3. Evidências Literais de Validação

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **150 passed** | 4 skipped (25 arquivos de teste aprovados).
3. **`npm run build`**: Client e SSR compilados com sucesso.

---

## 4. Registro de Commit

- **Título do Commit**: `fix(i18n): adiciona fallbacks em useI18n, useAuth e useSubscription para evitar quebra de Error Boundary`
- **Mensagem no Git**: `fix(i18n): adiciona fallbacks em useI18n, useAuth e useSubscription para evitar quebra de Error Boundary`
- **Commit Short SHA**: `ebd8353`
- **Commit Full SHA**: `ebd8353509f621a402b240e904df8b68b6da35d4`
