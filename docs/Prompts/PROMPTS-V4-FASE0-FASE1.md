# Pacote de Prompts — Fuente Price Pro v4
## Fase 0 (Fundação) e Fase 1 (Primeira pergunta)

**Protótipo de referência:** `fuente-v6-completo.html` — APROVADO
**Regra transversal:** nenhum prompt inventa design. O protótipo é o alvo.

---

## Ordem de execução e racional

| # | Prompt | Por que nesta posição |
|---|---|---|
| 126 | Versionar protótipo no repo | Sem alvo visual referenciável, todo prompt vira descrição |
| 127 | Snapshot de consenso na compra | **Antecipado.** Sem histórico gravado, auditoria e "o que mudou" nascem vazios |
| 128 | Design tokens Colheita | Base visual de tudo que vem depois |
| 129 | Auditoria de reuso (investigação) | Descobre o que já existe antes de qualquer código novo |
| 130 | Navegação por verbos + idioma | Estrutura do app |
| 131 | Metas e yield-alvo por classe | Pré-requisito regulatório do motor |
| 132 | Disclaimer (estender o existente) | Bloqueante de qualquer tela de sugestão |
| 133 | AskEngine — núcleo | Camada nova, greenfield |
| 134 | Estratégias de reinvestimento | Primeiras 3 estratégias |
| 135 | AskScreen + tela Reinvestir | Primeira pergunta ponta a ponta |
| 136 | Exportar CSV | Fecha o ciclo da pergunta |

**Não execute fora de ordem.** 127 antes de 128 é deliberado: cada dia sem
gravar snapshot é um dia de histórico perdido para sempre.

---

# PROMPT 126 — Versionar o protótipo aprovado

```
Prompt 126 — Versionar protótipo v6 como referência de design [Item 0.0]

CONTEXTO
O redesign v4/v6 foi aprovado. O arquivo HTML do protótipo passa a ser o
ALVO VISUAL CANÔNICO referenciado por todos os prompts seguintes. Sem ele
versionado no repositório, os próximos prompts viram descrição textual e o
resultado perde fidelidade.

TAREFA
1. Criar a pasta docs/design/v6/
2. Salvar o arquivo fuente-v6-completo.html (fornecido por Paulo) em
   docs/design/v6/prototipo-v6.html — SEM MODIFICAR UMA LINHA do conteúdo.
3. Criar docs/design/v6/README.md com:
   - Aviso de que é artefato de referência, NÃO código de produção
   - Índice das superfícies contidas: landing, login, onboarding (4 passos),
     reinvestir, plano de aporte, retirar, o que mudou, renda garantida,
     realidade fiscal, minha carteira, adicionar ativo, importar nota,
     meses secos, explorar ativos (5 abas), auditoria, perfil (4 abas),
     admin (4 abas)
   - Instrução: ao implementar qualquer tela, abrir este arquivo e reproduzir
     estrutura, hierarquia e textos

PROIBIDO
- Alterar o conteúdo do HTML do protótipo
- Copiar CSS do protótipo direto para produção (o projeto usa Tailwind v4 +
  tokens; a tradução acontece no Prompt 128)
- Referenciar este HTML em qualquer código de runtime

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | o artefato é a especificação visual |
| fuente-architecture-review | SIM | gate do diff |
| fuente-product-manager | SIM | define o escopo congelado da v6 |
| demais papéis | NÃO | não há código, dado pessoal, cálculo ou UI de produção |

COMMIT
docs(design): versiona prototipo v6 como referencia canonica [Item 0.0]
```

---

# PROMPT 127 — Snapshot de consenso na compra (ANTECIPADO)

