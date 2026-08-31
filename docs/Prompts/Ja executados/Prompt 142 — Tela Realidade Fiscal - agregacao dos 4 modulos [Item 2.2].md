Prompt 142 — Tela Realidade Fiscal: agregacao dos 4 modulos [Item 2.2]

CONTEXTO
Primeira materialização visual da Fase 2. O motor de cálculo está completo
e commitado (138: dividendo/JCP/US; 139: ganho realizado; 140: isenção +
compensação de ações; 141: FII 20% flat). Este prompt NÃO adiciona
nenhuma regra fiscal nova — é wiring e apresentação sobre o que já existe,
mesmo espírito do Prompt 135 (AskScreen) em relação ao AskEngine: a tela
não calcula nada, só monta o contexto de entrada, chama as funções puras,
e apresenta o resultado.

ACHADO NOVO QUE PRECISA SER RESOLVIDO ANTES DA UI — inconsistência de
fuso horário entre módulos:
- src/lib/realizedIncome.ts (proventos, Fase 1) define "ano corrente" via
  now.getUTCFullYear()/getUTCMonth() — UTC.
- src/lib/tax/br/*.ts (ganho de capital, Fase 2, Prompts 139-141) agrupam
  por mês via getLocalDateISOString (fuso LOCAL).
Se esta tela agregar visualmente "proventos do ano" (Fase 1) e "ganho de
capital do ano" (Fase 2) lado a lado sem tratar essa diferença, uma
transação perto da virada do ano (31/dez para 1/jan, especialmente em
horários UTC-3 como o Brasil) pode ser contada em anos diferentes pelos
dois blocos — inconsistência visível e confusa para o usuário, mesmo que
cada módulo individualmente esteja correto. Este prompt não pode
silenciar isso.

TAREFA

1. Contexto de entrada — construir, não recalcular

   src/lib/tax/buildTaxContext.ts (função pura auxiliar)
   - A partir de Transaction[] (useTransactions) e WatchlistItem[]
     (useWatchlist/useValuedPortfolio), montar:
     a. assetTypeByTicker: Map<string, AssetType> — derivado de
        WatchlistItem.type, não inventado.
     b. RealizedGainEvent[] — via calculateRealizedGains (Prompt 139),
        chamado uma vez por ticker relevante (ou uma vez para todos,
        conforme a assinatura real permitir — investigar antes).
   - Esta função SÓ organiza dado de entrada para os 4 módulos — não
     contém nenhuma regra de imposto.

2. src/routes/app/realidade-fiscal.tsx + componente de apresentação
   src/components/tax/TaxRealityScreen.tsx (genérico o suficiente para
   reuso, mesmo padrão de AskScreen)

   Estrutura da tela (referência: protótipo v6 mencionado no roadmap
   original tinha uma visão de "Realidade Fiscal" — CONSULTAR
   docs/design/v6/prototipo-v6.html antes de desenhar do zero, mesmo que
   o conteúdo específico de imposto não estivesse detalhado lá; reusar
   o padrão visual e de disclaimer já estabelecido):

   a. TaxSimulationDisclaimer (Prompt 137) persistente no topo, não
      dispensável.
   b. Resumo do ano corrente, com A MESMA DEFINIÇÃO DE "ANO CORRENTE"
      usada para os dois blocos (resolver o achado acima — investigar e
      decidir: padronizar tudo em local, ou aceitar a pequena divergência
      documentando-a, mas NÃO ignorar silenciosamente).
      - Dividendos líquidos recebidos (via simulateBrDividendTax +
        simulateBrJcpTax + simulateUsWithholdingTax, agregados)
      - Ganho de capital em ações: resultado agregado dos meses do ano
        via calculateMonthlyCapitalGainsTax
      - Ganho de capital em FII: resultado agregado dos meses do ano via
        calculateFiiCapitalGainsTax
      - Imposto total estimado do ano (soma de taxDue de todos os meses
        de ambas as trilhas — NUNCA somar os carryforwards entre si,
        cada trilha mantém o próprio)
   c. Detalhamento mês a mês (tabela ou lista) para ações e para FII,
      separados, cada um mostrando isExempt (só ações têm esse campo),
      taxableGain, taxDue, e o carryforward remanescente daquela trilha.
   d. Seção de ativos não-classificados (unclassifiedTickers agregados de
      todos os meses/módulos) — se houver, alertar visualmente que esses
      ativos NÃO entraram em nenhum cálculo, com CTA para o usuário
      completar a classificação (se existir tela de settings para isso;
      se não existir, reportar isso no plano como gap a resolver depois,
      não inventar uma tela nova aqui).
   e. Seção de LIMITES DECLARADOS — texto fixo, visível, não escondido em
      tooltip, listando o que este painel NÃO cobre: day-trade, ações no
      exterior, ambiguidade de ETF (Prompt 140), exceção de FII fechado/
      concentrado e a equiparação de FIAGRO/FII_INFRA ainda pendente de
      revisão jurídica (Prompt 141). Isso não é detalhe de rodapé — é
      requisito central deste prompt, mesmo peso que qualquer número
      calculado.

REQUISITOS INEGOCIÁVEIS
1. ZERO lógica de cálculo fiscal na tela ou em TaxRealityScreen.tsx —
   tudo vem das 4 funções puras já existentes + buildTaxContext só
   organizando entrada.
2. A definição de "ano corrente" usada nesta tela precisa ser conferida
   contra os dois padrões existentes (UTC de realizedIncome.ts vs. local
   de getLocalDateISOString) e a divergência resolvida ou documentada
   explicitamente — não pode ser um terceiro padrão novo inventado aqui.
3. unclassifiedTickers nunca é escondido — se existir, aparece com
   destaque, não é detalhe secundário.
4. Feature gate: esta tela deve ter useFeatureGate próprio (seguir o
   padrão xUnlocked já usado para reinvestUnlocked no Prompt 135) —
   propor o nome da chave no plano.
5. Mobile-first (Regra 5), tokens Colheita (Regra 6).
6. Estados obrigatórios: carregando, sem transações de venda no ano
   (estado vazio, não erro), erro, sucesso.
7. Zero hardcode (Regra 2), 3 idiomas — incluindo o texto completo da
   seção de limites declarados (item 2e), que é o texto mais sensível
   desta tela e não pode ter tradução aproximada.

INVESTIGAR ANTES (Regra 7)
1. Assinatura exata de calculateRealizedGains (Prompt 139) — aceita
   lista de transações de múltiplos tickers de uma vez, ou precisa ser
   chamada por ticker? Confirmar antes de desenhar buildTaxContext.
2. Resolver a divergência UTC vs. local: propor se é seguro/desejável
   alinhar realizedIncome.ts para usar getLocalDateISOString também
   (mudança em código já em produção da Fase 1 — avaliar risco de
   regressão, mesmo cuidado do Prompt 139 com
   recalculateHoldingFromTransactions), ou se a tela deve só documentar a
   pequena divergência sem alterar código existente. Trazer os dois lados.
3. Verificar se existe hoje alguma tela/fluxo de "classificar ativo sem
   tipo" — se não existir, isso é gap a registrar no plano, não a
   resolver improvisando uma tela nova neste prompt.
4. Confirmar o texto exato a reusar de TaxSimulationDisclaimer (Prompt
   137) e se ele já é suficiente para esta tela ou precisa de uma
   variante ainda mais específica — mesma pergunta já feita no 137,
   revisitar com o contexto real da tela pronta.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TESTES OBRIGATÓRIOS
- buildTaxContext monta assetTypeByTicker corretamente a partir de
  WatchlistItem[] real (não mock incompleto)
- Tela renderiza os 3 blocos (dividendos, ações, FII) com dados de teste
  determinísticos, valores batendo com chamar as funções puras
  diretamente
- unclassifiedTickers aparece visualmente quando presente, ausente quando
  vazio
- Seção de limites declarados está presente e não é removível/dispensável
- Estado vazio (sem vendas no ano) não quebra a tela
- Feature gate aplicado corretamente

PROIBIDO
- Qualquer cálculo fiscal novo dentro da tela ou de buildTaxContext
- Esconder ou minimizar a seção de limites declarados
- Inventar uma tela de classificação de ativos não pedida
- Somar carryforward de ações com o de FII em qualquer lugar
- Silenciar a divergência de fuso horário sem decisão explícita

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | seção de limites declarados é a peça regulatória central desta tela |
| fuente-ux-designer | SIM | equilibrar densidade de dado com clareza dos limites |
| fuente-investidor-profissional | SIM | validar que a agregação não confunde trilhas de carryforward |
| fuente-investidor-iniciante | SIM | usuário iniciante precisa entender o que NÃO está coberto |
| fuente-solution-architect | SIM | buildTaxContext como camada fina, sem virar SSOT paralelo |
| fuente-architecture-review | SIM | gate contra cálculo vazando para a UI |
| fuente-product-manager | SIM | escopo da tela e decisão sobre a divergência de fuso |
| fuente-product-marketing | NÃO | sem comunicação externa nesta etapa |
| fuente-business-architect | NÃO | capacidade já modelada nos Prompts 138-141 |

COMMIT
feat(tax): tela realidade fiscal agregando os 4 modulos de calculo [Item 2.2]

---

Envie o plano com as 4 respostas do "Investigar Antes" antes de codar. A
resposta que mais me importa é a da investigação 2 — a divergência de
fuso horário entre realizedIncome.ts e o módulo fiscal precisa de decisão
explícita, não pode virar um terceiro comportamento inventado só para
esta tela.
