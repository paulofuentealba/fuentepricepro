# Fuente Price Pro - Backlog V2 🚀

Este backlog contém as sugestões estratégicas levantadas pelo time de Produto (PM/PMM) durante a revisão final do MVP, visando o roadmap da Versão 2. Para facilitar a gestão e priorização, as 10 demandas originais foram consolidadas em 4 grandes Épicos (Pilares Estratégicos).

## Épico 1: Core de Investimentos e Automação (A Máquina)
Foco em automatizar a entrada de dados e expandir a capacidade matemática da plataforma.
- **Integração Open Finance (B3/Avenue) e Notas de Corretagem:** Sincronização automática da carteira e preços médios via APIs externas ou importação de notas de corretagem (PDF).
- **Eventos Corporativos Automatizados:** Processamento automático de desdobramentos (splits), agrupamentos e bonificações, mantendo o preço médio e histórico da carteira precisos sem intervenção manual do usuário.
- **Motor Multi-Moedas e Renda Fixa:** Suporte a ativos globais com cálculo de imposto retido na fonte (WHT) e inclusão de títulos de Renda Fixa (Tesouro, CDBs) que pagam cupons no fluxo de caixa.
- **Métricas Avançadas e Comparadores (Benchmarks BR):** Implementar TWR (Time-Weighted Return), IRR (Taxa Interna de Retorno), fórmulas de Preço Justo de Bazin/Graham, e um Screener comparativo contra índices de mercado (IBOV, CDI, S&P 500).

## Épico 2: Inteligência e Engajamento (O Cérebro)
Foco em retenção (MAU) e entrega de valor interpretativo para o usuário.
- **Assistente de IA (Insights Pessoais):** Agente LLM para ler a carteira e gerar insights acionáveis (ex: alertas de desbalanceamento setorial).
- **Alertas Dinâmicos e Notificações (Push/Email):** Motor de background para avisar quando um ativo entra na Margem de Segurança.
- **Módulo de IRPF:** Automação de cálculo de DARF e relatórios anuais de bens (dor crítica do investidor brasileiro).

## Épico 3: Monetização e Administração (O Negócio)
Foco em geração de receita, controle de acesso e métricas macro.
- **Controle Real de Planos (Free vs PRO):** Implementar lógica de permissões no Firestore e paywalls bloqueando recursos premium. Integração de checkout via Stripe na rota `/pricing`.
- **Painel Administrativo (`/admin`):** Dashboard restrito para visualizar cadastros, gerenciar *feature flags* e acompanhar métricas de uso sem depender do console do Firebase.

## Épico 4: Experiência, Design e Privacidade (O Usuário)
Foco em redução de atrito, imersão visual e segurança jurídica.
- **Otimização de Conversão e Onboarding (UX/UI):** Distinção clara entre free/pro usando cadeados/blur, CTAs bem direcionados e banners transparentes sobre a fonte de dados (ex: Yahoo Finance).
- **Onboarding Regulatório e Perfilamento (KYC/Suitability):** Coleta de dados avançados para conhecer o cliente, avaliar tolerância a risco (conservador vs arrojado) e sugerir estratégias de alocação de forma aderente às normas do mercado.
- **Conformidade Legal (LGPD & GDPR):** Adição de Termos de Uso/Privacidade no cadastro, Banner de Cookies, fluxo de "Direito ao Esquecimento" (Excluir Conta e limpar Firestore) e exportação de dados (Portabilidade).
- **Evolução UI/UX (Pro Terminal Concept):** Redesign conceitual em "Dark Mode + Glassmorphism" estilo terminal Bloomberg / Web3 para atrair o investidor hardcore.

---
*Documento consolidado gerado após a validação de sucesso do MVP. Pronto para entrar na esteira de Discovery e Delivery da Versão 2.*
