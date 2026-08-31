Prompt 135 — AskScreen reutilizavel e tela Reinvestir [Item 1.3] — REVISADO pos-129/131/133/134

CONTEXTO
Primeira materialização visual do AskEngine (núcleo pronto desde 7fd89fc,
3 estratégias de reinvestimento prontas desde 7a7c105: accelerateSnowball,
correctDrift, reinforcePayer — as mesmas 3 abas do protótipo v6 para esta
tela). Referência visual OBRIGATÓRIA: docs/design/v6/prototipo-v6.html,
tela "Reinvestir proventos". O componente <AskScreen> será REUSADO pelas
próximas perguntas — projetar genérico desde o início.

IMPORTANTE — 3 fatos novos, confirmados no código real, que mudam o desenho
original deste prompt:

1. NENHUMA reasonKey criada nos Prompts 133/134 tem placeholder para os
   reasonParams. O motor já gera reasonParams estruturados (ex.: { yield:
   12.4 }, { classType, margin }, { price, ceiling, margin }), mas os
   textos em dict.ptBR/en/es.ts hoje são strings fixas sem {{token}}. Isso
   precisa ser corrigido AQUI, senão a tela mostra "Maior Dividend Yield
   líquido entre os ativos elegíveis" sem o número — perdendo exatamente o
   "raciocínio exposto com números" que é o diferencial do produto.

2. O projeto JÁ TEM um padrão de interpolação, mas é manual e para um
   parâmetro só: `t.chave.replace("{{count}}", String(valor))`, repetido
   em cada callsite (Watchlist.tsx, WatchlistIO.tsx, BrokerNoteUploader.tsx
   etc.), sem helper genérico. Como as reasonKey do AskEngine têm até 3
   parâmetros nomeados por chave, reusar esse padrão manual geraria 3
   `.replace()` encadeados em cada linha — proponha um helper pequeno e
   ESCOPADO ao AskEngine (não uma reforma do sistema de i18n do projeto
   inteiro) que resolve reasonKey + reasonParams de uma vez.

3. Não existe conceito de saldo de caixa livre (confirmado na Auditoria,
   seção 4): o app não sabe quanto de provento recebido AINDA NÃO foi
   reinvestido. RealizedIncomeSummary.currentMonth (realizedIncome.ts) é
   o valor já PAGO no mês (distinto de announcedTotal, que é só anunciado)
   — use isso como SUGESTÃO INICIAL do campo de valor disponível, sempre
   editável pelo usuário, com nota visual explícita de que é estimativa
   (não um saldo de caixa rastreado). Não inventar rastreamento de
   "já reinvestido" nesta etapa — isso é item de fase futura.

INVESTIGAR ANTES (Regra 7)
1. Confirmar se Reinvestir deve ter feature gate. O padrão existente em
   featureGates.ts é `xUnlocked: boolean` com DEFAULT_FEATURE_GATES e
   KNOWN_FEATURE_GATE_KEYS derivados automaticamente. Reportar se
   Reinvestir deveria ficar sem gate (tier grátis, conforme discutido) ou
   se precisa de uma chave nova seguindo a convenção — não decidir sozinho,
   trazer a pergunta.
2. Confirmar assinatura exata de useRealizedIncomeSummary (hook, não só a
   função pura) — como obter currentMonth já formatado/pronto para uso em
   tela, e se há loading/error state a tratar.
3. Confirmar localização e props de MetricBox, StatusBadge (components/
   shared/) e ResultSkeleton (components/ceiling/) para reuso no rodapé
   de consequências e nos estados de loading — não criar componente novo
   se esses servirem.
4. Propor o design do helper de interpolação (nome, assinatura, onde mora
   — sugestão: src/lib/askEngine/resolveReasonText.ts, mas decidir com
   base no que já existe) ANTES de tocar nos dicionários.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

TAREFA (após aprovação do plano)

1. Corrigir os dicionários (dict.ptBR/en/es.ts): adicionar {{token}} em
   CADA reasonKey e valueKey do askEngine que tem reasonParams/value,
   usando os nomes de parâmetro exatos que o motor já gera. Exemplos
   (ajustar aos nomes reais confirmados no código):
   - highestNetYield: incluir {{yield}}
   - farthestBelowTarget: incluir {{classType}} e {{margin}}
   - excludedAboveCeiling: incluir {{price}}, {{ceiling}}, {{margin}}
   - reinforcePayer: incluir {{ticker}}
   - annualIncomeAdded: incluir {{value}}
   NÃO alterar reasonKeys que não têm reasonParams (ex.: excludedYieldTrap,
   excludedInvalidPrice) — ficam como estão.

2. Criar o helper de resolução (local definido na investigação 4) que
   recebe reasonKey + reasonParams + dict e devolve a string final com
   todos os tokens substituídos. Função pura, testável isoladamente.

