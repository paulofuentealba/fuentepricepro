# Fuente Price Pro - Backlog V2 🚀

Este backlog contém as sugestões estratégicas levantadas pelo time de Produto (PM/PMM) durante a revisão final do MVP, visando o roadmap da Versão 2.

## 1. Open Finance / Integração com Corretoras (B3/Avenue)
- **Problema Atual:** Usuários com muitos ativos sofrem atrito ao ter que cadastrar e atualizar preços médios manualmente.
- **Solução:** Integrar a plataforma via APIs de Open Finance ou parceiros de dados para sincronizar a carteira (ativos e preço médio) automaticamente, garantindo que o "Yield on Cost" esteja sempre exato sem esforço manual.

## 2. Alertas Dinâmicos e Notificações (Push/Email)
- **Problema Atual:** O usuário precisa acessar ativamente a plataforma para checar se um ativo da sua Watchlist entrou na Margem de Segurança.
- **Solução:** Implementar um motor de background que envia notificações em tempo real. Exemplo: *"Seu ativo X caiu 3% e agora está abaixo do seu Preço Teto! Excelente margem de segurança."* Isso aumentará exponencialmente o MAU (Monthly Active Users).

## 3. Assistente de IA / Agentes (Insights Pessoais)
- **Problema Atual:** O usuário tem os dados visuais na tela (Smart Allocation, Radar), mas precisa tomar as decisões interpretando os gráficos sozinho.
- **Solução:** Implementar um Agente LLM que lê a carteira inteira do usuário, cruza com os dados de mercado e gera insights acionáveis em texto. Exemplo: *"Notei que você está com 40% de exposição no setor Elétrico, mas o setor Financeiro está apresentando oportunidades com Margem de Segurança superior a 15%. Que tal diversificar?"*

## 4. Painel Administrativo & Feature Management
- **Problema Atual:** Falta de visibilidade sobre o crescimento da base de usuários e controle centralizado do app para liberar atualizações.
- **Solução:** Criar uma rota restrita (`/admin`) acessível apenas por administradores para ver a listagem de usuários cadastrados, gerenciar níveis de acesso (roles), ativar/desativar funcionalidades globais (feature flags) e visualizar métricas macro de uso da plataforma sem acessar o console do Firebase.

## 5. Monetização: Controle Real de Planos (Free vs PRO)
- **Problema Atual:** Atualmente, todas as funcionalidades avançadas estão abertas e liberadas para demonstração no MVP (estado `isPro` fixo no código).
- **Solução:** Implementar a lógica real de permissões no Firestore, atrelando o `tier` ao documento do usuário. Desenvolver a página oficial `/pricing` com checkout via Stripe e aplicar paywalls funcionais trancando os recursos premium (Efeito Bola de Neve, Estratégias Avançadas de Alocação, etc.) para usuários gratuitos.

## 6. Evolução de UI/UX: Pro Terminal Concept
- **Objetivo Futuro:** A landing page atual é "Clean Fintech", mas no futuro podemos querer explorar um visual voltado para o investidor "hardcore".
- **Solução:** Executar um redesign conceitual em "Dark Mode + Glassmorphism", com tons de neon e layout semelhante a um Terminal Bloomberg moderno misturado com a estética Web3, atualizando as seções secundárias da página inicial.

## 7. Otimização de Conversão e Onboarding (UX/UI)
- **Problema Atual:** A Landing Page mistura demonstrações gratuitas com features PRO sem distinção visual clara (botões duplicados e cards confusos), não revela a fonte de dados das cotações (gerando desconfiança) e não avisa o usuário "visitante" de que seus dados estão sendo salvos apenas localmente.
- **Solução (Ações Rápidas de UX):**
  - Adicionar selos visuais claros (Cadeado/PRO) ou efeito de desfoque (blur) nos componentes Premium.
  - Diferenciar o destino dos CTAs: "Start Building" direciona para cadastro, "Upgrade" direciona para checkout ou tabela de preços.
  - Adicionar um banner transparente de fonte de dados no rodapé: *"Cotações com atraso via API (ex: Yahoo Finance)"*.
  - Mostrar um *Sticky Banner* para visitantes no App alertando que os dados são locais e incentivando o login para sincronização na nuvem.

## 8. Ferramentas de Varejo e Benchmarks BR
- **Problema Atual:** Falta de ferramentas consagradas no mercado local (como nas plataformas Status Invest e Investidor 10), o que pode afastar o investidor pessoa física que busca centralizar sua gestão.
- **Solução:**
  - **Módulo de IRPF:** Automatizar a organização para declaração de bens e cálculo de DARF.
  - **Dashboard de Dividendos e Calendário:** Além do Preço Teto, exibir de forma visual o histórico e a projeção de dividendos (fluxo de caixa passado e futuro confirmado).
  - **Calculadoras de Preço Justo:** Implementar as fórmulas clássicas de Décio Bazin e Benjamin Graham.
  - **Comparador Avançado (Screener):** Ferramenta para comparar indicadores (P/L, PVP, DY) entre ativos lado a lado.

## 9. Conformidade Legal e Privacidade (LGPD & GDPR)
- **Problema Atual:** O sistema atual carece de mecanismos transparentes de consentimento e gestão de dados, apresentando riscos legais.
- **Solução:**
  - **Termos de Uso e Privacidade:** Adicionar checkbox obrigatório no momento do cadastro.
  - **Banner de Consentimento:** Informar os usuários sobre o uso de Cookies e LocalStorage.
  - **Direito ao Esquecimento:** Criar um fluxo de "Excluir Conta" que apague os dados do Auth e acione uma Cloud Function para varrer e limpar o Firestore do usuário.
  - **Portabilidade de Dados:** Botão de exportação da carteira em JSON/CSV.

---
*Documento consolidado gerado após a validação de sucesso do MVP. Pronto para entrar na esteira de Discovery e Delivery da Versão 2.*