```
Prompt 127 — Registrar snapshot de tese na transação [Item 3.1 — antecipado]

CONTEXTO
As telas "Auditoria de decisões" e "O que mudou" (protótipo v6) comparam os
fundamentos NA DATA DA COMPRA com os de hoje. Sem esse registro, as duas telas
nascem vazias e só terão dado meses depois. Por isso este item foi ANTECIPADO:
não tem tela agora, mas precisa começar a gravar imediatamente.

INVESTIGAR ANTES (Regra 7) — NÃO ESCREVER CÓDIGO NESTA ETAPA
1. Localizar onde uma transação de compra é persistida hoje
   (verificar recalculateHoldingFromTransactions e o fluxo de
   NewContributionDialog e DynamicImportModal).
2. Reportar o shape atual do documento de transação no Firestore.
3. Verificar se JÁ existe algum snapshot de fundamentos gravado
   (buscar por: snapshot, thesis, tese, atPurchase, historical).
4. Confirmar a assinatura de getAssetValuation e quais campos ela retorna.
5. Verificar se há algum dado histórico de consenso já armazenado.

APRESENTAR o levantamento e o plano ANTES de codar (Regra 8).
Se descobrir que já existe estrutura equivalente, REPORTAR e propor estender
em vez de criar (Regra 1).

TAREFA (somente após aprovação do plano)
Gravar, no momento da criação de uma transação de COMPRA, um objeto imutável
com os fundamentos da data:
- consensusPrice (mediana dos 3 métodos) na data
- preços individuais de Bazin, Graham e Gordon na data
- preço pago e margem resultante vs. consenso
- payout, dividendYield, CAGR de proventos, Piotroski (quando disponíveis)
- flag de yield-trap na data
- versão do algoritmo de valuation
- timestamp

REQUISITOS INEGOCIÁVEIS
1. O snapshot é IMUTÁVEL. Nunca recalculado, nunca sobrescrito. É registro
   histórico — se o algoritmo mudar depois, o snapshot antigo permanece.
2. Por isso grave a versão do algoritmo junto.
3. Campo indisponível grava null explícito com a razão. NUNCA zero, NUNCA
   valor estimado.
4. Falha ao obter fundamentos NÃO pode impedir o registro da transação.
   A transação é o dado crítico; o snapshot é complementar. Degradar com
   snapshot parcial, nunca bloquear.
5. Consome getAssetValuation — jamais reimplementa cálculo (Regra 4/SSOT).
6. LGPD: é dado pessoal. Incluir em dataExport.ts e accountDeletion.ts.
   VERIFICAR os dois arquivos e atualizar.

TESTES OBRIGATÓRIOS
- compra registra snapshot com os campos disponíveis
- fundamentos indisponíveis -> snapshot parcial com null e razão, transação OK
- erro na obtenção de fundamentos -> transação persiste mesmo assim
- snapshot não é alterado por recálculo posterior
- venda NÃO gera snapshot de tese
- snapshot aparece no export de dados e some no delete de conta

PROIBIDO
- Bloquear a transação por falha no snapshot
- Gravar zero onde o correto é null
- Recalcular ou sobrescrever snapshot existente
- Executar qualquer script contra o Firestore (dev e prod compartilham o
  mesmo projeto — script afeta produção imediatamente)
- git add -A

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-solution-architect | SIM | imutabilidade e versionamento do snapshot |
| fuente-advogado-lgpd-gdpr | SIM | dado pessoal novo, export e delete |
| fuente-architecture-review | SIM | gate contra violação de SSOT |
| fuente-investidor-profissional | SIM | define quais fundamentos importam |
| fuente-product-manager | SIM | antecipação de item de fase posterior |
| fuente-business-architect | SIM | habilita capacidade futura de auditoria |
| fuente-ux-designer | NÃO | não há UI nesta etapa |
| fuente-investidor-iniciante | NÃO | sem superfície visível |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(portfolio): registra snapshot imutavel de tese na compra [Item 3.1]
```

---

# PROMPT 128 — Design tokens "Colheita"

```
Prompt 128 — Aplicar paleta Colheita [Item 0.1]

CONTEXTO
Referência: docs/design/v6/prototipo-v6.html (Prompt 126).
A paleta terrosa (musgo + ouro) substitui o azul/roxo atual.

ESCOPO — ARQUIVO ÚNICO
- src/styles.css

TAREFA
Converter para oklch e substituir os valores. NÃO alterar a estrutura de
@theme inline, NÃO adicionar/remover/renomear variáveis.

Modo claro (:root)
background #f6f2ea · card #fffdf8 · foreground #14201a
muted-foreground rgba(20,32,26,.52) · border rgba(20,32,26,.12)
primary #1c4a34 · primary-foreground #f6f2ea
accent #c99a3a · accent-foreground #14201a
success #2f6b4c · warning #a97a1f · destructive #b5533a
sidebar #0e2a1f · sidebar-foreground #f6f2ea · sidebar-primary #1c4a34
sidebar-accent #e9c877

Modo escuro (.dark)
background #0a1410 · card #131f18 · foreground #e9e3d5
muted-foreground rgba(233,227,213,.52) · border rgba(233,227,213,.13)
primary #245c40 · accent #e9c877
success #57a97b · warning #e9c877 · destructive #e2795e
sidebar #08110d · sidebar-foreground #e9e3d5 · sidebar-accent #f0d792

REQUISITOS
1. TODAS as cores em oklch.
2. Contraste mínimo AA (4.5:1). REPORTAR o valor calculado para, em AMBOS
   os modos: foreground/background, muted-foreground/background,
   accent/background, destructive/background, success/background.
3. Cor que não atingir AA deve ter luminosidade ajustada, com o ajuste
   DECLARADO no relatório. Não silenciar.
4. Fontes: confirmar se Fraunces já está carregada. O protótipo usa
   Fraunces (números e títulos), Space Grotesk (UI) e JetBrains Mono (dados).
   REPORTAR quais já existem e quais faltam — mas NÃO adicionar fonte nova
   neste prompt.

PROIBIDO
- Alterar qualquer arquivo além de src/styles.css
- Adicionar/remover/renomear variáveis
- Hex ou rgb no arquivo final
- Alterar --radius ou tokens não-cromáticos

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | define e valida a paleta |
| fuente-architecture-review | SIM | gate do diff |
| fuente-investidor-iniciante | SIM | legibilidade e confiança |
| fuente-investidor-profissional | SIM | sobriedade e densidade |
| fuente-solution-architect | NÃO | troca de valores, sem decisão estrutural |
| fuente-product-manager | NÃO | já priorizado |
| fuente-business-architect | NÃO | não afeta capacidades |
| fuente-product-marketing | NÃO | posicionamento tratado no Prompt 130 |
| fuente-advogado-lgpd-gdpr | NÃO | não toca dado pessoal |

COMMIT
style(design-system): aplica paleta Colheita em oklch [Item 0.1]
```

