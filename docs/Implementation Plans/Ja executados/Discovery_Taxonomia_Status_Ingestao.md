# Discovery — Taxonomia de Status de Ingestão de Dados Externos (P1)

> Documento de desenho técnico, sem implementação. Baseado no prompt
> `docs/Prompts/prompt_discovery_taxonomia_ingestao.md`. Aguarda decisão
> de Paulo sobre Abordagem A vs. B antes de qualquer prompt de execução.

## 1. Pontos de entrada reais de dado externo

`fetchWithRetry` (`src/lib/api/http.server.ts:69-90`) é de fato o único
ponto de HTTP externo usado por Brapi, Yahoo (parcialmente — ver abaixo),
SEC EDGAR, Nasdaq e Benchmark (BCB/Yahoo). Contrato atual: nunca retorna
`null` — devolve uma `Response` (mesmo com `!r.ok`, quando esgota
retries ou recebe status não-retryable) ou lança exceção de
rede/timeout. Não há sinal estruturado de *por que* falhou (404 vs. 5xx
vs. timeout vs. parse) — cada chamador decide sozinho o que fazer, e
hoje todos decidem "engolir e retornar vazio".

Duas exceções ao padrão "tudo passa por fetchWithRetry":

- **`yahoo.server.ts`**: `getYahooAuth()` e `fetchYahooQuoteSummary()`
  usam `fetchWithTimeout` diretamente (sem retry). `fetchFromYahoo` e
  `fetchYahooQuote` usam `fetchWithRetry` mas com `retries: 0` — na
  prática, timeout com uma tentativa só, sem retry real.
- **`cvm.server.ts` → `fetchCvmEnrichedFacts`**: não faz nenhuma chamada
  HTTP. Lê `enrichedFundamentals/{ticker}` via Admin SDK
  (`getAdminFirestore()`) e, se ausente, cai para JSON estático de build
  (`cvmLocalCache`). Confirmado: **este é o ponto que precisa de status
  mesmo sem HTTP envolvido**, conforme hipótese do prompt original.

Todas as 6 fontes seguem "fail soft": nenhuma propaga exceção para
cima; o valor de falha varia por forma (`null` para asset único, `[]`/
`Map()` vazio para séries) mas nunca carrega informação de causa.

## 2. Abordagem A vs. B — recomendação

**Abordagem A (automático em `fetchWithRetry` + opt-in nos callers para
INVALID/SKIPPED/WARNING) é a recomendada.**

Justificativa:

- `fetchWithRetry` já é o único funil de HTTP das 5 fontes que fazem
  rede de fato (todas exceto CVM). Instrumentar ali dá `PASSED`/
  `FAILED`/`ERROR` de graça, sem tocar nos 8 arquivos de fonte — zero
  risco de esquecer uma chamada.
- O caso Yahoo (`fetchWithTimeout` cru, sem passar por `fetchWithRetry`)
  é a única lacuna real de cobertura automática. Duas opções sem
  reescrever a lógica de auth: (i) migrar `getYahooAuth` e
  `fetchYahooQuoteSummary` para usar `fetchWithRetry` com `retries: 0`
  (comportamento idêntico ao atual, ganha instrumentação de graça); ou
  (ii) fazer `fetchWithTimeout` também emitir o log automático,
  já que ambas as funções compartilham o mesmo módulo. Recomendo (i)
  por consistência — um único ponto instrumentado, não dois.
- `INVALID` (ex.: array vazio, campo obrigatório ausente após parse) e
  `SKIPPED` (`dedupeInFlight` colapsou a chamada) só o caller sabe
  identificar — forçar isso pela Abordagem B em 8 arquivos diferentes é
  mais superfície de erro (fácil esquecer um `reportIngestionStatus` em
  algum branch) sem ganho real, já que o "status feliz" (PASSED) já sai
  de graça da abordagem A.
- Risco de duplo-log citado na Abordagem B (HTTP `PASSED` + caller
  reporta `INVALID` na mesma chamada) é aceitável e até desejável: são
  dois fatos distintos — "a rede respondeu 200" e "o conteúdo não
  passou validação de negócio" — que merecem registros separados para
  diagnosticar corretamente onde está o problema (rede vs. contrato de
  dado).
