# Relatório de Auditoria de Reuso Pré-v4 — Fuente Price Pro
**Documento de Diagnóstico Arquitetural (Sem Código) — Item 0.5**
**Referência Canônica:** `docs/design/v6/prototipo-v6.html` (`e0747f0`)
**Data:** 25 de Agosto de 2026

---

## 1. Metas de Alocação

### 1.1 Shape dos Targets e Persistência
- **Shape (`AssetType`)**: Definido como `Record<AssetType, number>` cobrindo explicitamente as 8 classes do SSOT:
  `STOCK_BR`, `STOCK_US`, `FII`, `REIT`, `ETF`, `FII_INFRA`, `FIAGRO`, `FIXED_INCOME`.
- **Persistência**:
  - **Usuários Autenticados (Cloud)**: Documento Firestore `users/{userId}`, campo `settings.smartAllocationTargets` (gerenciado pelo hook `useUserSettings.ts`).
  - **Modo Visitante (Guest Mode)**: Chave `localStorage['ceilingPricePro.settings.v1']`.
- **Validação de Soma**:
  - No componente `TargetAllocationPanel.tsx`: o total é monitorado via `total = sum(targets)`. Exibe indicador visual em verde (`text-success`) quando `total === 100`, alerta vermelho (`text-danger`) quando `total > 100`, e mensagem de aviso `targetTotalIdeal` caso `total !== 100`.
  - No cálculo algorítmico (`suggestedAllocation.ts`): a função `computeSuggestedAllocation` aplica o **Método dos Maiores Restos (Hare-Niemeyer Algorithm)**, garantindo que a sugestão somará sempre **exatamente 100%** de forma determinística e sem erros de arredondamento.

### 1.2 Funcionamento de `PROFILE_BASE_ALLOCATION` e `STRATEGY_BIAS_MULTIPLIERS`
- **`PROFILE_BASE_ALLOCATION`**: Matriz de 6 perfis derivados de `tier` (conservador, moderado, agressivo) e `sublabel` (renda, valor/crescimento):
  - `conservative_income`, `conservative_growth`, `moderate_income`, `moderate_growth`, `aggressive_income`, `aggressive_growth`.
  - Cada template possui percentuais pré-calibrados somando exatamente 100%.
- **`STRATEGY_BIAS_MULTIPLIERS`**: Multiplicadores de peso por classe para cada estratégia ativa (`yield`, `snowball`, `defensive`, `gapFiller`, `margin`):
  - Exemplo: Estratégia `yield` multiplica FII por `1.3`, FIAGRO por `1.3`, FII_INFRA por `1.2`, e reduz FIXED_INCOME para `0.7`.
  - Estratégia `margin` computa multiplicadores dinâmicos via `computeMarginBiasMultipliers(items)` baseando-se na margem de segurança média de cada classe na watchlist.
  - Ao final, os pesos ponderados `base * bias` são normalizados e distribuídos em números inteiros somando 100%.

### 1.3 Extensão para Yield-Alvo por Classe
- **Dá para estender?** **SIM, perfeitamente.**
- **O que muda na arquitetura:**
  1. **Schema de Configurações (`UserSettings`)**: Adicionar `classTargetYields?: Partial<Record<AssetType, number>>` em `useUserSettings.ts`.
  2. **Hierarquia de Resolução de Yield**:
     - 1º Nível (Específico do Ativo): `item.targetYield` manual (se customizado pelo usuário no ativo).
     - 2º Nível (Classe do Ativo): `classTargetYields[item.type]` (ex: FIIs = 8.5%, Ações BR = 6.0%, Stocks = 4.0%).
     - 3º Nível (Global / Fallback): `settings.targetYield` global (default 6.0%).
  3. **Superfícies de UI**:
     - Adicionar inputs/sliders de yield-alvo por classe no Passo 4 do Onboarding e na aba de Configurações.

---

## 2. Disclaimer Regulatório

### 2.1 Estado Atual de `RegulatoryDisclaimerBanner.tsx`
- **Props**: Atualmente recebe `0` props (componente sem estado interno que consome `useLocation` e `useI18n`).
- **Onde é Usado**: Renderizado globalmente no layout autenticado `src/routes/app.tsx` como rodapé persistente para todas as rotas `/app/*` (exceto `/app/docs`).
- **Texto Atual**: Echo compacto da cláusula 3 dos Termos de Uso (`t.regulatoryDisclaimer.message`), informando que os cálculos e projeções não constituem recomendação ou consultoria de investimentos (CVM).

