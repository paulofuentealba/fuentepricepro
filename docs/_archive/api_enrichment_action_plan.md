# Plano de Ação — Enriquecimento de Dados via CVM + SEC EDGAR

> Baseado na avaliação crítica de `docs/api_enrichment_report_v3.md` (relatório de 9 fontes
> gerado pelo Antigravity). Este documento é o plano revisado e priorizado, com escopo
> reduzido e arquitetura corrigida para produção.

## Contexto

O relatório original propôs integrar 6 fontes de dados simultaneamente (Alpha Vantage,
Bolsai, API Massive, ANBIMA, EODHD + CVM + SEC EDGAR), com uma arquitetura de
enriquecimento síncrono por request de usuário. Esse plano foi revisado pelos seguintes
motivos:

1. **Rate limits inviáveis para produção com tráfego real**: Alpha Vantage (25 req/dia),
   API Massive (5 req/min) quebram no primeiro dia com uso normal se chamados por request.
2. **CVM não é um endpoint REST por ticker** — são arquivos em lote (ZIP/CSV trimestrais/
   mensais) que exigem download, parse e indexação prévios. Não dá pra "chamar sob demanda".
3. **Risco de SSOT** se múltiplas fontes alimentarem o mesmo campo (`bvps`, por exemplo)
   sem um funil único e resolvido antes de chegar em `getAssetValuation`/`useValuedPortfolio`.
4. **Priorização**: das 9 fontes avaliadas, só CVM Dados Abertos e SEC EDGAR são
   gratuitas, oficiais, sem chave/rate-limit problemático e cobrem os dois maiores gaps
   reais do produto — VPA/LPA/vacância de FII (BR) e BVPS para Graham (US/REITs).

As demais fontes (Bolsai fundamentals, API Massive, EODHD, ANBIMA) ficam represadas até
CVM + SEC EDGAR estarem rodando em produção e uma necessidade real e específica justificar
adicionar mais uma dependência externa.

---

## Diferença de natureza entre as duas fontes

| | CVM Dados Abertos | SEC EDGAR |
|---|---|---|
| Formato | Arquivos em lote (ZIP/CSV) por período (DFP/ITR trimestral, FII mensal) | JSON por empresa via `CIK`, on-demand |
| Cardinalidade | Todas as ~450 companhias de uma vez, por arquivo | 1 request = 1 empresa |
| Rate limit | Nenhum (é download de arquivo estático) | 10 req/s |
| Arquitetura necessária | ETL em lote (job agendado + cache Firestore) | Fetch on-demand cacheável, parecido com `fetchFromYahoo` |

---

## FASE 1 — Validação (script isolado, sem tocar produção)

### 1a. CVM — validar 3 datasets
- `CIA_ABERTA/DOC/DFP/DADOS/` → VPA/LPA para BBSE3, TAEE11, PETR4
- `FII/DOC/INF_MENSAL/DADOS/` → `Percentual_Vacancia_Fisica`/`Financeira` para HGLG11,
  MXRF11, AFHI11
- Dataset de proventos/deliberações → confirmar `data de pagamento` preenchida para
  BBSE3 (o caso original que motivou essa investigação)
- Reportar: tamanho dos arquivos, tempo de download/parse, % de preenchimento por
  campo, dificuldades de encoding/formato (CSV `;`, latin-1, comum em dado público BR)

### 1b. SEC EDGAR — validar mapeamento ticker → CIK
- Confirmar `https://www.sec.gov/files/company_tickers.json` cobre os tickers da
  radar (`O`, `KO`, `JNJ`, etc.)
- Testar `companyfacts/CIK{cik}.json` para AAPL, O, JNJ — conferir `StockholdersEquity`
  (BVPS) e `EarningsPerShareBasic` (EPS) contra o que já é exibido hoje

**Saída esperada:** decisão go/no-go por fonte, com números reais.

---

## FASE 2 — SEC EDGAR (implementação)

- Novo arquivo `src/lib/api/secEdgar.server.ts`
- `fetchSecEdgarFacts(ticker)`: resolve ticker → CIK (cache em memória, refresh diário),
  chama `companyfacts`, extrai `bvps`
- Plugar em `apiService.functions.ts` → `fetchAssetFn`, branch `isYahoo`, como
  enriquecimento pós-`fetchFromYahoo`, só quando `metrics.bvps` vier `null`,
  sempre com `.catch(() => null)` (nunca bloqueia o fluxo principal)
- Cache em memória (padrão `radarCache`) por enquanto; migrar pra Firestore só se
  o volume justificar
- Nunca chamado diretamente por componentes — só entra pelo funil único do `fetchAssetFn`

## FASE 3 — CVM Dados Abertos (implementação)