---

# PROMPT 129 — Auditoria de reuso (SÓ INVESTIGAÇÃO)

```
Prompt 129 — Auditoria de reuso antes da v4 [Item 0.5] — SEM CÓDIGO

CONTEXTO
A v4 adiciona telas e um motor de decisão. Antes de escrever qualquer linha,
precisamos saber exatamente o que JÁ existe, para estender em vez de duplicar
(Regra 1). Erros já cometidos em planejamento: propor criar metas de alocação
e disclaimer regulatório que já existiam.

TAREFA — ESTE PROMPT NÃO ALTERA NENHUM ARQUIVO
Produzir um relatório em docs/design/v6/AUDITORIA-REUSO.md com:

1. METAS DE ALOCAÇÃO
   - Ler src/components/ceiling/TargetAllocationPanel.tsx e
     src/lib/suggestedAllocation.ts
   - Documentar: shape de targets, como são persistidos, validação de soma,
     como PROFILE_BASE_ALLOCATION e STRATEGY_BIAS_MULTIPLIERS funcionam
   - Responder: dá para estender para yield-alvo POR CLASSE? O que muda?

2. DISCLAIMER
   - Ler src/components/shared/RegulatoryDisclaimerBanner.tsx
   - Documentar props, variantes, onde é usado hoje
   - Responder: suporta variantes 'calculation' / 'tax' / 'full'?
     Há registro de aceite versionado?

3. SMART ALLOCATION vs PLANO DE APORTE
   - Ler src/components/ceiling/SmartAllocation.tsx
   - Documentar o que ela JÁ faz: estratégias, metas, alocação sugerida
   - Responder: qual a sobreposição real com o "Plano de aporte" do protótipo?

4. PROVENTOS
   - Ler realizedIncome.ts e useRealizedIncomeSummary.ts
   - Responder: dá para saber quanto foi recebido e AINDA NÃO reinvestido?
     Se não, o que falta?

5. FISCAL ESPALHADO
   - Buscar em todo src/ por: withholding, 0.30, JCP, isencao, isento,
     20000, taxRate, imposto
   - Listar CADA ocorrência com arquivo:linha e o que faz

6. CALENDÁRIO E SAZONALIDADE
   - Ler cashflow.ts, dividendHeatmap.ts, CashFlowCalendar.tsx,
     fiiPaymentRules.ts
   - Responder: dá para derivar "meses secos" com o que existe?
     E "dividendos por ano"?

7. COMPONENTES REUSÁVEIS
   - Listar de components/shared e components/ui o que serve para as telas
     novas: MetricBox, StatusBadge, AssetCard, ResultSkeleton,
     TickerSearchField, BlurredPreviewOverlay, LockedPanel
   - Para cada um: serve como está / precisa extensão / não serve (por quê)

8. NAVEGAÇÃO
   - Ler layout/Sidebar.tsx e layout/MobileBottomNav.tsx
   - Documentar estrutura atual e chaves i18n de navegação

9. FEATURE GATES
   - Ler featureGates.ts e o uso de useFeatureGate
   - Documentar como adicionar gate novo

PROIBIDO
- Alterar QUALQUER arquivo de código
- Propor solução — este prompt é diagnóstico
- Afirmar que algo não existe sem ter buscado com pelo menos 3 termos

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build
(devem passar inalterados — nenhum código foi tocado)

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | auditoria é a função central deste prompt |
| fuente-solution-architect | SIM | mapeia o que a nova camada pode reusar |
| fuente-product-manager | SIM | conflito SmartAllocation×Plano é decisão de produto |
| demais papéis | NÃO | diagnóstico sem código, UI, cálculo ou dado pessoal |

COMMIT
docs(design): auditoria de reuso pre-v4 [Item 0.5]
```