3. Criar src/components/ask/AskScreen.tsx (GENÉRICO) e
   src/routes/app/reinvestir.tsx.

   Anatomia do <AskScreen> (props, sem lógica de negócio dentro):
   - questionKey: chave i18n da pergunta em destaque
   - amount: valor sugerido (editável) + fonte da sugestão (para exibir
     "sugestão baseada em proventos recebidos este mês")
   - strategies: Strategy[] (as 3 já existentes: accelerateSnowballStrategy,
     correctDriftStrategy, reinforcePayerStrategy)
   - context: AskContext (positions, availableAmount, settings, asOf,
     sourceTicker opcional)
   - onExport: callback (placeholder nesta etapa — exportação real é
     item futuro, não deste prompt)

   Comportamento:
   - Trocar de estratégia recalcula a lista chamando runAsk
   - Cada linha: rank, ticker, barra proporcional, razão traduzida
     (via o helper do item 2, com os números reais embutidos), valor,
     quantidade
   - Rodapé: consequências (usar MetricBox/StatusBadge conforme
     confirmado na investigação 3)
   - Estado "metas não configuradas": SÓ relevante para a aba
     correctDrift (requiresTargets: true) — as outras duas
     (accelerateSnowball, reinforcePayer) não exigem isso
     (requiresTargets: false, já implementado assim nos Prompts 133/134).
     A tela precisa refletir isso: trocar de aba pode sair de um estado
     bloqueado para um funcional mesmo sem metas configuradas.
   - Estado "reforçar quem pagou sem sourceTicker": quando a tela é
     acessada sem um pagador específico (fluxo genérico, não veio de um
     evento de provento específico), a aba reinforcePayer legitimamente
     não tem candidatos (o motor já devolve [] por design, Prompt 134).
     Tratar como estado vazio explicativo NESSA ABA, não como erro — as
     outras abas continuam funcionando normalmente.
   - Campo de valor disponível: pré-preenchido com
     RealizedIncomeSummary.currentMonth, com rótulo indicando que é
     sugestão editável (não saldo de caixa rastreado).

4. Disclaimer variante 'calculation' (Prompt 132,
   RegulatoryDisclaimerBanner) PERSISTENTE no rodapé — usar
   `<RegulatoryDisclaimerBanner variant="calculation" forceShow />` (o
   mesmo padrão já usado em BuyAndHoldChecklistCard.tsx).

REQUISITOS INEGOCIÁVEIS
1. ZERO lógica de negócio no componente AskScreen (Regra 4) — todo cálculo
   vem de runAsk. O componente só apresenta.
2. Zero hardcode (Regra 2), 3 idiomas. reasonKey resolvidas via o helper,
   nunca concatenação manual de string no componente React.
3. Mobile-first (Regra 5): em 375px a linha empilha, não esmaga.
4. Qualidade visual premium (Regra 6): tokens Colheita do Prompt 128.
5. Acessibilidade: navegável por teclado, abas de estratégia com role
   adequado, respeitar prefers-reduced-motion nas transições de barra.
6. Estados obrigatórios: carregando (ResultSkeleton), vazio por aba
   (conforme comportamento 3 acima), erro, sucesso. NÃO existe estado
   global de "metas não configuradas" bloqueando a tela inteira — isso é
   por estratégia, não por tela (correção importante em relação ao
   desenho original, que tratava como bloqueio único).
7. Se a investigação 1 concluir que precisa de feature gate, aplicar
   useFeatureGate com a chave decidida.

PROIBIDO
- Qualquer cálculo financeiro dentro do componente React
- Chamar getAssetValuation ou resolveTargetYield direto da tela
- Texto hardcoded, inclusive nos textos de estado vazio/erro
- Criar um segundo componente de lista se AllocationRow servir para tudo
- Inventar rastreamento de "já reinvestido" nesta etapa
- Bloquear a tela inteira por falta de metas quando só uma das 3 abas
  precisa delas

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | define a anatomia reusável e os estados por aba |
| fuente-investidor-iniciante | SIM | clareza do "porquê" de cada linha, agora com números reais |
| fuente-investidor-profissional | SIM | densidade e confiança no raciocínio exposto |
| fuente-solution-architect | SIM | garante componente genérico + helper de interpolação bem escopado |
| fuente-architecture-review | SIM | gate do diff, evita reforma desnecessária do i18n geral |
| fuente-advogado-lgpd-gdpr | SIM | linguagem não pode soar recomendação; disclaimer persistente |
| fuente-product-manager | SIM | escopo dos estados e decisão de feature gate |
| fuente-product-marketing | SIM | copy da pergunta é posicionamento |
| fuente-business-architect | NÃO | capacidade já modelada |

COMMIT
feat(reinvestir): AskScreen reutilizavel com interpolacao de reasonKeys e tela de reinvestimento [Item 1.3]

---

Envie o plano com as 4 respostas do "Investigar Antes" antes de codar. Em
especial quero ver o design do helper de interpolação e a decisão sobre
feature gate — não escreva nenhum dicionário novo antes dessas duas
respostas.
