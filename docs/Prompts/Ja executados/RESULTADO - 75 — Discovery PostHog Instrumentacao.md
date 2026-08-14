# RESULTADO - 75 — Discovery: PostHog + Instrumentação de Funil (P0)

> Modo: discovery. Nenhuma biblioteca foi instalada, nenhum código de
> produção foi alterado. Este documento é insumo para decisão de Paulo,
> não uma implementação.

## 0. Contexto verificado no código

- `freeAssetLimit` está `Number.POSITIVE_INFINITY` em
  `src/lib/featureGates.ts` (`DEFAULT_FEATURE_GATES`) — paywalls
  desligados por decisão consciente, confirmando o que o SSOT descreve.
- `hasAnalyticsConsent()` já existe em `src/lib/cookieConsent.ts`
  (prompt 73). Hoje só é lido pelo banner de consentimento
  (`src/components/shared/CookieConsentBanner`, renderizado em
  `src/routes/__root.tsx`); nenhum bootstrap de analytics o consome
  ainda.
- `src/routes/privacy.tsx` renderiza `legalContent[locale].privacy` de
  `src/lib/legal-content.ts`. O texto publicado já cobre transferência
  internacional, mas **apenas para o operador Google Cloud/Firebase**
  (linhas 127/651): "Os servidores podem estar localizados fora do
  Brasil... esse tratamento internacional segue as salvaguardas
  contratuais padrão do Google Cloud". **Não há nenhuma menção a
  PostHog ou a um segundo operador de analytics** na política
  publicada hoje — se PostHog Cloud for adotado, o texto da Política de
  Privacidade precisa ser atualizado antes do go-live (novo item de
  operador de dados na lista + base legal para a transferência), não é
  só uma questão técnica.
- `cloudbuild.yaml` confirma que o projeto já roda em Google Cloud Run
  (deploy via `gcloud run deploy`, imagem em Artifact Registry) — ou
  seja, self-hosting de PostHog teria caminho natural de infra (mesmo
  provedor, mesma região possível), mas exige um serviço adicional
  (PostHog não roda como função serverless simples; precisa de
  Postgres/ClickHouse/Redis ou usar o modo "PostHog reduced footprint",
  o que é operação nova para um projeto solo-founder).

---

## 1. Eventos de funil mínimos

Critério de inclusão: cada evento precisa responder diretamente a uma
das duas perguntas de negócio em aberto — **(A) qual é o limite Free
ideal (hoje testado com hipótese de 8 ativos)** e **(B) o pricing
R$19,90/R$179 é sustentável dado o uso real**. Eventos que não ajudam
essas duas perguntas foram deixados de fora deliberadamente.

| Evento | Propriedades sugeridas | Por que ajuda (A) limite / (B) pricing |
|---|---|---|
| `account_created` | `signup_method` (email/google) | Baseline de aquisição; denominador de todas as taxas de conversão de funil. |
| `asset_added` | `asset_count_after` (contagem, não tickers) | Núcleo da decisão (A): mostra a distribuição real de quantos ativos os usuários acumulam. Permite simular onde um limite de 8 cortaria a base (percentil de usuários afetados). |
| `feature_gate_hit` | `gate_name` (ex.: `freeAssetLimit`, `cashflowUnlocked`), `would_have_blocked: true` | Como os gates estão sempre abertos hoje, este evento simula "quantas vezes um limite/paywall real teria interrompido o usuário" sem de fato bloquear ninguém — é o dado mais direto para calibrar tanto (A) quanto (B) antes de reativar qualquer coisa. |
| `screener_used` | — (sem filtros específicos de ticker) | Sinal de profundidade de uso; feature candidata a ficar atrás de paywall — ajuda (B) a decidir o que vale R$19,90 vs. R$179. |
| `cashflow_viewed` | — | Idem: hoje `cashflowUnlocked` é um gate existente; medir uso real informa se essa feature justifica tier pago. |
| `smart_allocation_used` | — | Idem `smartAllocationUnlocked`; feature de maior "sofisticação", candidata natural ao tier mais caro (R$179). |
| `csv_import_completed` | `rows_imported` (contagem, não conteúdo) | Sinal de usuário "sério"/migração de planilha — correlaciona com disposição a pagar; também mede fricção de onboarding. |
| `benchmark_export_used` (se existir a feature) | — | Já citado no backlog arquivado como candidato a gate; mesma lógica de `screener_used`. |
| `subscription_upsell_viewed` | `context` (ex.: qual gate disparou) | Mede quantas vezes uma tela de upsell seria mostrada, complementando `feature_gate_hit` com o lado "explicado ao usuário" da simulação. |
| `account_deleted` | `days_since_signup`, `assets_count_at_deletion` | Sinal de churn/abandono; cruza com (A) — usuários que saem com poucos ativos vs. muitos ajuda a validar se o limite proposto causaria fricção antes de qualquer valor entregue. |

