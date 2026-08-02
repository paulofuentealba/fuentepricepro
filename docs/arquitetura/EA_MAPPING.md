# Fuente Price Pro — Mapeamento de Arquitetura Corporativa

> Gerado em 01/08/2026, via Claude (chat 3 deste projeto). Frameworks de referência: TOGAF (Value Streams), Gartner (Business Capability Model), BPMN (processo crítico), BIAN (adaptado — vocabulário de referência, não padrão formal aplicável 1:1 a wealthtech B2C).
>
> **Atualizado em 01/08/2026 (mesmo dia, mesma sessão)** — após implementação do Rebalanceamento por Meta (Prompts A/B/C), uma auditoria completa do código-fonte (2 rodadas), e a correção de 7 pontos pontuais reportados via screenshot. Ver Tarefas 43, 44 e 45 no `PROMPTS_LOG.md` para o detalhe completo de cada mudança. As seções abaixo foram revisadas pra refletir o estado real do código agora, não mais o estado de quando o mapeamento foi criado.
>
> As 5 imagens originais deste mapeamento (capability map, value streams, BPMN, BIAN, benchmark) foram geradas no chat e disponibilizadas para download em `/mnt/user-data/outputs/imagens/` daquela sessão. Salve-as manualmente nesta mesma pasta (`docs/arquitetura/imagens/`) para manter o mapeamento completo e navegável localmente — elas ainda refletem a estrutura geral corretamente, só a maturidade de alguns itens mudou (ver notas de atualização em cada seção):
> - img1_capability_map.png
> - img2_value_stream.png
> - img3_bpmn.png
> - img4_bian.png
> - img5_benchmark.png

**Fontes**: código-fonte real (`C:\Users\paulo\OneDrive\Fuente Price Pro`), `PROMPTS_LOG.md`, `BACKLOG_V2.md`, e histórico das 3 sessões de trabalho neste projeto.

---

## 1. Business Capability Map (Gartner-style)

*(ver imagens/img1_capability_map.png — imagem original; leitura de maturidade atualizada abaixo)*

O app foi agrupado em **6 domínios de capacidade** (independentes de tela/feature):

1. **Market Intelligence & Valuation Engine** — o coração do produto (Bazin/Graham/Gordon → Fuente Consensus). Maduro. **Atualização**: bug real corrigido no Graham — o parâmetro usado na API da Brapi nunca trazia o P/VP, deixando esse pilar "N/A" sistematicamente. Corrigido (Tarefa 45.2); pendente só de configurar o token no Cloud Build.
2. **Portfolio & Position Management** — CRUD de ativos, ledger de transações, import de notas, eventos corporativos. Maduro.
3. **Income & Goal Planning** — Cash Flow, metas, Snowball, Modo FI. Maduro/Parcial.
4. **Risk & Allocation Management** — Risk Radar, Smart Allocation, rebalanceamento, alertas. **Atualização**: subiu de Parcial/Lacuna para **Majoritariamente Maduro** — Alocação-Alvo, Teto de Concentração, cálculo de desvio e motor de sugestão de aporte ("Aporte Inteligente") todos implementados (Tarefa 43). Só falta Alertas (gatilho de notificação).
5. **Tax & Compliance Engine** — WHT, JCP, LGPD, KYC. Parcial/Lacuna.
6. **Identity, Trust & Platform Enablement** — Auth, i18n, monetização, admin. **Atualização**: a infraestrutura de monetização **já existe** no código (`FEATURE_GATES`, `useSubscription`, `PaywallDialog`) — só está com tudo desligado (`false`) por decisão deliberada, aguardando o Painel Admin pra virar um toggle de verdade. Não é mais "não implementado", é "implementado e desligado".

**Leitura direta**: os domínios 1, 2 e agora 4 estão maduros. Domínios 5 e 6 continuam com lacunas reais de negócio (KYC, Painel Admin) — não é falta de qualidade, é ausência de decisão/construção ainda.