**IMPORTANTE:** revise pessoalmente o relatório do 129 antes de rodar o 130.
Ele pode alterar o conteúdo dos prompts 131 a 135.

---

# PROMPT 130 — Navegação por verbos + seletor de idioma

```
Prompt 130 — Navegacao por verbos e seletor de idioma [Item 0.2]

CONTEXTO
Referência visual: docs/design/v6/prototipo-v6.html (sidebar do app).
Base factual: docs/design/v6/AUDITORIA-REUSO.md, seção 8.

A navegação passa de "telas" para VERBOS. Decisão de produto já tomada:
Screener, Comparador, Radar de Risco, Radar Global e Bola de Neve NÃO são
removidos — viram ABAS dentro de "Explorar ativos".

TAREFA
Reorganizar Sidebar e MobileBottomNav conforme o protótipo:

DECIDIR
- Reinvestir (com badge de valor disponível)
- Plano de aporte
- Retirar

ACOMPANHAR
- O que mudou (com badge de contagem)
- Renda garantida
- Realidade fiscal

ANALISAR
- Minha carteira
- Explorar ativos  <- nova rota que agrega 5 abas
- Auditoria

RODAPÉ DA SIDEBAR
- Chip do usuário (avatar + nome + plano) -> leva a /settings
- Link Admin (só quando isAdmin)
- Alternância de tema
- Seletor de idioma PT / EN / ES

REQUISITOS
1. NENHUMA rota existente pode ser removida ou quebrada. As rotas de
   screener, comparator, riskradar, globalradar e snowballeffectsimulator
   continuam existindo e funcionando; a nova tela agrega, não substitui.
   (A consolidação real é fase posterior.)
2. Itens de telas ainda não construídas entram DESABILITADOS com rótulo
   "em breve" — não criar rota morta.
3. Badges: nesta etapa aceitam valor via prop, sem cálculo próprio.
   Se o dado ainda não existe, não renderizar o badge.
4. Zero hardcode (Regra 2) — rótulos e títulos de seção via i18n nos
   3 idiomas (pt-BR, en, es).
5. Seletor de idioma deve REUSAR o LanguageSwitcher existente
   (components/ceiling/LanguageSwitcher.tsx) se ele servir — verificar antes
   de criar (Regra 1). Reportar a decisão.
6. Mobile-first (Regra 5): MobileBottomNav tem 5 slots. Escolher os 5 e
   JUSTIFICAR a escolha no relatório. Sugestão: Reinvestir, O que mudou,
   Carteira, Explorar, Perfil.
7. Acessibilidade: navegável por teclado, seções com marcação semântica.

PROIBIDO
- Remover, renomear ou quebrar rota existente
- Criar a tela "Explorar ativos" com conteúdo (só a rota e as abas vazias;
  o conteúdo já existe nas rotas atuais e será movido depois)
- Texto hardcoded
- git add -A

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | arquitetura de informação |
| fuente-product-manager | SIM | agrupamento reflete estratégia |
| fuente-investidor-iniciante | SIM | verbos reduzem carga cognitiva |
| fuente-product-marketing | SIM | navegação comunica o reposicionamento |
| fuente-architecture-review | SIM | gate do diff |
| fuente-solution-architect | SIM | rota agregadora sem quebrar existentes |
| fuente-business-architect | NÃO | capacidades inalteradas |
| fuente-investidor-profissional | NÃO | densidade de dado não muda aqui |
| fuente-advogado-lgpd-gdpr | NÃO | não toca dado pessoal |

COMMIT
refactor(nav): reorganiza navegacao por verbos e adiciona seletor de idioma [Item 0.2]
```

---

# PROMPT 131 — Metas e yield-alvo por classe