- `cvm.server.ts` fica de fora do automatismo por não ter HTTP — precisa
  de uma chamada manual a `reportIngestionStatus` mesmo na Abordagem A
  (único ponto assim, então o custo é baixo).

## 3. Schema de persistência proposto

### Granularidade

**Agregado por fonte + dia**, não por chamada individual. Motivo direto
do próprio prompt: Brapi/Yahoo podem ser chamados centenas de vezes por
sessão de usuário; logar cada write individual em Firestore geraria
custo de escrita desnecessário e um volume de documentos que não ajuda
ninguém a diagnosticar nada (ruído, não sinal).

Proposta de coleção: `ingestionLog/{source}_{YYYY-MM-DD}` (doc ID
determinístico, permite `upsert` via `FieldValue.increment` sem
precisar de query antes de escrever):

```
ingestionLog/{source}_{date}
  source: string            // "brapi" | "yahoo" | "cvm" | "secEdgar" | "nasdaq" | "benchmark"
  date: string               // "YYYY-MM-DD" (redundante com o ID, mas facilita query/index)
  counts: {
    passed: number
    failed: number
    error: number
    skipped: number
    invalid: number
    warning: number
  }
  lastError?: {              // amostra do erro mais recente, não histórico completo
    status: string           // um dos valores acima
    detail: string           // mensagem/contexto, truncada (ex.: 500 chars)
    ticker?: string
    timestamp: Timestamp
  }
  updatedAt: Timestamp
```

Cada evento de ingestão faz **um único write com
`FieldValue.increment(1)`** no contador correspondente, e
condicionalmente sobrescreve `lastError` só quando o status não é
`PASSED`. Isso mantém o custo de escrita constante (1 write por
chamada, mas em documentos altamente reaproveitados — Firestore não
cobra por "tamanho do increment", e writes no mesmo doc dentro da
mesma sessão de faturamento não multiplicam custo de forma relevante
comparado a um doc novo por chamada).

Se mesmo essa granularidade se mostrar cara em produção, o próximo passo
(não necessário agora) seria batelar em memória por N segundos antes de
persistir — mas isso é otimização prematura para este momento; melhor
medir o volume real primeiro.

### Regras de segurança

Seguindo o padrão já usado por `config/featureGates`
(`firestore.rules:35-38`, escrita sempre `false` no client, só via
Admin SDK):

```
match /ingestionLog/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

Nenhuma custom claim de admin existe hoje no projeto (confirmado —
`firestore.rules` não referencia `request.auth.token.admin` em lugar
nenhum), então por ora "autenticado" é a barreira disponível para
leitura; se um painel `/admin/ingestion` for construído futuramente,
vale revisitar isso com uma claim de role.

## 4. Visibilidade — painel `/admin/ingestion`

Não existe hoje nenhuma rota `/admin/*` nem precedente de UI
administrativa no repo (confirmado por grep/glob) — seria a primeira do
gênero. Proposta de viabilidade, sem implementar nesta rodada:

- Rota TanStack Start server-rendered simples, `src/routes/admin/
  ingestion.tsx`, protegida por uma checagem mínima (ex.: allowlist de
  e-mail do próprio Firebase Auth, já que não há custom claims de admin
  ainda — não vale criar todo um sistema de roles só para esta tela).
- Uma `createServerFn` lê os últimos N dias de `ingestionLog` (via Admin
  SDK, contorna as rules) e agrega em uma tabela: fonte × dia × taxa de
  sucesso (`passed / (passed+failed+error+invalid)`), com o `lastError`
  mais recente por fonte como coluna auxiliar.
- Esforço estimado: baixo — é essencially uma tabela HTML lendo um
  agregado que já vem pronto do Firestore, sem gráfico nem lib nova.
  A maior parte do esforço é decidir o mecanismo de proteção de acesso
  (allowlist vs. custom claim), não a tela em si.
- Não é prioridade desta rodada — só reportando viabilidade conforme
  pedido.

## Decisão pendente

Aguardando confirmação de Paulo sobre:

1. Abordagem A (recomendada) vs. B.
2. Granularidade agregada por fonte+dia (proposta) vs. alguma outra.
3. Se o discovery do painel `/admin/ingestion` deve virar prompt de
   execução já nesta fase ou ficar para depois do core (`ingestionLog` +
   instrumentação).