---

## 2. Value Streams (TOGAF-style)

*(ver imagens/img2_value_stream.png — imagem original; leitura atualizada abaixo)*

Cinco jornadas de valor, do gatilho do investidor até o valor entregue:

- **VS1 — Descobrir & Avaliar**: quase totalmente maduro. Decision Desk teve UX corrigida (abas de posição/transações removidas do contexto de comparação hipotética, Tarefa 45.7) — sobe pra maduro.
- **VS2 — Construir & Manter Portfólio**: 100% maduro. Value stream mais testado e blindado.
- **VS3 — Monitorar & Otimizar**: **Atualização**: rebalanceamento por meta deixou de ser lacuna — Alocação-Alvo, Teto de Concentração e motor de sugestão de aporte implementados. Falta só Alertas (Prompt D, ainda dependente de decisão de infraestrutura de notificação).
- **VS4 — Alcançar Independência Financeira**: forte em simulação; Modo FI e acompanhamento de progresso parciais.
- **VS5 — Confiar na Plataforma**: Auth e LGPD maduros; monetização tem a infraestrutura pronta (`FEATURE_GATES`), só falta a decisão de negócio de o que vira Pro e o Painel Admin pra controlar isso.

---

## 3. Processo Crítico em BPMN-lite: Ciclo de Vida do Ativo

*(ver imagens/img3_bpmn.png)*

Processo que concentrou **todos os bugs críticos de perda de dado** encontrados nas últimas sessões:

- O gateway `userId && !USE_LOCAL_ONLY` foi onde a Tarefa 38 travou em produção.
- O caminho de escrita no Firestore (`itemToRow` → `setDoc`) foi onde a auditoria encontrou o path divergente na migração (`watchlist_items` vs `users/{uid}/assets`) que causou a perda "fantasma" do BBSE3.
- **Atualização (Tarefa 44)**: uma auditoria completa de 2 rodadas confirmou que esse processo continua correto e não regrediu, e ainda encontrou 9 bugs/hardcodes menores em outras áreas do código (todos corrigidos). É hoje o processo mais auditado do sistema — vale usar o mesmo rigor como padrão pros próximos processos críticos.

---

## 4. Mapeamento BIAN-Inspirado

*(ver imagens/img4_bian.png — imagem original; leitura atualizada abaixo)*

BIAN é taxonomia de bancos — usada aqui como vocabulário de referência corporativa para revelar buracos de nomenclatura que apontam para capacidades ausentes:

- `Customer Case Management` → sem sistema estruturado de suporte/ticket.
- `Alert Notification` → lacuna total (única peça que falta pra fechar o domínio de Risk & Allocation).
- `Regulatory Compliance` (KYC) → LGPD existe (exclusão), onboarding regulatório formal não.
- `Product Fulfillment Billing` → **Atualização**: infraestrutura já existe (`FEATURE_GATES`, `useSubscription`), só sem UI de gestão (Painel Admin) nem decisão de negócio de quais features ficam atrás do Pro.
- `Investment Portfolio Planning` (que cobre alocação-alvo e rebalanceamento sugerido) → **Atualização**: maduro agora, implementado na Tarefa 43.

---

## 5. Benchmark Competitivo

*(ver imagens/img5_benchmark.png)*

Comparação qualitativa (0-10, estimativa de mercado) contra Investidor10, StatusInvest e Snowball Analytics.

**Onde lideramos**: motor de valuation (consenso multi-modelo, agora com Graham corrigido), importação automática de notas (9 corretoras + fallback), simulação/projeção, suporte multi-mercado BR+US com i18n nativo, **e agora também rebalanceamento por meta com dois modos (Alocação-Alvo + Teto de Concentração) que nenhum dos 3 benchmarks separa claramente**.

**Onde o mercado lidera**: alertas de preço (ainda lacuna nossa), comunidade/social (Investidor10), Radar Global dinâmico com atualização automática de universo de ativos (nosso Radar Global tem lista de tickers fixa hoje — achado na Tarefa 45.5, backlog).