```
Prompt 131 — Metas de alocacao e yield-alvo por classe [Item 1.1]

CONTEXTO
Requisito REGULATÓRIO. O motor só pode calcular sobre critérios definidos
pelo usuário. Sem isso, nenhuma sugestão pode ser exibida.
Referência visual: protótipo v6, onboarding passo 3 e 4, e perfil aba
"Metas e critérios".
Base factual: AUDITORIA-REUSO.md, seção 1.

DECISÃO JÁ TOMADA: NÃO criar do zero. TargetAllocationPanel e
suggestedAllocation.ts já existem e devem ser ESTENDIDOS (Regra 1).

TAREFA
Estender o que existe para suportar:

1. Metas por classe (Ações BR, FIIs, Exterior, Renda fixa) — já existe,
   confirmar e reusar. Validação de soma = 100%.

2. NOVO: yield-alvo POR CLASSE, configurável pelo usuário
   - Ações BR (referência de mercado: 6%)
   - FIIs (referência: 8%)
   - Exterior (referência: 4%)
   - Renda fixa (referência: CDI)
   A referência de mercado é EXIBIDA como informação ao lado do campo,
   NUNCA aplicada silenciosamente como default sem o usuário confirmar.

3. Critérios de exclusão (toggles):
   - não sugerir ativos acima do preço-teto de consenso
   - não sugerir ativos com sinal de armadilha de yield
   - limite de concentração máxima por classe (valor configurável)

REQUISITOS INEGOCIÁVEIS
1. Estado "não configurado" é EXPLÍCITO e distinto de "configurado com zeros".
2. Nenhum default aplicado sem confirmação do usuário. Valores de mercado
   são sugestão visível, não preenchimento silencioso.
3. O yield-alvo por classe alimenta o cálculo de preço-teto. VERIFICAR como
   calculations.ts recebe o yield hoje e estender SEM violar o SSOT (Regra 4).
   Se hoje o yield é constante, propor o contrato de passagem no plano.
4. Validação: soma das metas = 100%, bloqueando salvamento fora disso, com
   mensagem via i18n.
5. Zero hardcode, 3 idiomas.
6. Mobile-first.
7. LGPD: metas e critérios são perfil de investimento = dado pessoal.
   Incluir em dataExport.ts e accountDeletion.ts. VERIFICAR os dois.

INVESTIGAR ANTES (Regra 7)
- Como calculations.ts recebe o yield-alvo hoje
- Se a mudança para yield por classe afeta valuations já persistidas
- Se há teste existente que assume yield fixo
Apresentar plano ANTES de codar (Regra 8).

PROIBIDO
- Criar componente novo de metas se TargetAllocationPanel serve
- Assumir default sem confirmação
- Quebrar valuations existentes
- Executar script contra Firestore
- git add -A

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | base do enquadramento regulatório + dado pessoal |
| fuente-solution-architect | SIM | contrato do yield por classe com o SSOT |
| fuente-investidor-profissional | SIM | yield por classe é exigência de rigor |
| fuente-investidor-iniciante | SIM | iniciante não sabe definir yield-alvo |
| fuente-ux-designer | SIM | formulário é atrito crítico |
| fuente-architecture-review | SIM | gate contra duplicação |
| fuente-product-manager | SIM | escopo mínimo viável |
| fuente-business-architect | NÃO | habilita capacidade existente |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(settings): metas e yield-alvo configuraveis por classe [Item 1.1]
```

---

# PROMPT 132 — Disclaimer (estender o existente)

```
Prompt 132 — Estender disclaimer regulatorio [Item 2.0] — BLOQUEANTE

CONTEXTO
BLOQUEANTE: nenhuma tela de sugestão pode ir a produção sem isto.
Base factual: AUDITORIA-REUSO.md, seção 2.
DECISÃO: RegulatoryDisclaimerBanner JÁ EXISTE. Estender, não recriar.

TAREFA
1. Estender o componente existente com variantes:
   - 'calculation' — telas do motor de sugestão
   - 'tax' — telas fiscais
   - 'full' — texto longo (termos e onboarding)

2. Textos (PENDENTES DE REVISÃO JURÍDICA HUMANA — marcar no PR):

   calculation:
   "Sugestão de cálculo, não recomendação de investimento. Calculada
   exclusivamente a partir dos critérios e metas que você configurou. Não
   constitui consultoria de valores mobiliários (CVM). A decisão de seguir
   ou não é exclusivamente sua."

   tax:
   "Estimativa, não consultoria tributária. Cálculo a partir dos dados que
   você registrou. Regras tributárias têm exceções e mudam. Confirme com seu
   contador antes de apurar."

   full: versão longa cobrindo ambos + responsabilidade do usuário.

3. A variante 'calculation' é PERSISTENTE e NÃO DISPENSÁVEL no rodapé de
   toda tela do motor.

4. Registrar aceite do texto 'full' no onboarding, com timestamp e VERSÃO
   do texto. Mudança de texto exige novo aceite.

REQUISITOS
1. i18n nos 3 idiomas. O PT-BR é o normativo; EN e ES são traduções
   informativas — sinalizar isso no próprio texto.
2. Versionamento explícito do texto.
3. LGPD: registro de aceite é dado pessoal — incluir em export e delete.
4. Reusar o componente existente. Se a extensão exigir refatorar a API,
   apresentar o plano e garantir que os usos atuais não quebrem.

PROIBIDO
- Criar componente novo de disclaimer
- Publicar o texto como definitivo sem revisão de advogado humano
  (marcar no PR: "TEXTO PENDENTE DE REVISAO JURIDICA HUMANA")
- Tornar o disclaimer dispensável ou escondê-lo atrás de clique
- Usar linguagem que sugira recomendação em qualquer ponto do produto

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | papel central |
| fuente-product-manager | SIM | bloqueante de roadmap |
| fuente-ux-designer | SIM | persistente sem destruir a experiência |
| fuente-product-marketing | SIM | linguagem afeta posicionamento |
| fuente-investidor-iniciante | SIM | precisa entender o que a ferramenta NÃO é |
| fuente-architecture-review | SIM | gate do diff |
| fuente-solution-architect | NÃO | extensão simples de componente |
| fuente-investidor-profissional | NÃO | já conhece o enquadramento |
| fuente-business-architect | NÃO | não altera capacidades |

COMMIT
feat(legal): estende disclaimer com variantes e aceite versionado [Item 2.0]
```

