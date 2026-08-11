# Fuente Price Pro — Mapeamento de Arquitetura Corporativa

> **Histórico de versões:**
> - v1 (indatada, chat de origem): mapeamento inicial — capability map, value streams, BPMN, BIAN, benchmark.
> - v2 (01/08/2026, chat 3): atualizada após Tarefas 43/44/45 (Rebalanceamento por Meta, auditoria de 2 rodadas, 7 correções pontuais).
> - **v3 (10/08/2026, esta sessão)** — atualização abaixo. Nenhuma das duas versões anteriores tinha sido de fato persistida em `docs/arquitetura/EA_MAPPING.md` nem as 5 imagens salvas em `imagens/` — corrigido agora.
>
> **Nota de proveniência:** as seções 1–5 mantêm a leitura da v2 onde esta sessão não gerou evidência nova (Alertas, Rebalanceamento por meta, Radar Global dinâmico, KYC, motor WHT, Painel Admin, decisão de monetização — nenhum desses foi tocado nesta sessão, carregados como estavam). Onde há atualização real desta sessão, está marcado explicitamente com **"Atualização 10/08"**. As 5 imagens originais (`img1_capability_map.png` a `img5_benchmark.png`) ainda não foram salvas em `docs/arquitetura/imagens/` — pendência de ação sua, não deste documento.

**Fontes desta atualização**: leitura direta de código via Filesystem MCP + clone GitHub (branch `dev`), `npx tsc --noEmit` e `npx vitest run` executados de verdade (não só relatados), revisão de 3 planos de implementação do Antigravity (Tasks 15.4 e 15.6), Relatório de Diagnóstico Arquitetural (Code Sweep completo), varredura de bugs de UI via screenshots reais, e pesquisa de 12 repositórios externos incorporada ao `BACKLOG_V2.md`.

---

## 1. Business Capability Map (Gartner-style)

*(imagens ainda pendentes de salvar em `imagens/`)*

1. **Market Intelligence & Valuation Engine** — maduro. **Atualização 10/08**: bug real de cálculo corrigido — o modelo de Gordon podia explodir para valores absurdos (ex: R$ 1.920 num FII cujo consenso deveria ficar perto de R$ 125) quando `k - g` se aproximava de zero, e o consenso (antes média aritmética simples) ficava sequestrado por esse outlier. Guard de margem mínima (`GORDON_MIN_DISCOUNT_MARGIN`) e consenso por mediana já implementados e confirmados no código. Isso também fechou um risco reputacional real: a interface chegou a exibir "Golden opportunity! 591% Undervalued" para um ativo cujo número estava simplesmente errado — supressão de copy eufórica em casos matematicamente implausíveis também já está em produção.
2. **Portfolio & Position Management** — maduro, com uma ressalva nova. **Atualização 10/08**: identificada e **decidida** (não ainda implementada) uma dívida de SSOT real — `quantity` tinha 3 caminhos de escrita paralelos (edição manual, edição em massa, eventos corporativos) que podiam divergir do que o histórico de transações realmente mostrava (caso real observado: UI mostrando 70 cotas num lugar e 100 em outro do mesmo ativo). Decisão arquitetural tomada: `quantity` passa a ser **derivado** das transações, nunca persistido — implementação em andamento via Task 15.4 (plano aprovado).
3. **Income & Goal Planning** — maduro/parcial. **Atualização 10/08**: bug real e ainda **não corrigido** encontrado no card "Upcoming Payments" — ele filtra por data-ex em vez de data de pagamento, o que faz exatamente os ativos com pagamento mais iminente **sumirem** do card (quanto mais perto o pagamento, maior a chance de a data-ex já ter passado e o item ser descartado). Existem hoje 3 implementações paralelas da mesma pergunta de negócio ("quando é o próximo pagamento") com respostas diferentes entre si — candidato a unificação numa próxima rodada, ainda no backlog.
4. **Risk & Allocation Management** — majoritariamente maduro (herdado da v2, sem mudança nesta sessão). Alertas segue como a peça faltante.
5. **Tax & Compliance Engine** — parcial/lacuna (sem mudança nesta sessão).
6. **Identity, Trust & Platform Enablement** — **Atualização 10/08 (achado importante)**: a v2 já registrava a infraestrutura de `FEATURE_GATES` como pronta. Nesta sessão, uma varredura mais profunda encontrou que o hook de assinatura (`useSubscription`) tinha `isPro` **hardcoded como `true`** — ou seja, todo usuário, pago ou não, era tratado como Pro, independente do `tier` real. Esse bug já foi corrigido (confirmado por leitura direta do código: `isPro` agora deriva de `subscriptionStatus` real do Firestore). Além disso, o botão de "Upgrade to Pro" (`PaywallDialog`) estava com a cor de marca errada (herdando o bug do token `--primary`, ver abaixo) **e** apontava para uma rota `/pricing` que não existe (404 garantido) — também corrigido, redirecionando para `/settings` até existir uma página de pricing real. Achado adicional de governança: a pasta `skills/` com as 9 Regras de Ouro formalizadas **não existia no repositório** até esta sessão — só existia na memória de conversas do Claude. Agora está commitada (`skills/*/SKILL.md` + `MANIFEST.json`), fechando um risco real de a governança do projeto depender de contexto de chat em vez de arquivo versionado.

