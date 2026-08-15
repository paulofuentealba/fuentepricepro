# Plano de Implementação: Prompts 113 e 114

## 1. Declaração de Roles de Governança (`AGENTS.md` — Regra 9)

| Role | Usado? | Motivo |
| :--- | :---: | :--- |
| **fuente-architecture-review** | ✅ | Avaliação do pipeline de dados de proventos (`cashflow.ts`, `realizedIncome.ts`) e isolamento de segurança do modo demo. |
| **fuente-solution-architect** | ✅ | Desenho da arquitetura de dados efêmera vs. Firestore para a Carteira de Demonstração (Prompt 114). |
| **fuente-business-architect** | ✅ | Semântica de proventos por competência (data-com) vs. caixa (data de pagamento) no Cash Flow (Prompt 113). |
| **fuente-product-manager** | ✅ | Apresentação das 3 opções de produto do Prompt 113 e estimativa de faseamento do Prompt 114. |
| **fuente-ux-designer** | ✅ | Design do gráfico de Cash Flow (barras listradas de `announcedAmount`) e do banner persistente do Modo Demo. |
| **fuente-investidor-profissional** | ✅ | Seleção da cesta de ativos da carteira demo (FIIs, REITs, Ações BR, Stocks US, ETFs e Yield Traps). |
| **fuente-investidor-iniciante** | ✅ | Clareza visual nas legendas de fluxo de caixa e facilidade de entrada/saída do modo demo. |
| **fuente-advogado-lgpd-gdpr** | ✅ | Garantia de zero PII na carteira demo e estrita separação de dados. |
| **fuente-product-marketing** | ✅ | Posicionamento da Carteira de Exemplo como ferramenta de conversão e onboarding na Landing Page e no App. |

---

## 2. PROMPT 113 — Cash Flow: Semântica de "Confirmed/Paid" em Meses Futuros