---

# PROMPT 133 — AskEngine (núcleo)

```
Prompt 133 — Nucleo do AskEngine [Item 0.3]

CONTEXTO
Camada NOVA e greenfield que responde perguntas de decisão. Nunca recalcula
valuation — consome o SSOT.
Base factual: AUDITORIA-REUSO.md, seções 1, 4 e 7.

INVESTIGAR ANTES (Regra 7)
1. Confirmar assinatura de getAssetValuation e consensusPrice.
2. Confirmar o shape retornado por useValuedPortfolio.
3. Revisar o que suggestedAllocation.ts já resolve — o AskEngine deve REUSAR
   (computeSuggestedAllocation, computeMarginBiasMultipliers), não duplicar.
Apresentar plano ANTES de codar (Regra 8).

TAREFA (após aprovação)
Criar src/lib/askEngine/:

types.ts
- UserTargets: metas por classe + yield-alvo por classe + exclusões
- AskContext: { positions: ValuedPosition[]; availableAmount: number;
    targets: UserTargets; asOf: string }
- Strategy: { id: string; labelKey: string; run: (ctx) => Allocation[] }
- Allocation: { ticker, amountBRL, quantity, percentOfTotal,
    reasonKey, reasonParams }
- Excluded: { ticker, reasonKey, reasonParams }
- Consequence: { kind, valueKey, value }
- AskResult: { allocations, leftover, excluded, consequences, state }

engine.ts
- runAsk(ctx: AskContext, strategy: Strategy): AskResult

REQUISITOS INEGOCIÁVEIS
1. Toda Strategy é FUNÇÃO PURA. Sem I/O, sem fetch, sem Firestore,
   sem Date.now() (usar ctx.asOf).
2. O motor NÃO chama getAssetValuation. Recebe posições já valoradas
   (Regra 4 / SSOT).
3. reasonKey é CHAVE i18n com reasonParams estruturados. NUNCA frase montada
   em código (Regra 2).
4. targets vazio -> AskResult com state 'targets_not_configured',
   allocations vazio. NUNCA assumir meta default. (Exigência regulatória.)
5. Quantidade sempre INTEIRA. Resto vai para leftover.
6. Nenhuma exclusão silenciosa: todo ativo removido aparece em excluded
   com razão.
7. Determinismo: empate resolvido por critério explícito e documentado
   (ticker alfabético), nunca por ordem de array.
8. Invariante: soma(allocations) + leftover === availableAmount.

NESTA ETAPA: apenas 1 estratégia de referência —
strategies/balanceTargets.ts (prioriza classes mais abaixo da meta).

TESTES OBRIGATÓRIOS (Vitest)
- invariante soma + leftover === disponível
- targets vazio -> 'targets_not_configured', nada alocado
- ativo acima do teto -> excluído com razão
- ativo com yield-trap -> excluído com razão
- nenhuma quantidade fracionária
- pureza: mesma entrada -> mesma saída em 2 execuções
- carteira vazia não quebra
- valor disponível menor que 1 cota -> tudo em leftover

PROIBIDO
- I/O dentro de askEngine/
- Reimplementar Bazin/Graham/Gordon (Regra 4)
- Criar componente React nesta etapa
- Assumir meta default
- Texto hardcoded

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-solution-architect | SIM | define a camada e seus contratos |
| fuente-architecture-review | SIM | gate contra violação de SSOT |
| fuente-advogado-lgpd-gdpr | SIM | "critério do usuário" é exigência regulatória |
| fuente-investidor-profissional | SIM | rigor da lógica de alocação |
| fuente-business-architect | SIM | capacidade de negócio nova |
| fuente-product-manager | SIM | escopo mínimo da fase |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-investidor-iniciante | NÃO | sem superfície visível |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(ask-engine): nucleo do motor de decisao [Item 0.3]
```

---

# PROMPT 134 — Estratégias de reinvestimento

