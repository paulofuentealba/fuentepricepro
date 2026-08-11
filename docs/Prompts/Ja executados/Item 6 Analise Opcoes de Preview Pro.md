# Item 6: Análise de Opções de Preview para Features Pro Antes do Gate

## 1. Contexto e Diagnóstico Atual

Atualmente, o acesso de usuários não-autenticados ou usuários do plano gratuito às telas de **Cash Flow** (`/app/cashflow`) e **Smart Allocation** (`/app/smartallocation`) é bloqueado de forma opaca pelo componente `LockedPanel.tsx`.

### Problema de UX / Conversão Identificado:
- **LockedPanel Atual**: Exibe uma mensagem genérica (`"Recurso Pro / Desbloqueie recursos avançados."`) acompanhada de um único botão de `"Entrar"`.
- **Falta de Clareza de Valor**:
  - O **investidor iniciante** não compreende o benefício prático do Calendário de Dividendos ou da Alocação Inteligente.
  - O **investidor profissional** não consegue avaliar a profundidade analítica nem os diferenciais antes de contratar o plano.
- **Falta de Transparência de Preço/Planos**: Não apresenta a proposta de valor, o preço do plano Pro nem o botão direto para a página de checkout/assinatura (`/settings`).

---

## 2. Localização dos Componentes e Estrutura de Arquivos

| Componente / Rota | Localização | Função Atual |
| :--- | :--- | :--- |
| **`LockedPanel.tsx`** | `src/components/ceiling/LockedPanel.tsx` | Componente de card desativado que renderiza o estado bloqueado genérico. |
| **`PaywallDialog.tsx`** | `src/components/ui/PaywallDialog.tsx` | Modal de paywall exibido ao tentar acionar ações restritas Pro no app. |
| **Rota Cash Flow** | `src/routes/app/cashflow.tsx` | Verifica `!user` e retorna `<LockedPanel />` sem renderizar a interface de calendário. |
| **Rota Smart Allocation** | `src/routes/app/smartallocation.tsx` | Verifica `!user` e retorna `<LockedPanel />` sem renderizar o gerador de aportes. |

---

## 3. Levantamento das 3 Abordagens de Preview (Esforço Técnico & Trade-offs)

> [!IMPORTANT]
> **Status**: Nenhuma das abordagens foi implementada em código. Aguardando a decisão de Paulo sobre qual opção adotar.

### 📷 Opção (A) — Screenshot / Mockup Estático com Card de Valor
- **Como Funciona**:
  - Substitui o `LockedPanel` simples por uma visualização estática em alta resolução (imagem HD ou estrutura de cards HTML estáticos desativados com overlay de vidro/glassmorphism) demonstrando a tela 100% populada.
  - Sobreposto ao mockup, exibe um painel lateral/central com os principais benefícios, prova social e botão proeminente de CTA `"Desbloquear Acesso Pro"`.
- **Esforço Técnico Estimado**: **BAIXO (1 - 2 horas)**
  - 1. Gerar/capturar os mockups visuais em HD do Cash Flow e Smart Allocation.
  - 2. Evoluir o `LockedPanel.tsx` para aceitar a propriedade `featureId: "cashflow" | "smartallocation"`.
  - 3. Estilizar a sobreposição de glassmorphism com bullets de benefícios e link de assinatura.
- **Trade-offs**:
  - ✅ **Vantagens**: Baixíssimo esforço, zero risco de falhas com APIs externas ou dados inconsistentes, 100% previsível.
  - ❌ **Desvantagens**: Experiência estática; o usuário não vê a inteligência operando sobre os dados da sua própria carteira.

---

### 🔍 Opção (B) — Dados Reais do Usuário com Efeito Borrado (*Blurred Backdrop*)
- **Como Funciona**:
  - Renderiza o componente real (`CashFlowCalendar` ou `SmartAllocation`) utilizando a Watchlist/Carteira real do usuário ao fundo.
  - Aplica uma camada de desfoque via CSS (`backdrop-blur-md opacity-40 pointer-events-none`) e posiciona um card flutuante de conversão no centro.
  - *Caso a carteira do usuário esteja vazia*, utiliza um dataset simulado de fundo para evitar um borrado sobre tela em branco.
- **Esforço Técnico Estimado**: **MÉDIO (2 - 4 horas)**
  - 1. Remover o retorno antecipado do `LockedPanel` em `cashflow.tsx` e `smartallocation.tsx`.
  - 2. Criar o wrapper `FeaturePreviewBlur.tsx` que aplica o filtro CSS e renderiza o modal de conversão centralizado.
  - 3. Tratar o fallback para usuários novos/sem ativos na watchlist.
