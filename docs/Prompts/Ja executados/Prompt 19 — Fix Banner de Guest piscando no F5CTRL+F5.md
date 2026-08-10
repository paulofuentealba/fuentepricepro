### Prompt 19 — Fix: Banner de Guest piscando no F5/CTRL+F5 ✅

- **Objetivo**: Evitar o comportamento indesejado em que o `GuestWarningBanner` piscava momentaneamente ao recarregar a página (F5 ou CTRL+F5) para usuários autenticados.
- **Causa Raiz**: O componente `GuestWarningBanner.tsx` dependia apenas do objeto `user` retornado pelo `useAuth()`. Durante a restauração da sessão via Firebase `onAuthStateChanged`, o estado inicial de `user` é `null` enquanto `loading` é `true`. O banner rendering-se imediatamente sem aguardar `loading` causava um flash do banner antes da autenticação ser confirmada.
- **Solução (`src/components/ceiling/GuestWarningBanner.tsx`)**:
  - Atualizada a desestruturação do hook `useAuth()` para extrair `loading`.
  - Atualizado o Early Return para `if (loading || user) return null;`.
- **Verificação**:
  - Testado e validado: o banner não aparece para usuários autenticados durante a inicialização/reload.
  - Testes unitários (41/41) e build de produção executados com sucesso sem erros.

---