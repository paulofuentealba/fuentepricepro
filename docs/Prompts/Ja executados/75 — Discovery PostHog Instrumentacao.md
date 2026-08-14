# 75 — Discovery: PostHog + Instrumentação de Funil (P0)

## 🛑 Modo de operação: discovery, não implementação

Este item envolve decisão de pricing (R$19,90/R$179 mencionados no SSOT
como não confirmados) e desenho de eventos de funil — não é um prompt de
código direto, é desenho técnico + lista de decisões pra Paulo antes de
qualquer linha de código.

## Contexto

Item P0 do SSOT: "Bloqueia validação de dado real do item 1.3 (limite de
8 ativos, pricing R$19,90/R$179)". Hoje `freeAssetLimit` está aberto
(`999999`) por decisão consciente de produto (paywalls desligados) — ou
seja, o PostHog não é só "adicionar analytics", é a peça que falta pra
decidir se/quando reativar a monetização com dado real de uso, não
achismo.

## Escopo do discovery

### 1. Mapear os eventos de funil mínimos

Antes de instalar qualquer biblioteca, listar os eventos que realmente
importam pra validar as 2 perguntas de negócio em aberto (limite Free
ideal, pricing): ex: `asset_added` (com contagem atual do usuário),
`feature_gate_hit` (quando um `useFeatureGate` bloquearia se estivesse
ativo — hoje sempre falso, mas o evento pode ser disparado mesmo assim
pra simular "quantas vezes isso teria bloqueado"), `screener_used`,
`cashflow_viewed`, `smart_allocation_used`, `csv_import_completed`,
`account_created`, `account_deleted`. Propor a lista completa, com
justificativa de por que cada evento ajuda a decisão de pricing/limite,
não só "instrumentar tudo por precaução".

### 2. Decisão de biblioteca e hospedagem

PostHog Cloud (mais simples, dado sai dos EUA/UE — **considerar
implicação de transferência internacional de dado, já que a Política de
Privacidade publicada menciona isso**) vs. PostHog self-hosted (mais
trabalho de infra, dado fica no Google Cloud já usado). Propor
recomendação com prós/contras, não decidir sozinho.

### 3. Integração com o banner de consentimento (item 73, já resolvido antes deste)

O PostHog só pode inicializar se `hasAnalyticsConsent()` (helper já
criado no item 73) retornar `true`. Desenhar exatamente onde essa
checagem entra no ciclo de vida do app (ex: `app.tsx`, no mount,
condicional).

### 4. Dados sensíveis — o que NUNCA vai pro PostHog

Listar explicitamente o que não deve ser enviado como propriedade de
evento: valores em R$ de patrimônio real, tickers específicos da
carteira do usuário, e-mail/nome (a menos que PostHog seja configurado
com hash/anonimização de identidade) — eventos devem ser sobre
**comportamento de uso**, não replicar dado financeiro sensível pra um
serviço de terceiro.

## Regras obrigatórias

- Não instalar nenhuma biblioteca nesta rodada — só o desenho.
- Não decidir pricing nem limite Free — isso é decisão de Paulo, ajudada
  pelo dado que este item vai gerar depois de ativo, não decidida antes.

## Entregável esperado

Documento markdown com a lista de eventos, recomendação de
biblioteca/hospedagem, desenho de integração com consentimento, e lista
de dados proibidos — pra revisão de Paulo antes de qualquer prompt de
execução.