> **Atualizado após Fase 1 + re-verificações**: os achados abaixo corrigem/detalham o
> escopo original.

### Vacância de FII — confirmado, com ressalva de implementação
- **Fonte correta**: Informe **Trimestral** Estruturado (`INF_TRIMESTRAL`, Anexo 39-II
  da Instrução CVM 571/2015) — **não** o Informe Mensal (Anexo 39-I), que foi checado
  primeiro por engano.
- Arquivo: `inf_trimestral_fii_imovel_{ano}.csv`, coluna `Percentual_Vacancia`.
- **Ressalva importante**: a CVM reporta vacância **por imóvel individual**, não um
  número único do fundo. Popular `metrics.vacancy` exige agregação (provável média
  ponderada por ABL de cada imóvel) — mais trabalho de parsing do que um campo direto.
- Fundos majoritariamente de papel (CRI/recebíveis, ex: AFHI11) não têm imóveis físicos
  reportados — `vacancy` continua `null` para esses, corretamente (não é falha de dado).
- **Pendente de confirmação exata**: nome do arquivo/coluna foi reportado pela
  Antigravity mas não confirmado por mim linha a linha — validar abrindo o CSV real
  antes de codificar contra ele.

### Proventos (dividendos/JCP de ações, rendimentos de FII) — INVESTIGAÇÃO ENCERRADA, CVM não resolve
- **Conclusão final**, após duas rodadas de re-verificação rigorosa (listagem bruta de
  ZIP, dicionário de dados, grep completo, headers e linhas reais de CSV):
  - `fre_cia_aberta_distribuicao_dividendos` **não existe** nos Dados Abertos da CVM
    (verificado em 2024 e 2025, 36 arquivos por ano, nenhum com "dividendo" no nome).
    O que existe (`distribuicao_capital`) é composição acionária/free float, não proventos.
  - `inf_mensal_fii_rendimento` **não existe** em nenhum dos 11 anos de histórico
    (2016–2026) — essa pista veio de uma busca no Gemini (Chrome) sem lastro em dado
    real, não se confirmou.
  - Os arquivos que de fato existem (`ativo_passivo`, `complemento`, `geral`) só têm
    saldo contábil agregado (`Rendimentos_Distribuir`) e percentuais mensais
    (`Percentual_Dividend_Yield_Mes`) — nenhum evento individual com data de pagamento.
  - **Veredicto**: a CVM Dados Abertos não publica proventos discriminados por data de
    pagamento em formato tabular, para ações nem para FIIs. Avisos de proventos
    continuam só em PDF/HTML no sistema IPE.
- **Não investir mais tempo tentando extrair `paymentDate` da CVM.** Esse gap específico
  fica para outra fonte (ver seção "Candidata para paymentDate" abaixo).

### Implementação (VPA/LPA + vacância, escopo já confirmado)
- Novo arquivo `src/lib/api/cvm.server.ts` (parser dos arquivos)
- Job agendado (Cloud Scheduler) — semanal para DFP/ITR, mensal para FII — grava
  em `enrichedFundamentals/{ticker}` no Firestore: `vpa`, `lpa`, `freeFloat`,
  `vacancyFisica`, `vacancyFinanceira`, `paymentDateOverrides`
- `fetchAssetFn` lê esse cache Firestore e faz merge no `ApiAsset` antes de devolver
- Resolve o `paymentDate` do BBSE3 sem depender de HG Brasil/bolsai

---

## Candidata para `paymentDate` — Dados de Mercado API

Como a CVM não resolve proventos, reabrimos a busca por uma fonte de `paymentDate`.
Nova candidata identificada: **Dados de Mercado** (`api.dadosdemercado.com.br`).

- **Autenticação**: `Authorization: Bearer <token>` (precisa solicitar via
  `api@dadosdemercado.com.br`, como já registrado no relatório original)
- **Endpoints relevantes**:
  - `GET /v1/reits/:ticker/dividends` — dividendos de FIIs (ex: `KNCA11`)
  - `GET /v1/companies/:cvm_code/dividends` — dividendos de ações (por **código CVM**,
    não ticker — precisa resolver o `CD_CVM` primeiro, o que já temos do trabalho
    feito na Fase 1: TAEE11=020257, PETR4=009512, BBSE3=023159)
  - Ambos documentam considerar **data de pagamento, data de registro e data
    ex-dividendos** — exatamente o campo que faltava
- **Em aberto**: confirmar se `reits` cobre FIAGRO e FI-Infra também, ou se são
  categorias separadas na API (a documentação só mostra `/reits` e `/companies`
  explicitamente — precisa checar na prática com um ticker de cada tipo, ex:
  `AFHI11` para FI-Infra, algum ticker FIAGRO real)