### 2.1 Causa Raiz Técnica Confirmada na Investigação
1. **O que acontece hoje**:
   - `realizedAmount` (em [`cashflow.ts:243-255`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/cashflow.ts#L243-L255)) agrega os eventos de [`calculateRealizedIncome`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/realizedIncome.ts).
   - Quando um ativo possui `exDate` no passado (usuário tinha custódia na data-com), mas `paymentDate` em mês futuro (ex: Novembro ou Dezembro/2026), o evento é alocado no bucket do mês de pagamento.
   - Em [`CashFlowChart.tsx:65`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/cashflow/CashFlowChart.tsx#L65), `confirmedAmount` recebe `realizedAmount`, e o Recharts renderiza a barra sólida verde (`var(--realized)`) com a legenda "Confirmado / Pago", gerando a falsa impressão de que o dinheiro já entrou no caixa em um mês que sequer começou.
2. **Achado Arquitetural Relevante**:
   - A estrutura do `MonthBucket` já possui o campo `announcedAmount` ([`cashflow.ts:228`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/cashflow.ts#L228)), que estava mantido em `0`.
   - O componente [`CashFlowChart.tsx:350-365`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/cashflow/CashFlowChart.tsx#L350-L365) **já possui a Bar e o padrão SVG listrado (`#striped`) implementados e prontos no código**, confirmando que a intenção original do design previa 3 estados (Pago, Declarado/Agendado e Projetado).

### 2.2 Decisão de Produto Requerida de Paulo

Apresentamos as 3 opções técnicas para sua escolha explícita:

| Opção | Comportamento no Cash Flow | Tratamento Visual | Prós | Contras |
| :--- | :--- | :--- | :--- | :--- |
| **Opção A (Recomendada)** | Popula `announcedAmount` para proventos declarados futuros (`isPast === false` ou `paymentDate > hoje`). `realizedAmount` ganha gate `isPast` e representa estritamente o que já caiu na conta. | Usa a barra listrada já existente no SVG (`#striped`), adicionando a legenda "Declarado" (ou "Agendado") ao lado de "Pago" e "Projetado". | 100% fiel à contabilidade: o usuário vê exatamente o que já está garantido para os próximos meses sem confundir com dinheiro já recebido. | Adiciona uma 3ª cor/padrão à legenda do gráfico. |
| **Opção B** | Mantém 2 categorias, mas altera o rótulo da legenda de "Pago / Confirmado" para "Confirmado (Recebido ou Declarado)", adicionando tooltip explicativo. | Barra sólida verde em meses passados e futuros declarados. | Não mexe na estrutura das barras. | Continua mostrando verde sólido em meses futuros, o que pode continuar gerando estranheza visual no primeiro olhar. |
| **Opção C** | Aplica gate `isPast` em `realizedAmount`. Meses futuros mostram `confirmedAmount = 0` e 100% de projeção estatística. | Apenas "Pago" no passado e "Projetado" no futuro. | Implementação de 1 linha. | Descarta dado real: o usuário perde a informação de proventos que a empresa já anunciou para o mês seguinte. |

---

## 3. PROMPT 114 (Discovery) — Carteira de Exemplo / Modo Demonstração

### 3.1 Onde vive o dado da carteira de exemplo?

#### Avaliação das Opções:
1. **Conta Demo no Firestore (`demo@fuentepricepro.com`)**:
   - *Risco*: Requer regras de segurança específicas, gera leituras desnecessárias no Firestore por visitantes anônimos e introduz dependência de rede para uma demonstração.
2. **Dado Estático Fixo no Client (JSON congelado)**:
   - *Risco*: Perde o cálculo ao vivo de cotações, câmbio USD/BRL e Fuente Consensus, violando a Regra 4 de SSOT (`getAssetValuation`).
3. **Seed Estático com Hidratação Dinâmica e Estado Efêmero em Memória (Recomendada)**:
   - **Como funciona**:
     - O repositório contém uma lista canônica de ativos e transações fictícias (`DEMO_PORTFOLIO_ITEMS` e `DEMO_PORTFOLIO_TRANSACTIONS`).
     - Ao ativar o Modo Demo, o hook `useDemoMode()` injeta esses itens nas queries existentes (`useValuedPortfolio`, `useTransactions`).
     - As cotações, dividendos históricos e indicadores são buscados **ao vivo** pelas mesmas queries (`brapi`, `yahoo`, `exchangeRateQueryOptions`).
     - Toda a lógica de Bazin, Graham, Gordon, Rebalanceamento, Risk Radar e Snowball executa o pipeline real da aplicação.
     - Nenhuma chamada de escrita alcança o Firestore.

### 3.2 Onde o botão aparece e fluxo de entrada/saída?

1. **Pontos de Entrada**:
   - **Landing Page (`/`)**: Botão secundário "Ver Carteira de Exemplo" no Hero Canvas ao lado de "Começar Gratuitamente".
   - **App Principal (`/app`)**: No empty state da Watchlist quando a carteira do usuário tiver 0 ativos:
     ```tsx
     <EmptyWatchlistState onExploreDemo={() => setDemoMode(true)} />
     ```
2. **Experiência em Modo Demo**:
   - **Banner Fixo Superior** (laranja/primário elegante, fixo no topo):
     > 💡 **Você está visualizando a Carteira de Demonstração com dados de mercado reais.**  
     > `[Sair da Demonstração]` ou `[Criar Minha Carteira Gratuitamente]`
   - O estado fica salvo em `sessionStorage` (`fpp_demo_mode: "true"`).
3. **Fluxo de Saída**:
   - Clicar em "Sair da Demonstração" remove a flag e restaura instantaneamente a carteira real do usuário logado (ou a tela inicial se anônimo).

### 3.3 Composição Proposta para a Carteira de Exemplo

Para demonstrar 100% dos recursos do Fuente Price Pro, a carteira modelo conterá **10 ativos balanceados**:

| Ticker | Tipo | Moeda | Papel na Demonstração |
| :--- | :---: | :---: | :--- |
| **BBSE3** | Ação BR | BRL | Demonstração clássica do Método Bazin / Preço Teto com alta margem de segurança. |
| **VALE3** | Ação BR | BRL | Ciclo de commodities, proventos semestrais e Shareholder Yield. |
| **TAEE11** | Ação BR | BRL | Histórico de dividendos resilientes para o Simulador de Efeito Bola de Neve (Snowball). |
| **HGLG11** | FII | BRL | FII de Tijolo (Logística) exercitando o consenso mediano e pagamentos mensais. |
| **MXRF11** | FII | BRL | FII de Papel com alto dividend yield para o Radar de Proventos. |
| **KNIP11** | FII | BRL | FII indexado ao IPCA para cálculo de rendimento real. |
| **O** | REIT US | USD | Realty Income com proventos mensais em USD, exercitando a conversão cambial. |
| **SCHD** | ETF US | USD | Dividend ETF americano exercitando a classificação de ETFs e Radar Global. |
| **AAPL** | Stock US | USD | Stock americano exercitando o cálculo do Piotroski F-Score via SEC EDGAR. |
| **IRBR3** *(ou ativo volátil)* | Ação BR | BRL | Posição com métricas de alerta para demonstrar as flags do **Risk Radar** (alerta de yield insustentável). |

### 3.4 Isolamento de Segurança e LGPD

- **Zero PII**: Nenhum dado pessoal, número de documento, saldo real ou conta bancária existe no seed.
- **Zero Mutações**: Mutações de escrita (`addAsset`, `addTransaction`, etc.) são interceptadas ou desabilitadas em modo demo, exibindo um toast explicativo: *"Ações de gravação estão desabilitadas na carteira de demonstração."*
- **Conformidade LGPD**: Art. 6º (Minimização) e Art. 18 (Direitos do Titular) permanecem 100% resguardados.

### 3.5 Faseamento Proposto (Estimativa de 3 Prompts)

- **Prompt Demo 1 (Fundação & Seed)**: Criação de `src/lib/demoPortfolio.ts` e do hook `useDemoMode` integrado ao `sessionStorage`.
- **Prompt Demo 2 (Integração de UI & Banner)**: Criação do `<DemoModeBanner />`, chaveamento transparente em `useValuedPortfolio` e bloqueio de writes em demo.
- **Prompt Demo 3 (Entry Points & Polish)**: Botões na Landing Page e no Empty State da Watchlist, com validação visual e testes unitários.

---

## 4. Pontos de Atenção & Decisões de Arquitetura (Formato Risco → Decisão)

1. **Risco**: Implementar a Opção A no Prompt 113 alterando a semântica sem o aval de Paulo.  
   **Decisão**: Conforme exigido no Prompt 113, **nenhum código será implementado até Paulo confirmar formalmente a opção desejada (Opção A, B ou C)**.

2. **Risco**: Carteira Demo usar mock estático e quebrar a Regra 4 de SSOT de valuation.  
   **Decisão**: O seed conterá apenas a lista de tickers e quantidade de cotas. Todas as cotações, dividendos e cálculos de preço teto passarão pelas APIs reais (`brapi`/`yahoo`) e pelas funções de domínio (`getAssetValuation`).

3. **Risco**: Modo Demo persistir no Firestore por engano.  
   **Decisão**: O estado de demonstração viverá exclusivamente em memória do cliente (`sessionStorage`), tornando impossível qualquer poluição do Firestore.

---

## 5. Próximos Passos
1. **Aguardar decisão de Paulo sobre a opção do Prompt 113 (A, B ou C)**.
2. **Aguardar feedback de Paulo sobre as recomendações do Discovery do Prompt 114**.