---

## 6. Gap Analysis × Backlog — Priorização (revisada)

| # | Lacuna identificada | Item no Backlog | Impacto | Prioridade |
|---|---|---|---|---|
| 1 | Alertas / Notificações (agora única peça faltando do VS3) | Prompt D / Tarefa 29.5 | Alto — lacuna mais visível no benchmark, e depência do motor de sugestão de aporte já pronto | 🔴 P0 |
| 2 | Decisão de monetização (Free vs Pro) | Decisão pendente — infraestrutura JÁ EXISTE (`FEATURE_GATES`) | Crítico para sustentabilidade do negócio — só falta decidir o QUE fica Pro | 🔴 P0 (decisão) |
| 3 | Radar Global com lista de tickers fixa (não dinâmica) | Tarefa 45.5, novo item de backlog | Médio-Alto — investigado: Brapi não tem endpoint gratuito de screener por yield; precisa desenho de solução (varredura de universo + job agendado) | 🟡 P1 |
| 4 | Motor WHT multi-moedas | Tarefa 29.2 | Médio-Alto | 🟡 P1 |
| 5 | KYC / Onboarding regulatório | Tarefa 30 | Médio | 🟡 P1 |
| 6 | Painel Admin (inclui o toggle de `FEATURE_GATES`) | Tarefa 30 | Médio-Alto — sobe de prioridade porque já tem infra esperando por ele | 🟡 P1 |
| 7 | AI Assistant | Tarefa 30 | Médio | 🟢 P2 |
| 8 | Camada 2 (data via nota importada) | Mencionada, não priorizada | Baixo-Médio | 🟢 P2 |
| 9 | `firestorePaths.ts` — centralização de paths | Backlog, deferida | Médio — auditoria (Tarefa 44) confirmou paths consistentes hoje, mas ainda hardcoded em vários arquivos sem função central | 🟢 P2 (baixou — auditoria não achou bug novo desse padrão) |
| ~~10~~ | ~~Bug visual: abas do AssetDetailSheet no mobile~~ | ~~Tarefa 42~~ | — | ✅ Concluído |
| ~~11~~ | ~~Rebalanceamento por meta~~ | ~~Tarefa 43~~ | — | ✅ Concluído |
| ~~12~~ | ~~Consenso Fuente com pilar faltando (Graham)~~ | ~~Tarefa 45.2~~ | — | ✅ Concluído (pendente só config. do token) |

---

## 7. Recomendação de Sequenciamento (revisada)

1. **Configurar o `_BRAPI_TOKEN` no Cloud Build** (ação de 5 minutos, já documentada) — destrava o Graham em produção pra praticamente todo ativo BR.
2. **Decidir modelo de monetização** — a infraestrutura já existe e está só esperando a decisão de quais features (Alocação-Alvo? Teto de Concentração? Estratégias avançadas do Smart Allocation?) ficam atrás do Pro. Essa decisão desbloqueia o desenho certo do Painel Admin também.
3. **Alertas** — única peça que falta pra fechar de vez o VS3 (Monitorar & Otimizar). Motor de sugestão de aporte já pronto esperando o gatilho.
4. **Radar Global dinâmico** — requer desenho de solução (a Brapi não oferece screener por yield de graça), discutir abordagem antes de prometer prazo.
5. **Painel Admin** — depois da decisão de monetização (#2), já que o painel precisa saber o que está controlando.
6. **KYC, AI Assistant** — seguem depois, sem bloqueio direto dos itens acima.

---

*Documento gerado a partir de leitura direta do código-fonte, `PROMPTS_LOG.md`, `BACKLOG_V2.md` e histórico das 3 sessões de trabalho registradas neste projeto. Atualizado em 01/08/2026 refletindo as Tarefas 43 (Rebalanceamento por Meta), 44 (Auditoria completa) e 45 (7 correções pontuais).*
