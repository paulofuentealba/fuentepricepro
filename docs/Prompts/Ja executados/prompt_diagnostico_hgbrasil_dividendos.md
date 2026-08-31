# PROMPT — Diagnóstico HG Brasil: dividendos não carregando (SÓ investigação, zero código)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO — LEIA ANTES DE QUALQUER OUTRA COISA

Você vai atuar **exclusivamente como Engenheiro de Observability** nesta tarefa.
Isso significa, sem exceção:

1. **Você NÃO tem permissão para alterar nenhum arquivo de código nesta rodada.**
   Nenhum `create_file`, nenhum `str_replace`, nenhum `git commit`. Zero.
2. **Sua única entrega são os dois outputs literais pedidos na Seção 3** —
   colados sem resumo, sem paráfrase, sem "funcionou/não funcionou". Cole o
   JSON/texto bruto, completo.
3. Se em algum momento você sentir o impulso de já corrigir algo que
   encontrar — **resista**. Anote no relatório. Corrigir é a próxima
   conversa, não esta.
4. **Não conclua** "está tudo certo" ou "está quebrado" por conta própria.
   Só cole os dois outputs brutos pedidos. A conclusão é tomada por Paulo e
   Claude depois de ver o dado real — isso já causou retrabalho neste
   projeto antes (contagens de teste fabricadas, "build limpo" que não
   estava limpo). Não repita.

---

## 1. Contexto — o que já foi confirmado e o que falta descobrir

Claude fez uma auditoria estática completa via clone real da branch `dev`
(não é suposição) e confirmou que **o pipeline de código está correto e
completo**:

- `src/lib/api/hgBrasil.server.ts` → `fetchHgBrasilDividends()` correto, com
  taxonomia de erro padrão do projeto (`PASSED`/`FAILED`/`ERROR`/`WARNING`/
  `SKIPPED` via `reportIngestionStatus`).
- `src/lib/api/brapi.server.ts` linhas 112–124 → HG Brasil é chamado como
  fonte **primária** de `dividendEvents`, com fallback correto para Brapi e
  depois para Dados de Mercado.
- Cadeia frontend confirmada ponta a ponta: `assetQueryOptions` →
  `fetchAssetFn` → `fetchFromBrapi` → chega em `WatchlistKpiSection`,
  `CashFlowCalendar`, `AssetDetailSheet` sem nenhuma sobrescrita indevida no
  caminho (os enriquecimentos pós-fetch só preenchem `paymentDate` quando
  nulo, nunca tocam `amount`/`exDate`).
- `npx tsx scripts/validate-bolsai-hgbrasil.ts` rodado sem chave real →
  degrada corretamente para `SKIPPED_NO_KEY`, sem erro de lógica no próprio
  script.

**Conclusão da auditoria estática: o código em `dev` não é a causa.** O
problema é de runtime, ambiente ou credencial — algo que só se resolve com
acesso real a chave e logs de produção, que Claude não tem. É isso que você
vai investigar agora.

**Ambiente:** dev e produção compartilham o mesmo projeto Firebase
(`fuente-price-pro`) — não existe projeto separado para dev.

---

## 2. O que NÃO fazer

- Não altere `hgBrasil.server.ts`, `brapi.server.ts`, nem nenhum outro
  arquivo.
- Não rode `tsc`/`test`/`build` — não é o objetivo desta rodada, é só coleta
  de dado.
- Se a `HGBRASIL_API_KEY` não estiver acessível no ambiente que você tem,
  **diga isso explicitamente** em vez de simular ou inventar um resultado.

---

## 3. Entregas Obrigatórias

### 3.1 Rodar o script de validação com a chave real

```bash
npx tsx scripts/validate-bolsai-hgbrasil.ts
```

Rode no ambiente onde a `HGBRASIL_API_KEY` real está configurada (local
`.env.local`, ou o ambiente que tiver a env var de produção acessível). Cole
o output **completo e literal**, sem cortar — principalmente:

- A linha `HGBRASIL_API_KEY loaded: ...`
- Os "Raw Response" de pelo menos `BBSE3` e `VGIA11` (já estão no script)
- A tabela comparativa final

Se o output vier com `HTTP 403`, `HTTP 401`, ou qualquer coisa em `errors`
no JSON, isso já isola a causa (chave inválida ou endpoint fora do escopo
do plano pago) — não precisa investigar mais nada além disso.

### 3.2 Ler o log de ingestão real de produção

No console do Firebase (projeto `fuente-price-pro`), abra o Firestore e
leia o documento:

```
ingestionLog/hgBrasil_2026-08-19
```

(ajuste a data se você estiver rodando isso em outro dia — formato é
`hgBrasil_YYYY-MM-DD`)

Cole o conteúdo completo do documento, em especial os campos `counts` e
`lastError` (esse último tem `status`, `detail`, `ticker`, `timestamp`). Se
o documento não existir para hoje, diga isso explicitamente — significa que
a função nem está sendo chamada em produção, o que também é um dado
importante (não invente um motivo, só reporte o fato).

---

## 4. Formato de Saída Obrigatório — NENHUM OUTRO FORMATO É ACEITO

Duas seções, nesta ordem, cada uma com o output bruto e completo:

### Seção A — Output do script de validação (3.1)
```
[colar aqui, completo, sem cortar]
```

### Seção B — Conteúdo de `ingestionLog/hgBrasil_{data}` (3.2)
```
[colar aqui, completo, ou declaração explícita de que o doc não existe]
```

Nada além disso nesta rodada. Sem diagnóstico, sem sugestão de fix, sem
conclusão — só o dado bruto.
