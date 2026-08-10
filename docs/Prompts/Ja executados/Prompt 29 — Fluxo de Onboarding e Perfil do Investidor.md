### Prompt 29 — Fluxo de Onboarding e Perfil do Investidor 🎯

- **Objetivo**: Implementar o fluxo de 6 telas pós-cadastro (e refazível em Configurações) para identificação do perfil de investidor com salvamento incremental e retomada de progresso.
- **Implementações Realizadas**:
  1. **Modelo de Dados & Classificação Pure-Function (`src/lib/investor-profile.ts`)**:
     - Definida a interface `InvestorProfile` (`version`, `completedAt`, `goal`, `horizon`, `reaction`, `experience`, `skipped`).
     - Criada a função pura `calculateProfileTier(profile)` para determinar o perfil (Conservador, Moderado, Arrojado) e foco (Renda, Crescimento).
  2. **Persistência Incremental (`src/lib/useInvestorProfile.ts`)**:
     - Hook integrado ao Firestore em `users/{userId}.investorProfile` com fallback em `localStorage` para modo convidado.
     - Cada resposta dispara salvamento incremental mantendo `completedAt: null` até o encerramento do questionário.
  3. **Componente Reutilizável (`src/components/onboarding/InvestorProfileFlow.tsx`)**:
     - 6 telas (Boas-vindas $\rightarrow$ 4 perguntas $\rightarrow$ Resultado).
     - Barra de progresso (25% a 100%), botão de pulo individual e botão "Pular por agora".
     - Retomada automática a partir da primeira pergunta pendente em acessos posteriores.
     - Selo visual do resultado (~104px) com anel tracejado, fundo radial gradiente e ícones dedicados (`Shield`, `Scale`, `Rocket`).
     - Estilização completa na paleta Emerald (`bg-emerald-600`, `hover:bg-emerald-500`, glow `shadow-[0_0_15px_rgba(16,185,129,0.4)]`).
  4. **Pontos de Entrada Integrados**:
     - **Pós-Cadastro**: Em `src/routes/auth.tsx`, exibido antes do redirecionamento para o dashboard.
     - **Configurações**: Em `src/routes/settings.tsx`, adicionado o card resumo do Perfil de Investidor com o botão "Refazer Questionário".
  5. **i18n & Débito Técnico**:
     - Textos integrados nos 3 dicionários (`dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts`).
     - Débito técnico sobre inconsistência das cores do botão primário registrado em `docs/BACKLOG_V2.md`.
- **Validação de Testes**:
  - `npm run test`: **71/71 testes unitários aprovados** em 14 arquivos de teste.
  - `npm run build`: Build de produção executado com sucesso.

---