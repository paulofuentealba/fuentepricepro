# Prompt para Antigravity — Discovery: Taxonomia de Status de Ingestão (P1)

## 🛑 Modo de operação

Este prompt é só de **discovery/desenho**, não implementação. Nenhum
`create_file`/`str_replace` em código de produção nesta rodada — a
entrega é um documento de decisão técnica, revisado por Paulo e por mim
antes de qualquer prompt de execução.

## Contexto

Hoje as 8 fontes de dado externas do app (`brapi.server.ts`,
`yahoo.server.ts`, `cvm.server.ts`, `secEdgar.server.ts`,
`nasdaq.server.ts`, `benchmark.server.ts`, mais os `createServerFn` em
`apiService.functions.ts`) seguem o padrão "falha silenciosa, retorna
vazio/null" — sem log persistido, sem distinção entre tipos de falha.
Isso já foi causa-raiz confirmada de pelo menos 2 bugs investigados nesta
sessão (Global Radar 0/0/0, divergência de `bvps`).

**Referência de taxonomia** (`wilsonfreitas/brasa`, adaptar não copiar
literalmente — é Python/SQLite, nosso stack é TS/Firestore):

| Status | Gatilho |
|---|---|
| `PASSED` | Download com sucesso |
| `FAILED` | Falha esperada (ex: exceção de negócio conhecida) |
| `ERROR` | Exceção inesperada |
| `SKIPPED` | Pulado (cache hit / decisão de negócio) |
| `INVALID` | Conteúdo retornou mas falhou validação (ex: array vazio, campo obrigatório ausente) |
| `WARNING` | Sucesso com ressalva (ex: fallback pra fonte secundária) |

(`DUPLICATED` do brasa não se aplica — não temos storage de arquivo raw.)

## Escopo do discovery

### 1. Mapear todos os pontos de entrada reais

Confirmado por grep prévio: `fetchWithRetry` em
`src/lib/api/http.server.ts` é o único ponto por onde passa toda chamada
HTTP externa das 8 fontes. Confirmar se há algum ponto de acesso a dado
externo que **não** passa por `fetchWithRetry` (ex: leitura direta de
`enrichedFundamentals` no Firestore em `cvm.server.ts`, que é dado
pré-processado, não uma chamada de rede) — esses também precisam de
status, mesmo sem HTTP envolvido.

### 2. Decisão arquitetural — onde instrumentar cada status

`fetchWithRetry` só enxerga nível de transporte (`PASSED`/`FAILED`/
`ERROR` dá pra derivar automaticamente do `response.ok`/exceção). Mas
`INVALID` (conteúdo vazio/malformado após parse) e `SKIPPED` (decisão de
negócio, ex: cache hit em `dedupeInFlight`) só quem chama sabe. Propor
uma de duas abordagens, com prós/contras de cada:

- **Abordagem A**: `fetchWithRetry` loga automaticamente
  `PASSED`/`FAILED`/`ERROR` (SSOT real, zero esforço nos 8 arquivos), e
  cada caller opcionalmente chama uma função auxiliar
  (`reportIngestionStatus(source, status, detail)`) só quando precisar
  reportar `INVALID`/`SKIPPED`/`WARNING` — ou seja, o status "feliz"
  (PASSED) fica automático, os status especiais são opt-in.
- **Abordagem B**: todo caller sempre reporta explicitamente o status
  final (nenhum automatismo em `fetchWithRetry`) — mais verboso, mas
  dá controle total e evita duplo-log quando o caller já sabe que vai
  reportar `INVALID` mesmo com HTTP `PASSED`.

Recomendar uma das duas com justificativa, não implementar as duas.

### 3. Desenho do schema de persistência

Propor a estrutura da coleção Firestore (ex: `ingestionLog`), incluindo:
- Granularidade do documento (por chamada individual? agregado por
  fonte+dia? — considerar volume: Brapi/Yahoo podem ser chamados
  centenas de vezes por sessão de usuário, logar cada um pode ficar caro
  em escrita no Firestore — propor agregação/amostragem se for o caso)
- Campos mínimos: `source` (qual das 8 fontes), `status`, `timestamp`,
  `detail` (opcional, mensagem de erro/contexto), `ticker` (quando
  aplicável)
- Regras de segurança (`firestore.rules`) — esse log deve ser
  server-only (Admin SDK), nunca escrito client-side, mesmo padrão já
  usado pra `config/featureGates`

### 4. Onde isso aparece pra alguém ver

Propor (sem implementar) onde esse log vira visível — um painel interno
simples (`/admin/ingestion` ou similar, sem UI pra usuário final) que
mostra taxa de sucesso por fonte nas últimas 24h/7d. Não é prioridade
desta rodada, só reportar a viabilidade e esforço estimado.

## Regras obrigatórias

- Não decidir sozinho a Abordagem A vs. B — apresentar as duas com
  prós/contras claros, recomendação justificada, e aguardar confirmação.
- Não implementar nada — este prompt é só o documento de desenho.
- Considerar explicitamente o custo de escrita no Firestore (não propor
  algo que gere milhares de writes/dia sem necessidade).

## Entregável esperado

Um documento markdown (mesmo formato dos desenhos de solução anteriores
desta sessão) cobrindo os 4 pontos acima, para revisão antes de qualquer
prompt de execução.