**Leitura direta**: os domínios 1, 2 (com ressalva) e 4 estão maduros. O domínio 6 teve um bug de monetização real corrigido nesta sessão — o sistema de Pro/Free, embora "pronto" na v2, na prática **não distinguia usuários** até agora. Isso é relevante para a decisão de monetização pendente (item 2 da Gap Analysis): a infraestrutura agora está genuinamente confiável, não só presente.

---

## 2. Value Streams (TOGAF-style)

- **VS1 — Descobrir & Avaliar**: maduro (sem mudança nesta sessão).
- **VS2 — Construir & Manter Portfólio**: **Atualização 10/08**: rebaixado de "100% maduro" para "maduro com dívida de SSOT identificada" — ver capability 2 acima (`quantity` divergente). O value stream em si funciona, mas a fonte de verdade de posição tem um problema real em andamento de correção.
- **VS3 — Monitorar & Otimizar**: sem mudança na parte de Rebalanceamento (herdado da v2). **Atualização 10/08**: novo bug encontrado no estágio de "Cash Flow" — o "próximo pagamento" está estruturalmente errado (ver capability 3). Isso é relevante porque a v2 tratava Cash Flow como "pronto"; nesta sessão ficou claro que "pronto" não significa "correto".
- **VS4 — Alcançar Independência Financeira**: sem mudança nesta sessão.
- **VS5 — Confiar na Plataforma**: **Atualização 10/08**: o bug de `isPro` hardcoded (capability 6) significa que, até esta sessão, a "confiança" no sistema de assinatura era ilusória — tecnicamente presente, funcionalmente inoperante. Corrigido agora. Monetização como decisão de negócio continua pendente (sem mudança), mas a infraestrutura por trás dela está mais sólida do que a v2 registrava.

---

## 3. Processo Crítico em BPMN-lite: Ciclo de Vida do Ativo

Sem mudança nesta sessão — processo mais auditado do sistema continua correto, sem regressão encontrada.

**Nota nova (10/08)**: o mesmo padrão de rigor aplicado a esse processo (auditoria dupla, verificação contra arquivo real) foi replicado nesta sessão para os planos de implementação do Antigravity (Tasks 15.4 e 15.6) — em ambos os casos, a primeira versão do plano continha um erro real (respectivamente: uma ambiguidade técnica não resolvida entre dois campos incompatíveis, e um padding duplicado que criaria exatamente o layout shift que a task deveria eliminar). Os dois só foram aprovados depois de correção. Isso reforça que o processo de revisão em duas camadas (plano → aprovação → implementação → verificação) está funcionando como desenhado, não é burocracia redundante.

---

## 4. Mapeamento BIAN-Inspirado

- `Customer Case Management` → sem mudança.
- `Alert Notification` → sem mudança, lacuna total.
- `Regulatory Compliance` (KYC) → sem mudança.
- `Product Fulfillment Billing` → **Atualização 10/08**: como descrito acima, a infraestrutura não só existe como teve um bug de monetização real corrigido (`isPro` hardcoded + Paywall quebrado). Sobe de "infra pronta, esperando decisão" para "infra pronta **e agora confiável**, esperando decisão".
- `Investment Portfolio Planning` → sem mudança (maduro desde a v2).

---

## 5. Benchmark Competitivo

Sem mudança de fundo nesta sessão — os achados de bug não alteram a posição competitiva reportada na v2 (motor de valuation multi-modelo, importação de notas, simulação, i18n nativo como diferenciais; alertas, social e Radar Global dinâmico como lacunas).

**Nota nova (10/08)**: a pesquisa de repositórios externos (12 projetos, incluindo `Victorcorcos/winning-investments` e `georgenv/value-investing-br`) confirmou que o motor de consenso multi-modelo continua sendo um diferencial genuíno — mas também revelou 2 dimensões de análise popular entre investidores BR que o produto ainda não cobre: **Piotroski F-Score** (saúde financeira/tendência, complementar ao consenso de preço) e **Greenblatt Magic Formula** (validada por 2 fontes BR independentes). Registrados no `BACKLOG_V2.md` como candidatos de evolução do motor de valuation, não como bugs.

---

## 6. Gap Analysis × Backlog — Priorização (revisada 10/08)