```
Prompt 134 — Estrategias de reinvestimento [Item 1.2]

CONTEXTO
Três estratégias puras para "reinvisto onde?", plugadas no AskEngine.
Referência visual: protótipo v6, tela Reinvestir (abas de estratégia).

TAREFA
Criar em src/lib/askEngine/strategies/:

1. accelerateSnowball.ts — "Acelerar bola de neve"
   Prioriza maior DY entre ativos abaixo do teto e sem yield-trap.

2. correctDrift.ts — "Corrigir desvio"
   Prioriza classes mais abaixo da meta do usuário.
   VERIFICAR se balanceTargets (Prompt 133) já resolve — se sim, reusar
   ou parametrizar em vez de duplicar (Regra 1). Reportar a decisão.

3. reinforcePayer.ts — "Reforçar quem pagou"
   Aloca no próprio ativo que gerou o provento, se abaixo do teto.
   Se estiver acima do teto ou com yield-trap, retorna allocations VAZIO
   com reasonKey explicando. NUNCA faz fallback silencioso para outro ativo.

REQUISITOS
1. Funções puras, sem I/O.
2. Todas respeitam as exclusões configuradas pelo usuário.
3. Usam o yield-alvo POR CLASSE (Prompt 131) no cálculo de teto.
4. reasonKey + reasonParams estruturados.
5. Quantidade inteira; resto em leftover.
6. Determinismo em empates.

TESTES OBRIGATÓRIOS
- cada estratégia respeita exclusões do usuário
- reinforcePayer com ativo acima do teto -> vazio + razão, sem fallback
- invariante soma + leftover nas três
- determinismo em empate
- carteira vazia não quebra
- todas retornam 'targets_not_configured' quando aplicável

PROIBIDO
- I/O nas estratégias
- Recalcular valuation (Regra 4)
- Fallback silencioso
- Duplicar lógica que já existe em suggestedAllocation.ts

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-investidor-profissional | SIM | valida se a lógica resiste a escrutínio |
| fuente-solution-architect | SIM | contrato das estratégias |
| fuente-architecture-review | SIM | gate contra duplicação |
| fuente-advogado-lgpd-gdpr | SIM | confirma que não vira recomendação |
| fuente-product-manager | SIM | escopo das três estratégias |
| fuente-investidor-iniciante | NÃO | sem UI nesta etapa |
| fuente-ux-designer | NÃO | sem UI nesta etapa |
| fuente-business-architect | NÃO | capacidade já definida |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(ask-engine): tres estrategias de reinvestimento [Item 1.2]
```

---

# PROMPT 135 — AskScreen + tela Reinvestir

```
Prompt 135 — AskScreen reutilizavel e tela Reinvestir [Item 1.3]

CONTEXTO
Primeira materialização visual do motor. O <AskScreen> será REUSADO pelas
outras 4 perguntas (Regra 1) — projetar GENÉRICO desde o início.
Referência visual OBRIGATÓRIA: docs/design/v6/prototipo-v6.html, tela
"Reinvestir proventos". Reproduzir estrutura, hierarquia e textos.

INVESTIGAR ANTES (Regra 7)
1. Confirmar como obter proventos recebidos e ainda não reinvestidos
   (AUDITORIA-REUSO.md seção 4). Se o dado não existir, REPORTAR e propor
   — não inventar.
2. Verificar componentes reusáveis (AUDITORIA-REUSO.md seção 7):
   MetricBox para o rodapé, StatusBadge para os pills, ResultSkeleton
   para loading.
Apresentar plano ANTES de codar (Regra 8).

TAREFA (após aprovação)
Criar:
- src/components/ask/AskScreen.tsx (GENÉRICO)
- src/components/ask/AskAllocationRow.tsx
- src/routes/app/reinvestir.tsx

Anatomia do <AskScreen> (props, sem lógica de negócio):
- questionKey, amount (editável ou fixo), strategies, context, onExport

Comportamento (conforme protótipo):
- Pergunta em destaque + valor disponível
- Abas de estratégia; trocar recalcula via runAsk
- Cada linha: rank, ticker, barra proporcional, razão traduzida, valor, qtd
- Rodapé: consequências
- Disclaimer variante 'calculation' PERSISTENTE (Prompt 132)

REQUISITOS INEGOCIÁVEIS
1. ZERO lógica de negócio no componente (Regra 4). Todo cálculo vem do
   AskEngine. O componente só apresenta.
2. Zero hardcode (Regra 2), 3 idiomas. reasonKey do motor traduzida aqui
   com seus reasonParams.
3. Mobile-first (Regra 5): em 375px a linha empilha, não esmaga.
4. Qualidade visual premium (Regra 6): tokens do Prompt 128.
5. Acessibilidade: teclado, abas com role/aria corretos, respeitar
   prefers-reduced-motion nas transições de barra.
6. ESTADOS OBRIGATÓRIOS (todos):
   - carregando (ResultSkeleton)
   - metas não configuradas -> CTA para configurar, NÃO calcula nada
   - sem proventos disponíveis -> estado vazio explicativo
   - erro
   - sucesso
7. Feature gate: aplicar useFeatureGate. Reinvestir é tier GRÁTIS.

PROIBIDO
- Cálculo financeiro dentro do componente React
- Chamar getAssetValuation direto da tela
- Texto hardcoded
- Criar componente de lista se já existir equivalente
- Renderizar sugestão sem o disclaimer

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | anatomia reusável fiel ao protótipo |
| fuente-investidor-iniciante | SIM | clareza do "porquê" de cada linha |
| fuente-investidor-profissional | SIM | densidade e raciocínio exposto |
| fuente-solution-architect | SIM | garante componente genérico |
| fuente-architecture-review | SIM | gate do diff |
| fuente-advogado-lgpd-gdpr | SIM | linguagem não pode soar recomendação |
| fuente-product-manager | SIM | escopo dos estados e do gate |
| fuente-product-marketing | SIM | copy da pergunta é posicionamento |
| fuente-business-architect | NÃO | capacidade já modelada |

COMMIT
feat(reinvestir): AskScreen reutilizavel e tela de reinvestimento [Item 1.3]
```