### 2.2 Suporte a Variantes e Aceite Versionado
- **Suporta variantes `'calculation'` / `'tax'` / `'full'`?**
  - **NÃO no momento.** Hoje possui apenas uma renderização única global.
  - *Extensão necessária para v4*: Adicionar prop opcional `variant?: 'compact' | 'calculation' | 'tax' | 'full'` e registrar as respectivas strings no dicionário i18n (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`).
- **Há registro de aceite versionado?**
  - **NÃO para o disclaimer específico.** O aceite geral existe apenas nos Termos de Uso (`/terms`).
  - *Extensão necessária para v4*: Gravar no Firestore (`users/{userId}`) o campo `disclaimerAcceptedVersion: "v1"` e `disclaimerAcceptedAt: timestamp` ao concluir o Onboarding ou ao aceitar os termos na primeira execução.

---

## 3. Smart Allocation vs. Plano de Aporte

### 3.1 O que `SmartAllocation.tsx` já faz
- Entrada de capital financeiro e seleção de moeda (`BRL` / `USD`).
- Seleção de estratégias múltiplas (`yield`, `snowball`, `defensive`, `gapFiller`, `margin`).
- Integração com o Perfil do Investidor e cálculo de metas sugeridas via `computeSuggestedAllocation`.
- Painel de ajuste fino manual de metas percentuais por classe com verificação de 100%.
- Teto de concentração máxima por ativo (`maxConcentrationPerAsset`).
- Motor de otimização inteira de cotas (`computeSmartAllocation` em `src/lib/allocation.ts`):
  - Ranqueamento dos ativos por pontuação ponderada.
  - Filtro estrito de preço teto e margem de segurança.
  - Alocação gulosa de cotas inteiras respeitando os limites de capital e concentração.
  - Gráfico comparativo de distribuição patrimonial Antes vs. Depois (`Recharts`).
  - Cards de recomendação de compra com custo e acréscimo de renda passiva anual (`AssetCard`).

### 3.2 Sobreposição com o "Plano de Aporte" do Protótipo v6
- **Sobreposição Real**: **~90% da lógica matemática e algorítmica já existe e está validada.**
- **Diferenças que o "Plano de Aporte" do protótipo v6 introduz**:
  1. **Tese Narrativa por Ativo (AskEngine)**: Exibir o motivo da seleção ("Por que este ativo foi escolhido?") com base no ranking de fundamentos.
  2. **Modo de Reinvestimento Explícito**: Opção visual de reinvestir proventos acumulados, aportar dinheiro novo ou combinar ambos.
  3. **Agrupamento Visual por Classe**: Exibição dos cards agrupados por classe de ativo com barras de progresso em direção à meta da classe.
  4. **Fluxo de Checklist e Execução**: Botão para marcar compras como realizadas gerando automaticamente o `ThesisSnapshot` (implementado no Prompt 127).
  5. **Exportação**: Botão para exportar o plano em CSV.

---

## 4. Proventos e Reinvestimento

### 4.1 Diagnóstico de `realizedIncome.ts` e `useRealizedIncomeSummary.ts`
- O motor `calculateRealizedIncome` cruza as transações do usuário com os eventos de proventos dos ativos:
  - Reconstitui a posição em cada `Data-Com` (ex-date).
  - Calcula valores brutos e líquidos com retenção de IR (15% JCP, 30% US).
  - Determina se o provento já foi pago (`isPaid`) ou se está apenas anunciado (`announced`).
- O resumo `computeRealizedIncomeSummary` fornece: `currentMonth`, `currentYear`, `allTimeTotal`, `announcedTotal`, `dividendTotal`, `jcpTotal`.

### 4.2 Dá para saber quanto foi recebido e AINDA NÃO reinvestido?
- **RESPOSTA DIRETA: NÃO.**
- **Por que não?**
  - O aplicativo não é uma conta corrente com saldo de caixa livre (`cash balance`). Ele registra compras e vendas, mas não vincula transações a uma "fonte de recursos" (`fundingSource: 'dividends' | 'new_capital'`).
  - Uma compra de R$ 5.000,00 pode ter sido feita com salário novo ou com dividendos recebidos no mês — o banco de dados não faz essa distinção.
- **O que falta para suportar no motor de decisão (AskEngine / Plano de Aporte):**
  - Adicionar no cálculo do plano um parâmetro `availableDividendCash`:
    - Sugestão automática: valor recebido no mês corrente (`summary.currentMonth`) ou soma dos últimos proventos recebidos.
    - Permissão para o usuário ajustar o valor livremente no modal/tela do plano.

---

## 5. Mapeamento de Regras Fiscais Espalhadas no Código

Mapeamento completo obtido via varredura no diretório `src/`:

| Arquivo | Linha(s) | Termo / Regra | O que faz |
|---|---|---|---|
| `src/lib/calculations.ts` | L59 | `US_DIVIDEND_TAX_RATE = 0.3` | Define constante de 30% de retenção na fonte sobre dividendos e REITs americanos para investidores não-residentes nos EUA. |
| `src/lib/calculations.ts` | L61 | `JCP_TAX_RATE = 0.15` | Define constante de 15% de retenção na fonte sobre Juros sobre Capital Próprio (JCP) no Brasil. |
| `src/lib/calculations.ts` | L63-67 | `isUsAsset(type, currency)` | Determina se o ativo é sujeito à legislação fiscal americana (STOCK_US, REIT, ETF em USD). |
| `src/lib/calculations.ts` | L69-78 | `dividendTaxRate(...)` | SSOT para alíquota de imposto: retorna `customTaxRate` (se definido), `15%` se `isJCP`, `30%` se ativo US, ou `0%` para ações BR e FIIs. |
| `src/lib/calculations.ts` | L81-89 | `netAfterTax(...)` | Aplica o desconto do imposto retido sobre o dividendo bruto: `gross * (1 - rate)`. |
| `src/lib/calculations.ts` | L456-458 | `isJCP` / `netAvgDividend` | Deduz 15% de IR no cálculo do Preço Teto Bazin para proventos declarados como JCP em Ações BR. |
| `src/lib/calculations.ts` | L686-687, L1022-1023 | `withholdingTax` | Exibe nos cards de auditoria e premissas a nota explicativa de 30% de imposto retido nos EUA. |
| `src/lib/realizedIncome.ts` | L8, L35-46 | `TaxType` / `getTaxType` | Classifica cada provento recebido nas categorias fiscais: `"dividend"`, `"jcp"`, `"rendimento_fii"`, `"us_dividend"`. |
| `src/lib/realizedIncome.ts` | L160-167 | `netAfterTax(...)` | Deduz impostos retidos individualmente por evento no cálculo do extrato de proventos realizados. |
| `src/lib/api/brapi.server.ts` | L108 | `isJCP` | Detecta se o dividendo retornado pela Brapi é JCP via label contendo `"JCP"`. |
| `src/lib/api/dadosDeMercadoScraper.server.ts` | L160 | `isJCP` | Identifica eventos de JCP no scraper de Dados de Mercado. |
| `src/lib/api/hgBrasil.server.ts` | L6 | `type: "JCP"` | Mapeia eventos fiscais originados do provedor HG Brasil. |
| `src/lib/csv.ts` | L243 | `customTaxRate` / `imposto` | Reconhece colunas de alíquota customizada de imposto em imports de CSV. |
| `src/lib/i18n/dict.ptBR.ts` | L100, L255, L1001 | `isenção`, `isento`, `JCP 15%`, `30% EUA` | Textos explicativos para o investidor sobre a isenção de dividendos BR e tributação retida na fonte de JCP e dividendos US. |

*Nota sobre Isenção de R$ 20.000,00*: Não foi encontrada lógica de imposto sobre ganho de capital em alienação de ações (venda < 20k no mês). Atualmente o sistema calcula tributação exclusivamente sobre proventos (fluxo de renda).

---

## 6. Calendário e Sazonalidade

### 6.1 Diagnóstico de Módulos de Sazonalidade
- `dividendHeatmap.ts`:
  - Constrói a matriz `Ano x Mês` com montante financeiro e contagem de pagamentos.
  - Calcula a **taxa de recorrência histórica por mês** (`recurrenceByMonth[m].recurrencePct`), indicando a probabilidade de cada mês receber proventos com base nos últimos anos.
- `cashflow.ts` & `CashFlowCalendar.tsx`:
  - Monta o grid mensal e anual consolidado da carteira, somando os fluxos recebidos e projetados.
- `fiiPaymentRules.ts`:
  - Mapeia regras primárias de liquidação para FIIs (ex: 10º dia útil via calendário bancário da B3).

### 6.2 Respostas sobre Derivações
- **Dá para derivar "meses secos"?**
  - **SIM.** Analisando a matriz de `CashFlowCalendar` ou o `recurrenceByMonth` do `dividendHeatmap`. Meses com `totalAmount === 0` ou `recurrencePct < 30%` são identificados diretamente como "meses secos" na carteira do investidor.
- **Dá para derivar "dividendos por ano"?**
  - **SIM.** A função `groupRealizedIncomeByMonth` e a matriz de `computeDividendHeatmap` já agrupam a soma total dos proventos por ano (`years` e `cellsByYear[year]`), e `computeRealizedIncomeSummary` fornece `currentYear` e `allTimeTotal`.

---

## 7. Componentes Reutilizáveis

Auditoria dos componentes em `src/components/shared` e `src/components/ui`:

| Componente | Localização | Estado Atual / Diagnóstico | Ação na v4 |
|---|---|---|---|
| **`MetricBox`** | `components/shared/MetricBox.tsx` | Renderiza card de métrica com valor, label, ícone, badge e tooltip. Totalmente desacoplado e responsivo. | **Serve como está.** Reusar nos headers das telas Decidir e Acompanhar. |
| **`StatusBadge`** | `components/shared/StatusBadge.tsx` | Badge para status com variantes `success`, `warning`, `danger`, `neutral`. Suporta dot indicador. | **Serve como está.** Reusar nos status de recomendação e segurança. |
| **`AssetCard`** | `components/shared/AssetCard.tsx` | Card complexo com variantes `watchlist`, `allocation`, `compact`. Exibe ticker, nome, preço, dividendos, margem e ações. | **Precisa de extensão.** Adicionar variante `decision` / `plan` para exibir tese de compra do AskEngine e checklist de execução. |
| **`ResultSkeleton`** | `components/ceiling/ResultSkeleton.tsx` | Skeleton animado de carregamento para cards de resultado e screener. | **Serve como está.** Reusar em estados assíncronos das novas telas. |
| **`TickerSearchField`** | `components/shared/TickerSearchField.tsx` | Campo de busca de ativos com autocomplete, debounce, classificação automática e validação de ticker. | **Serve como está.** Reusar em modais e seleção de ativos. |
| **`BlurredPreviewOverlay`** | `components/ceiling/BlurredPreviewOverlay.tsx` | Overlay de blur com cadeado para proteger telas Pro em contas Free. | **Serve como está.** Reusar em recursos avançados de decisão. |
| **`LockedPanel` / `PaywallDialog`** | `components/ui/PaywallDialog.tsx` | Modal de conversão para assinatura Pro com explicação de benefícios. | **Serve como está.** Reusar nos gatilhos de paywall da v4. |
| **`SuccessIconBox`** | `components/shared/SuccessIconBox.tsx` | Container arredondado com fundo suave para ícones de status positivo. | **Serve como está.** Reusar em cards de proventos e conquistas. |
| **`CurrencyToggle`** | `components/ui/CurrencyToggle.tsx` | Botão alternador de moeda BRL/USD com flags e persistência. | **Serve como está.** Reusar nas telas de Decisão e Carteira. |
| **`AnimatedNumber`** | `components/ui/AnimatedNumber.tsx` | Transição numérica fluida para contadores de renda e patrimônio. | **Serve como está.** Reusar nos KPIs de topo. |

---

## 8. Navegação e Estrutura de Telas

### 8.1 Estrutura Atual
- **Desktop (`Sidebar.tsx`)**:
  - Lista linear de 10 abas: `home` (`/app/`), `myportfolio` (`/app/myportfolio`), `screener` (`/app/screener`), `comparator` (`/app/comparator`), `riskradar` (`/app/riskradar`), `globalradar` (`/app/globalradar`), `cashflow` (`/app/cashflow`), `smartallocation` (`/app/smartallocation`), `snowballeffectsimulator` (`/app/snowballeffectsimulator`), `wiki` (`/app/docs`).
- **Mobile (`MobileBottomNav.tsx`)**:
  - Barra inferior com 6 abas horizontais roláveis (`screener`, `myportfolio`, `globalradar`, `cashflow`, `smartallocation`, `snowballeffectsimulator`).

### 8.2 Chaves i18n de Navegação Existentes
- `t.tabs.financialIndependence` ("Horizonte" / "Independência Financeira")
- `t.tabs.portfolio` ("Minha Carteira")
- `t.tabs.screener` ("Calculadora / Preço Teto")
- `t.tabs.comparator` ("Comparador")
- `t.tabs.riskRadar` ("Radar de Risco")
- `t.tabs.radar` ("Oportunidades")
- `t.tabs.cashFlow` ("Extrato e Proventos")
- `t.tabs.smartAllocation` ("Alocação Inteligente")
- `t.snowball.title` ("Efeito Bola de Neve")
- `t.docs.navLink` ("Guia & Fórmulas")

### 8.3 Relação com a Navegação por Verbos do Protótipo v6 (Prompt 130)
O protótipo v6 agrupa a navegação em 3 verbos principais:
1. **Decidir** (`/app/decidir`): O que comprar hoje, AskEngine, Plano de Aporte.
2. **Acompanhar** (`/app/acompanhar`): Minha Carteira, Extrato & Proventos, Calendário.
3. **Analisar** (`/app/analisar`): Calculadora/Screener, Comparador, Radar de Risco, Bola de Neve.
*Conclusão*: O Prompt 130 reestruturará o menu agrupando as rotas existentes sob esses 3 verbos no desktop e mobile, aproveitando 100% dos componentes e rotas já construídos.

---

## 9. Feature Gates

### 9.1 Diagnóstico de `featureGates.ts`
- Configuração global em tempo real via documento Firestore `config/featureGates`.
- Usuários `pro` recebem `Infinity` em limites numéricos e `true` em flags booleanas.
- Usuários `free` recebem o valor configurado no Firestore ou o fallback de `DEFAULT_FEATURE_GATES`.

### 9.2 Como Adicionar um Novo Feature Gate
1. Adicionar o campo na interface `FeatureGatesConfig` em `src/lib/featureGates.ts` (ex: `askEngineUnlocked?: boolean`).
2. Definir o valor padrão no objeto `DEFAULT_FEATURE_GATES` (ex: `askEngineUnlocked: true`).
3. Adicionar as strings i18n correspondentes em `dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` sob `admin.featureGatesTab`.
4. No componente da tela, consumir via hook:
   ```tsx
   const askEngineUnlocked = useFeatureGate("askEngineUnlocked") as boolean;
   ```
5. O painel administrativo `FeatureGatesTab.tsx` reconhece a nova chave automaticamente através de `KNOWN_FEATURE_GATE_KEYS`.

---

## 10. ThesisSnapshot (Estado Confirmado pós-Prompt 127)

- **Confirmação em Produção**:
  - `ThesisSnapshot` está ativo em `src/lib/transactionsLogic.ts` (linhas 1-20).
  - Campo `thesisSnapshot?: ThesisSnapshot | null` integrado à interface `Transaction`.
- **Geração Automática**:
  - Compras manuais no Horizonte: capturado em `NewContributionDialog.tsx`.
  - Compras manuais na Watchlist: capturado em `TransactionsPanel.tsx`.
  - Importação em lote (PDF/CSV): capturado em `transactionPersistence.ts` (`persistTransactionsBatch`) com cálculo 1x por ticker e instanciação individual por compra.
- **Como Ler para Telas de Auditoria e "O que mudou?"**:
  - **Hoje já é 100% possível.** Toda transação retornada por `useTransactions()` possui o snapshot embutido.
  - **Consulta necessária**:
    ```ts
    const tx = transactions.find(t => t.id === targetTransactionId);
    const snapshot = tx?.thesisSnapshot;
    ```
  - **Comparação "Tese de Compra vs. Fundamentos Atuais"**:
    - *No momento da compra*: `snapshot.consensusPrice`, `snapshot.dividendYield`, `snapshot.safetyMarginVsConsensus`, `snapshot.piotroskiScore`.
    - *Atualmente*: `item.currentPrice`, `item.annualDividend`, `item.safetyMargin`, `item.fuenteConsensus`.
    - *Delta*: Computado localmente em memória sem necessidade de queries adicionais ao banco de dados.

---

## 11. Design Tokens (Estado Confirmado pós-Prompt 128)

- **Confirmação em Produção**:
  - Paleta Colheita integralmente aplicada em `src/styles.css` nos modos `:root` e `.dark`.
  - Estrutura `@theme inline` 100% preservada.
  - Zero ocorrências de valores `hex` ou `rgb` nos blocos `:root` e `.dark`.
- **Conformidade de Contraste WCAG 2.1 AA**:
  - `foreground / background`: **15.03:1** (Claro) e **14.65:1** (Escuro) — Nível AAA.
  - `muted-foreground / background`:
    - Modo Claro: **`oklch(0.500 0.021 162.5)`** com contraste **5.32:1** (> 4.5:1 exigido para `text-xs`/`text-sm`).
    - Modo Escuro: **`oklch(0.720 0.020 87.5)`** com contraste **7.56:1** (> 7.0:1 Nível AAA).
  - `destructive / background`: **4.65:1** (`oklch(0.550 0.135 35.4)`) no Modo Claro.
  - `success / background`: **5.65:1** (Claro) e **6.57:1** (Escuro).
  - `accent-foreground / accent`: **6.53:1** (Claro) e **11.60:1** (Escuro).
- **Fontes**:
  - `Fraunces`: Carregada via `@font-face` nos formatos normal e itálico variável.
  - `Space Grotesk` e `JetBrains Mono`: Diagnosticadas como não carregadas (nenhuma fonte adicionada indevidamente).
