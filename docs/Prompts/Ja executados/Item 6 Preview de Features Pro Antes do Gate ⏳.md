### Item 6: Preview de Features Pro Antes do Gate ⏳ ANÁLISE CONCLUÍDA — AGUARDANDO DECISÃO DE PAULO (OPÇÕES A, B OU C)

- **Diagnóstico & Causa Raiz**:
  - As rotas `CashFlow` (`/app/cashflow`) e `Smart Allocation` (`/app/smartallocation`) bloqueiam o acesso com `LockedPanel.tsx`, exibindo apenas a mensagem genérica `"Recurso Pro / Desbloqueie recursos avançados."` e o botão `"Entrar"`.
  - Não há explicação do benefício, demonstração visual, nem valores do plano Pro, prejudicando a conversão de investidores iniciantes e profissionais.
- **Mapeamento das 3 Opções de Preview (Levantamento Técnico & Esforço)**:
  - **Opção (A) — Mockup Estático com Card de Valor**: Exibe um mockup HD com overlay de vidro e bullets dos benefícios. Esforço: **BAIXO (1-2h)**. Zero risco de bug de API/dados.
  - **Opção (B) — Dados Reais do Usuário com Efeito Borrado (*Blurred Backdrop*)**: Renderiza a interface real com os dados do próprio usuário borrados ao fundo (`backdrop-blur-md opacity-40 pointer-events-none`) e modal central de conversão. Esforço: **MÉDIO (2-4h)**. Alto impacto visual ("Efeito Uau!").
  - **Opção (C) — Modo Demonstração Interativo (Dado Fictício de Exemplo)**: Renderiza a interface real interativa com dados fictícios de exemplo (ex: PETR4, VALE3, WEGE3, Apple, SCHD) permitindo navegar e testar estratégias. Esforço: **MÉDIO-ALTO (3-5h)**. Estratégia PLG de alta conversão.
- **Copy Existente nos Dicionários**:
  - Dicionários `dict.*.ts` possuem descrições de estratégias (`t.smartAllocation.strategyHints.*`) e títulos que podem ser reaproveitados em qualquer opção escolhida.
- **Status de Código**: Decisão final de Paulo: Nenhuma das opções de preview (A/B/C) será adotada. Em vez disso, todas as travas/paywalls foram desativadas globalmente (`DISABLE_PAYWALLS = true`).

---