Eventos propositalmente **fora** da lista mínima: cliques de UI
genéricos, page views granulares de toda rota, hovers, etc. — não
respondem a (A) ou (B) e só aumentam custo/ruído de instrumentação.
Podem ser adicionados depois, mas não são parte do MVP de funil.

---

## 2. Biblioteca e hospedagem: PostHog Cloud vs. self-hosted

Nenhuma opção é recomendada como decisão final — comparação para Paulo
escolher.

### PostHog Cloud (EUA ou UE, PostHog oferece as duas regiões)

Prós:
- Zero infra adicional; setup é só SDK + API key.
- Manutenção, upgrades, escalabilidade e uptime são do PostHog, não do
  Paulo (relevante para solo founder com tempo limitado).
- Free tier generoso (1M eventos/mês) cobre folgadamente o estágio
  atual do produto.
- Região UE do PostHog Cloud existe especificamente para reduzir a
  complexidade de transferência internacional — pode ser a opção que
  simplifica o problema de LGPD/GDPR, ao invés de piorá-lo.

Contras:
- Dado de comportamento de usuários brasileiros sai do país e vai para
  servidor de terceiro (EUA ou UE), com PostHog Inc. como novo operador
  de dados. Isso exige **atualizar a Política de Privacidade publicada**
  (`legal-content.ts` / `/privacy`) para listar PostHog como operador,
  descrever a base legal da transferência e as salvaguardas — hoje o
  texto só cobre Google Cloud.
  isso é um trabalho de compliance real, não cosmético.
- Introduz mais um DPA (Data Processing Agreement) a assinar/gerenciar.
- Recorrência de custo caso o volume de eventos cresça além do free
  tier.

### PostHog self-hosted (Google Cloud, mesmo provedor já usado)

Prós:
- Dado nunca sai da infraestrutura Google Cloud já contratada e já
  descrita na Política de Privacidade — não cria novo operador de
  dados, potencialmente **nenhuma mudança na política de privacidade
  é necessária** além de mencionar "uso interno para analytics de
  produto" (a confirmar com revisão de texto, mas o risco de compliance
  é bem menor).
  Também alinha com a região que a política já promete.
- Controle total sobre retenção de dados e deleção (importante para o
  fluxo de "excluir conta" já existente, que promete apagar dados
  permanentemente).

Contras:
- Trabalho de infra não trivial: PostHog self-host requer
  Postgres + ClickHouse + Redis (ou usar o hobby deploy simplificado
  via Docker Compose), operação, backups e upgrades — tempo real de um
  solo founder que hoje só opera Cloud Run + Firebase.
  PostHog oficialmente recomenda self-host apenas para quem tem
  capacidade de operação dedicada; não é "mais um serviço no Cloud
  Run", é infraestrutura stateful adicional.
- Sem free tier de suporte; qualquer bug de operação é responsabilidade
  do Paulo.
- Risco de o discovery técnico (este documento) subestimar o esforço de
  manter um serviço analítico rodando 24/7 além do app principal.

### Observação lateral

Existe uma terceira via não avaliada em profundidade aqui — PostHog
Cloud (região UE) como meio-termo entre "zero infra" e "sem
transferência para fora da UE/Brasil" — vale considerar se a
preocupação principal for **latência de compliance** e não custo de
operação. Fica registrado como opção a explorar se nenhuma das duas
acima for satisfatória.

---

## 3. Integração com o banner de consentimento

Ponto de entrada exato, condicionado a `hasAnalyticsConsent()`
(`src/lib/cookieConsent.ts`, já implementado, não alterado aqui):

