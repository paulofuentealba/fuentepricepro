### Prompt 30 — Correção de Race Condition na Retomada do Onboarding 🛠️

- **Problema Diagnosticado**: O `useEffect` de retomada em `InvestorProfileFlow.tsx` possuía array de dependências vazio `[]`, executando uma única vez no mount quando `isPending === true` e `profile` ainda continha os valores padronizados `null`. Isso fazia com que a retomada sempre caísse no Step 0 em F5s ou acessos iniciais.
- **Implementações Realizadas**:
  1. **Gate e Ref de Retomada Única (`src/components/onboarding/InvestorProfileFlow.tsx`)**:
     - `useEffect` parametrizado com dependências `[isPending, profile]`.
     - Utilizado `useRef(false)` (`hasResumedRef`) para garantir que a retomada de progresso execute exatamente uma vez assim que `isPending === false`.
     - Isolada a função pura `determineResumptionStep(profile)` em `src/lib/investor-profile.ts` para testabilidade.
  2. **Estado de Carregamento sem "Pisca"**:
     - Adicionado card de carregamento com `Loader2` e backdrop blur enquanto `isPending === true`, impedindo a renderização prematura da tela de boas-vindas.
  3. **Verificação Manual & Testes de Retomada**:
     - **Cenário 1 (Perfil Parcial)**: Simulado perfil com `goal: "income"` e `horizon: "long"`, `reaction: null`, `experience: null`. Na renderização com `isPending === false`, o componente abre diretamente no **Step 3 / Pergunta 3 (Reação)**.
     - **Cenário 2 (Pós-Mutação)**: Confirmado que seleções subsequentes durante o fluxo avançam normalmente os passos sem reinicializar o step devido à trava da `hasResumedRef`.
     - **Cenário 3 (Configurações)**: Testada a retoma em Configurações via modal.
  4. **Atualização do Backlog (`docs/BACKLOG_V2.md`)**:
     - Atualizadas as seções `4.1 Otimização de Conversão e Onboarding` e `4.2 Onboarding Regulatório e Perfilamento (KYC/Suitability)` para refletir que o fluxo está implementado para personalização de UX (distinguindo do Suitability regulatório CVM/ANBIMA formal).
- **Validação de Testes**:
  - `npm run test`: **77/77 testes unitários aprovados** em 14 arquivos de teste.
  - `npm run build`: Build de produção executado com sucesso.

---