---

# PROMPT 136 — Exportar CSV

```
Prompt 136 — Exportacao de ordens em CSV [Item 1.5]

CONTEXTO
Fecha o ciclo da primeira pergunta. Formato definido por Paulo: CSV padrão.
Referência: protótipo v6, botão "Exportar CSV" nas telas do motor.

TAREFA
Criar src/lib/askEngine/exportCsv.ts (função pura) e ligar ao onExport
do AskScreen.

Colunas do CSV:
ticker, operacao, quantidade, preco_referencia, valor_estimado,
data_geracao, estrategia_utilizada

REQUISITOS
1. Função PURA: recebe AskResult + metadados, devolve string CSV.
2. Cabeçalho do arquivo (linhas comentadas antes do CSV) contendo o
   disclaimer: sugestão de cálculo, não recomendação; critérios do usuário;
   decisão é do investidor. O aviso viaja COM o arquivo.
3. Separador e encoding compatíveis com Excel PT-BR (testar ; e UTF-8 BOM).
4. Decimais no padrão brasileiro.
5. Nome do arquivo: fuente-ordens-{pergunta}-{AAAA-MM-DD}.csv
6. preco_referencia é o preço usado no cálculo, com a data — deixar
   explícito que não é preço de execução garantido.
7. Zero hardcode nos rótulos visíveis (Regra 2).

TESTES OBRIGATÓRIOS
- CSV gerado tem exatamente as colunas especificadas
- disclaimer presente no cabeçalho
- valores decimais em formato BR
- AskResult vazio -> CSV só com cabeçalho, sem erro
- caracteres especiais em nomes escapados corretamente

PROIBIDO
- Omitir o disclaimer do arquivo
- Chamar a exportação de "ordem de compra" — é sugestão de cálculo
- I/O dentro da função pura (a função devolve string; quem baixa é a UI)

GATES OBRIGATÓRIOS (saída literal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | disclaimer deve viajar com o arquivo |
| fuente-investidor-profissional | SIM | formato precisa ser utilizável de fato |
| fuente-solution-architect | SIM | função pura, I/O na borda |
| fuente-architecture-review | SIM | gate do diff |
| fuente-ux-designer | SIM | affordance do botão e nome do arquivo |
| fuente-product-manager | SIM | escopo das colunas |
| fuente-investidor-iniciante | NÃO | recurso de usuário mais avançado |
| fuente-business-architect | NÃO | capacidade já modelada |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(ask-engine): exportacao de sugestoes em CSV [Item 1.5]
```

---

## Depois do 136

Ao fim do Prompt 136 você terá: identidade visual nova, navegação por verbos,
metas configuráveis, disclaimer, o motor, e **uma pergunta completa e
funcionando ponta a ponta**.

**Recomendação:** pare aqui e instrumente com PostHog antes de seguir. A Fase 2
(módulo fiscal) é a mais valiosa e a mais arriscada — vale entrar nela com dado
real de engajamento da primeira pergunta.

**Próximos prompts (não escritos ainda de propósito):** dependem do relatório
do Prompt 129 e do comportamento real da Fase 1. Escrevê-los agora repetiria
o erro de planejar sem evidência.

---

## Lembretes de verificação (para Paulo)

- Relatório do Prompt 129 deve ser **lido por você** antes do 130
- Gates são saída **literal** do terminal — nunca paráfrase
- Cada commit lista arquivos explicitamente; `git add -A` proibido
- Claude verifica cada diff contra os arquivos reais antes de aprovar
- Nenhum script contra Firestore (dev e prod compartilham projeto)
- Texto do disclaimer precisa de **advogado humano** antes de produção
