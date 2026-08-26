# Protótipo Fuente Price Pro v6 — Alvo Visual Canônico

> [!IMPORTANT]
> **AVISO DE ARTEFATO DE REFERÊNCIA DE DESIGN (NÃO É CÓDIGO DE PRODUÇÃO)**
>
> Este diretório contém o arquivo `prototipo-v6.html`, que é o **ALVO VISUAL CANÔNICO APROVADO** para o redesign Fuente Price Pro v4/v6.
>
> - **NÃO** utilize este arquivo diretamente em runtime ou em código de produção.
> - **NÃO** copie o CSS bruto ou estruturas inline diretamente (a aplicação utiliza Tailwind v4 + tokens de design configurados a partir do Prompt 128).
> - **INSTRUÇÃO OBRIGATÓRIA**: Ao implementar qualquer tela ou componente React no projeto, abra `docs/design/v6/prototipo-v6.html` no navegador e reproduza rigorosamente a **estrutura, hierarquia visual, micro-interações, densidade de dados e textos/copy** descritos no protótipo.

---

## Índice das Superfícies Contidas no Protótipo

1. **Acesso e Descoberta**
   - **Landing Page**: Apresentação institucional, proposição de valor focada em renda passiva e inteligência de proventos.
   - **Login & Autenticação**: Fluxo de entrada elegante com suporte a credenciais e Google Auth.
   - **Onboarding (4 passos)**:
     - *Passo 1*: Perfil do investidor e estágio financeiro.
     - *Passo 2*: Tolerância a risco ("como você reage a uma queda de 20%?").
     - *Passo 3*: Metas de alocação patrimonial por classe.
     - *Passo 4*: Yield-alvo configurável por classe de ativo e aceite de termos.

2. **Decidir (Verbos de Ação)**
   - **Reinvestir**: Inteligência de reinvestimento de proventos acumulados (com valor disponível, abas de estratégia: Acelerar Bola de Neve, Corrigir Desvio, Reforçar Quem Pagou, e exportação em CSV).
   - **Plano de Aporte**: Distribuição de novos recursos mensais baseada nas metas e desvios de alocação.
   - **Retirar**: Simulação e estratégia de desinvestimento ou usufruto de renda com impacto tributário minimizado.

3. **Acompanhar (Monitoramento e Histórico)**
   - **O que mudou**: Linha do tempo de fundamentos comparando o momento da compra com o cenário atual.
   - **Renda Garantida**: Projeção de fluxo de proventos contratados/anunciados e histórico consolidado.
   - **Realidade Fiscal**: Visão tributária de DARF, isenções, JCP retido e compensações de prejuízo.

4. **Analisar (Inteligência de Carteira)**
   - **Minha Carteira**: Visão consolidada de posições, rentabilidade, proventos, preço médio e margem de segurança.
   - **Adicionar Ativo**: Modal simplificado e direto de inclusão manual com busca integrada.
   - **Importar Nota**: Ingestão dinâmica de notas de corretagem (PDF/CSV/XLSX) de 14+ corretoras.
   - **Meses Secos**: Diagnóstico de sazonalidade e gaps de proventos ao longo do ano civil.
   - **Explorar Ativos (5 abas)**:
     - *Aba 1*: Screener (Varredura de mercado)
     - *Aba 2*: Comparador de Ativos
     - *Aba 3*: Radar de Risco
     - *Aba 4*: Radar Global (USD / Câmbio)
     - *Aba 5*: Bola de Neve (Simulador de reinvestimento)
   - **Auditoria**: Auditoria de decisões e histórico imutável de teses de investimento.

5. **Configurações e Gestão**
   - **Perfil do Usuário (4 abas)**:
     - *Aba 1*: Dados da Conta e Segurança
     - *Aba 2*: Metas e Critérios de Alocação
     - *Aba 3*: Preferências e Moeda de Exibição
     - *Aba 4*: Privacidade e LGPD (Exportar dados / Excluir conta)
   - **Painel Administrativo (4 abas)**:
     - *Aba 1*: Usuários e Assinaturas
     - *Aba 2*: Ingestion Log e Saúde dos Scrapers
     - *Aba 3*: Feature Gates e Lançamento Gradual
     - *Aba 4*: Custos de Cloud e Infraestrutura