1. **Novo módulo `src/lib/analytics.ts`** (a criar quando a
   implementação for aprovada) exportaria algo como
   `initAnalyticsIfConsented()` e `trackEvent(name, props)`, com um
   guard interno que sempre revalida `hasAnalyticsConsent()` antes de
   qualquer chamada ao SDK do PostHog — nunca confiar em um "já
   inicializou uma vez" para permitir eventos depois de um opt-out.
2. **Ponto de chamada em `src/routes/__root.tsx`**: hoje o componente
   raiz já tem um `useEffect` (linha 48, hoje usado só pelo
   `ErrorComponent` para `reportGoogleError`). O bootstrap de analytics
   entraria como um `useEffect` irmão no componente principal do root
   (não no `ErrorComponent`), rodando uma vez no mount:
   ```
   useEffect(() => {
     if (hasAnalyticsConsent()) {
       initAnalyticsIfConsented();
     }
   }, []);
   ```
3. **Reação a mudança de consentimento em tempo real**: como o usuário
   pode aceitar o banner depois do mount inicial
   (`CookieConsentBanner`, renderizado no próprio `__root.tsx`, linha
   149), o botão de "aceitar" do banner precisaria, além de chamar
   `setCookieConsent(true)`, também disparar
   `initAnalyticsIfConsented()` diretamente (ou o root reagir a um
   evento/estado compartilhado) — do contrário o PostHog só ligaria no
   próximo reload da página, o que é uma experiência ruim mas
   aceitável como v1 se simplicidade for prioridade.
4. **Opt-out**: se o usuário já tinha consentido e depois revoga (fluxo
   de configurações, se existir), o módulo `analytics.ts` deve chamar
   `posthog.opt_out_capturing()` (API nativa do SDK) e idealmente
   `posthog.reset()` para não reter identidade local.
5. Nenhuma chamada ao SDK do PostHog deve existir fora desse módulo
   central — todo o app dispara eventos via `trackEvent(...)`, nunca
   importando `posthog-js` diretamente em componentes, para manter o
   gate de consentimento em um único lugar auditável.

---

## 4. Dados que NUNCA vão para o PostHog

Regra geral: eventos descrevem **comportamento de uso**, nunca **o
conteúdo financeiro** do usuário.

Proibido enviar como propriedade de evento, em qualquer evento, sem
exceção:
- Valores em R$ (ou qualquer moeda) de patrimônio, aportes, saldo,
  P&L, valor de ativo individual ou de carteira.
- Tickers específicos que o usuário possui ou pesquisou (ex.: nunca
  `{ ticker: "PETR4" }`) — usar apenas contagens agregadas
  (`asset_count_after: 12`), nunca a identidade dos ativos.
- E-mail, nome completo, CPF ou qualquer PII direta como propriedade
  de evento de produto.
- Identificador de usuário (`distinct_id` do PostHog) não deve ser o
  e-mail nem o UID do Firebase em texto plano — usar um ID
  pseudonimizado (ex.: hash do UID, ou o próprio `distinct_id`
  autogerado do PostHog sem `identify()` explícito) enquanto não houver
  necessidade real de linkar sessão↔usuário. Se algum dia for
  necessário (ex.: para medir conversão real de um usuário específico
  a pagante), isso exige decisão explícita de Paulo e atualização da
  Política de Privacidade — não é default.
- Conteúdo de CSV importado (linhas, valores) — apenas a contagem
  (`rows_imported`) como já listado na tabela de eventos.
- Qualquer texto livre digitado pelo usuário (notas, nomes customizados
  de ativos, etc.).

---

## 5. Próximos passos (não executados aqui)

1. Paulo decide: PostHog Cloud (EUA/UE) vs. self-hosted vs. adiar.
2. Se Cloud: atualizar `legal-content.ts` (`/privacy`) para listar
   PostHog como operador antes de qualquer instalação de SDK.
3. Novo prompt de execução (fora do escopo deste discovery) criaria
   `src/lib/analytics.ts`, instalaria `posthog-js`, e ligaria o
   `useEffect` descrito na seção 3.
4. Nenhuma decisão de pricing ou limite Free é tomada aqui — este
   documento só prepara a coleta de dado que vai informar essa decisão
   depois de um período de uso real instrumentado.