- **Próximo passo**: script de validação isolado, testando `paymentDate` real pra
  BBSE3 (via `companies/023159/dividends`), e HGLG11/MXRF11/AFHI11 (via `reits`)

## Fora de escopo por enquanto
Bolsai (fundamentals), API Massive, EODHD, ANBIMA, HG Brasil (represada em favor de
Dados de Mercado, a menos que a validação desta última falhe).

---

## FECHAMENTO — Bolsai + HG Brasil (validação real, 2026-08-07)

Script `scripts/validate-bolsai-hgbrasil.ts` executado com as chaves reais do `.env`
contra 6 tickers (BBSE3, PETR4, TAEE11, HGLG11, MXRF11, AFHI11). Resultado:

| API | Resultado | Causa |
|---|---|---|
| **Bolsai** | `403 Pro tier required` em 100% dos tickers testados | Chave é de tier free; endpoint `/api/v1/dividends/{ticker}` exige assinatura Pro |
| **HG Brasil** | `UNAUTHORIZED_KEY` em 100% dos tickers testados | Chave válida (`key_status: valid`), mas sem acesso ao recurso `finance/dividends` no plano atual |

**Veredicto: nenhuma das duas entrega `paymentDate` (ou qualquer dado) no plano
gratuito.** Diferente do caso CVM, aqui não chegamos nem a avaliar qualidade de
dado — é bloqueio de tier antes de qualquer resposta útil. Não há caminho
gratuito viável nessas duas fontes.

**Decisão**: capítulo encerrado. `paymentDate` para BR continua resolvido via
estimativa de calendário comercial brasileiro (`fiiPaymentRules.ts`), até que
**Dados de Mercado** (candidata já registrada acima) seja validada — essa
continua sendo a próxima tentativa, não Bolsai/HG Brasil upgradado para Pro.

**Pendência aberta para Paulo**: decidir se `BOLSAI_API_TOKEN` e
`HGBRASIL_API_KEY` saem do `.env` agora (sem uso ativo) ou ficam registradas
caso decida pagar algum dos planos Pro no futuro.

---

## Nota de segurança
As chaves de API usadas nos testes do relatório original (`api_enrichment_report_v3.md`)
são de uso pessoal do Paulo para validação. Recomendação: mover para `.env.local`
(fora do controle de versão) antes de qualquer commit desse diretório, e nunca deixar
chave em texto puro em arquivos dentro de `docs/`.

---

## ATUALIZAÇÃO — HG Brasil reativado para dividendEvents (plano pago confirmado, 2026-08-17)

Em 2026-08-17, foi confirmado que o plano pago da API do HG Brasil habilita o endpoint `finance/dividends` retornando corretamente as datas de pagamento (`payment_date`), histórico e eventos projetados. 

**Decisão de Escopo Restrito**: O HG Brasil agora é a fonte primária de dividendos para ativos BR (com fallback na Brapi), **porém estritamente para o campo `dividendEvents`** (os eventos exibidos na UI do aplicativo). A Brapi foi mantida intocada como fonte para `dividendHistory`, `cagr`, `payoutRatio`, `paymentMonths` e `dividends3y`, pois a Brapi retorna 5 anos de dados, enquanto o HG Brasil retorna um histórico mais curto (~12 a 24 meses). Tentar substituir toda a fonte (inclusive valuation) por HG Brasil reduziria a precisão do Consenso e do CAGR de 5 anos. A política escolhida foi a substituição total all-or-nothing (sem merge intrincado de campos) apenas no nível de `dividendEvents`.

---

## ATUALIZAÇÃO — Dados de Mercado Scraper (Frente 3, 2026-08-17)

Conforme Prompt 13, implementamos o **Scraping da Dados de Mercado**.
- **Autenticação**: Scraping HTML livre no servidor, sem chave (já que não usamos conta Pro/CPF).
- **Indicadores**: Coletados do bloco `marketratios`. Expostos via `ApiAsset.metrics` (P/L, P/VP, ROE, DY) de forma complementar. **Não** alteram o motor de valuation (`getAssetValuation`), obedecendo a regra de segurança.
- **LGPD**: O bloco `id="admins"` é estritamente limpo da string HTML via `replace` antes de qualquer processamento, para evitar retenção de dado pessoal sensível.
- **Dividendos**: Extraídos via Scraping HTML usando como âncora a string `"Histórico de dividendos de {ticker}"` e injetados na cadeia de fallback: `HG Brasil -> Dados de Mercado -> Brapi`. Apenas o array de eventos (`dividendEvents`) é afetado.
- **Agendamento**: Script CLI `scripts/scrape-dados-de-mercado.ts` adicionado para rodar via cron, similar ao CVM. Não roda de forma síncrona em chamadas do usuário.