| # | Lacuna / Achado | Origem | Impacto | Prioridade |
|---|---|---|---|---|
| 1 | Alertas / Notificações | v2, sem mudança | Alto | 🔴 P0 |
| 2 | Decisão de monetização (Free vs Pro) | v2 — **infra agora confirmada confiável** (10/08) | Crítico | 🔴 P0 (decisão) |
| 3 | **NOVO (10/08)**: `NextPaymentBanner` usa data errada — ativos com pagamento iminente somem do card | Achado desta sessão, verificado em código | Alto — afeta a promessa central do produto (investidor de dividendos) | 🔴 **P0** |
| 4 | **NOVO (10/08)**: 19 erros de `tsc --noEmit` não pegos por `test`/`build` (inclui `investingSince` obrigatório quebrando 3 componentes de produção) | Achado desta sessão, verificado rodando o compilador de verdade | Alto — risco de runtime silencioso | 🔴 **P0** |
| 5 | **NOVO (10/08)**: `quantity` com 3 caminhos de escrita divergentes do histórico de transações | Achado desta sessão + decisão de Paulo (derivado, não persistido) | Alto — SSOT de posição | 🔴 **P0** (implementação em andamento, Task 15.4) |
| 6 | Radar Global com lista de tickers fixa | v2, sem mudança | Médio-Alto | 🟡 P1 |
| 7 | Motor WHT multi-moedas | v2, sem mudança | Médio-Alto | 🟡 P1 |
| 8 | KYC / Onboarding regulatório | v2, sem mudança | Médio | 🟡 P1 |
| 9 | Painel Admin | v2, sem mudança | Médio-Alto | 🟡 P1 |
| 10 | **NOVO (10/08)**: `devMockData.ts` + botão de reset destrutivo em DEV apontando para o Firebase de produção | Achado desta sessão + decisão de Paulo (DEV só lê, nunca escreve) | Alto — segurança de dado | 🟡 P1 (remoção pendente) |
| 11 | **NOVO (10/08)**: Code splitting das 6 rotas principais (`React.lazy`) | Code Sweep desta sessão | Médio — performance de carregamento inicial | 🟡 P1 (em andamento, Task 15.6 — 1 de 6 rotas concluída) |
| 12 | **NOVO (10/08)**: Piotroski F-Score + Greenblatt Magic Formula como dimensões novas do motor de valuation | Pesquisa de repositórios externos | Médio — diferenciação competitiva | 🟢 P2 |
| 13 | AI Assistant | v2, sem mudança | Médio | 🟢 P2 |
| 14 | `firestorePaths.ts` — centralização de paths | v2, sem mudança | Médio | 🟢 P2 |
| 15 | Camada 2 — data via nota importada | v2, sem mudança | Baixo-Médio | 🟢 P2 |
| ~~16~~ | ~~Bug de cálculo do Gordon explodindo/sumindo~~ | Achado e corrigido nesta sessão | — | ✅ Concluído |
| ~~17~~ | ~~`isPro` hardcoded — monetização não distinguia usuários~~ | Achado e corrigido nesta sessão | — | ✅ Concluído |
| ~~18~~ | ~~PaywallDialog com cor errada e link morto~~ | Achado e corrigido nesta sessão | — | ✅ Concluído |
| ~~19~~ | ~~Governança da pasta `skills/` ausente do repo~~ | Achado e corrigido nesta sessão | — | ✅ Concluído |
| ~~20~~ | ~~Bug mobile do `AssetDetailSheet`~~ | v2 | — | ✅ Concluído (herdado) |
| ~~21~~ | ~~Rebalanceamento por meta~~ | v2 | — | ✅ Concluído (herdado) |

---

## 7. Recomendação de Sequenciamento (revisada 10/08)

A ordem muda em relação à v2 porque esta sessão encontrou 5 itens novos de severidade P0, três deles bugs reais em produção (não dívida técnica abstrata):

1. **Fechar os 19 erros de `tsc --noEmit`** (item 4) — é o mais barato de corrigir e o que mais reduz risco de regressão silenciosa nos próximos itens desta lista, porque vários deles tocam os mesmos arquivos.
2. **`NextPaymentBanner`** (item 3) — é o bug que motivou a revisão desta sessão inteira; afeta diretamente a proposta de valor central do produto.
3. **`quantity` derivado das transações** (item 5) — já com decisão tomada e plano aprovado (Task 15.4); concluir antes de tocar novamente no `NextPaymentBanner`, já que este último consome a quantidade do ativo no cálculo do valor a receber.
4. **Remover a escrita destrutiva de DEV no Firebase** (item 10) — rápido, isolado, sem dependência.
5. **Concluir o code splitting das 6 rotas** (item 11) — já em andamento, seguir a metodologia rota-a-rota já aprovada.
6. Depois disso, retomar a sequência da v2: decisão de monetização (2) → Alertas (1) → Radar Global (6) → Painel Admin (9) → KYC/AI Assistant (8/13).

---

*Documento consolidado nesta sessão a partir de leitura direta de código (Filesystem MCP + clone GitHub), execução real de `tsc`/`vitest`/`build`, revisão de 2 planos de implementação do Antigravity, Relatório de Diagnóstico Arquitetural completo, varredura de bugs de UI via screenshots, e pesquisa de 12 repositórios externos. Substitui as versões v1 e v2 anteriores, que não haviam sido persistidas neste caminho.*