- **Trade-offs**:
  - ✅ **Vantagens**: Alto impacto visual ("Efeito Uau!"); o usuário vê instantaneamente que o sistema já calculou os dividendos/aportes da sua própria carteira.
  - ❌ **Desvantagens**: Exige tratamento cuidadoso de fallback para carteiras vazias e garantia de que interações da interface fiquem bloqueadas.

---

### 🎮 Opção (C) — Mockup Interativo em "Modo Demonstração" (Dado Fictício de Exemplo)
- **Como Funciona**:
  - A tela é aberta em um **Modo Demonstração** totalmente interativo, populada com uma carteira modelo diversificada (ex: PETR4, VALE3, WEGE3, Apple, SCHD).
  - O usuário pode navegar entre os meses no Calendário de Dividendos, testar estratégias de alocação ("Efeito Bola de Neve", "Tapa-Buracos") e ver os números recalculando em tempo real.
  - Um banner no topo indica `"Modo Demonstração (Exemplo)"` e qualquer tentativa de salvar/aplicar a alocação dispara o `PaywallDialog` Pro.
- **Esforço Técnico Estimado**: **MÉDIO-ALTO (3 - 5 horas)**
  - 1. Criar a massa de dados fictícia enriquecida (`MOCK_PREVIEW_WATCHLIST`).
  - 2. Adaptar `CashFlowCalendar` e `SmartAllocation` para operarem com a flag `demoMode`.
  - 3. Bloquear persistência e ações definitivas com o `PaywallDialog`.
- **Trade-offs**:
  - ✅ **Vantagens**: Maior conversão esperada (estratégia Product-Led Growth - PLG); o usuário experimenta o produto real e sente o valor das estratégias antes de assinar.
  - ❌ **Desvantagens**: Maior esforço de implementação e necessidade de manter os dados de demonstração atualizados.

---

## 4. Mapeamento de Textos e Copys nos Dicionários (`dict.*.ts`)

Abaixo estão os textos já disponíveis no projeto e prontos para reaproveitamento nos componentes de preview:

### 4.1. Smart Allocation (`t.smartAllocation`)
- **Título**: `"Alocação Inteligente"`
- **Subtítulo**: `"Distribua seu capital disponível entre os ativos mais descontados da sua watchlist."`
- **Paywall Title**: `"Estratégias Avançadas Bloqueadas"`
- **Paywall Desc**: `"Usuários do plano gratuito podem usar apenas a estratégia padrão de 'Dividend Yield'. Assine o Pro para combinar múltiplas estratégias como Penalidade de Concentração Setorial, Subavaliação e Paridade de Risco!"`
- **Estratégias Disponíveis**:
  - **Renda Máxima**: *"Classifica pelo maior dividend yield. Ideal para maximizar renda atual."*
  - **Foco em Margem**: *"Classifica pelo maior desconto em relação ao preço teto. Ideal para margem de segurança."*
  - **Efeito Bola de Neve**: *"Prioriza ativos mais próximos de atingir o efeito bola de neve."*
  - **Tapa-Buracos**: *"Identifica e recomenda ativos que pagam dividendos nos meses em que sua carteira tem menor renda."*
  - **Defensiva**: *"Prioriza ativos de menor volatilidade com foco em preservação de capital."*

### 4.2. Cash Flow (`t.watchlist` & `t.cashFlow`)
- **Título**: `"Cash Flow / Fluxo de Caixa"`
- **Descrição Proposta para o Preview**:
  - *"Visualize a projeção mensal exata dos seus proventos para os próximos 12 meses. Identifique meses de vacância, acompanhe datas Com e garanta um fluxo de caixa previsível e recorrente."*

---

## 5. Comparativo de Decisão para Paulo

| Critério | Opção A (Screenshot) | Opção B (Dado Real Borrado) | Opção C (Modo Demo Interativo) |
| :--- | :---: | :---: | :---: |
| **Esforço de Dev** | 🟢 Baixo (1-2h) | 🟡 Médio (2-4h) | 🔴 Médio-Alto (3-5h) |
| **Impacto de Conversão** | 🟡 Moderado | 🟠 Alto | 🟢 Muito Alto |
| **Personalização** | 🔴 Nenhuma (Genérico) | 🟢 Total (Sua Carteira) | 🟡 Dados de Exemplo |
| **Risco de Bugs** | 🟢 Zero | 🟡 Baixo (tratar fallback) | 🟡 Baixo |

---

## 6. Próximos Passos
1. **Aguardar a escolha de Paulo** entre as opções **A**, **B** ou **C**.
2. Após a escolha, realizar a implementação da opção selecionada e submeter às 3 portas de verificação (`tsc`, `test`, `build`).
