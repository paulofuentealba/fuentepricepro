# PROMPT — Lote 5 (Fechamento Total): 3 Itens Remanescentes do Backlog
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Último lote — fecha os 3 itens que restaram no `BACKLOG_V2.md` (commit `8586651`), conforme
decisão do Paulo de não deixar nada pendente. Plano/diff/gates individuais por item, não misturar
commits. Branch: `git fetch origin dev:dev && git checkout dev && git pull origin dev` (deve estar
em cima dos 18 commits já mesclados do Tier 0). 3 gates reais, output literal completo, sempre.

Ordem: **1 (remover entrada obsoleta) → 2 (i18n toast) → 3 (rateio de taxa SINACOR)**.

---

## ITEM 1 — Remover Entrada Obsoleta do `BACKLOG_V2.md`

A entrada "Assimetria Export/Import no CSV de Transações (Round-Trip de Taxas)", registrada no
commit `8586651`, descreve um problema **já corrigido** pelo Item 1 do Lote 4 (`a4ed0b0`) —
confirmei `idx.fees` presente em `csv.ts:496`. Remover essa entrada específica do
`BACKLOG_V2.md`, mantendo as outras 2 (que serão resolvidas nos Itens 2 e 3 abaixo, e portanto
também devem ser removidas ao final — mas só depois de implementadas, não agora).

Commit isolado, sem gates de código (é só doc), mas ainda assim confirme que o arquivo continua
válido (sem markdown quebrado) antes de commitar.

---

## ITEM 2 — Interpolação i18n Frágil em `BrokerNoteUploader.tsx`

### Causa raiz confirmada
```typescript
toast.success(`${itemsToImport.length} ${t.brokerNote.successImport}`);
```
Concatenação direta de string em vez do padrão de interpolação `{{count}}` já usado em outras
chaves do mesmo arquivo de dicionário (`brokerNoteInvalidDatesSkipped`, `importFailedCount`).

Chave atual (`dict.ptBR.ts:193`): `successImport: "ordens importadas com sucesso"` (sem
placeholder). Mesma estrutura em `dict.en.ts`/`dict.es.ts`.

### Plano esperado
- **(a) Arquivos:** `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (reescrever
  `successImport` com `{{count}}` embutido na frase completa, não como prefixo concatenado — ex:
  `"{{count}} ordem(ns) importada(s) com sucesso."`) + `BrokerNoteUploader.tsx` (trocar a
  concatenação por `.replace("{{count}}", String(itemsToImport.length))`).
- **(b) Verificar:** buscar se `t.brokerNote.successImport` é usado em mais algum lugar do projeto
  antes de mudar a chave, para não quebrar outro call site.
- **(c) Testes:** confirmar que o toast final contém a contagem correta interpolada nos 3 idiomas
  (ou pelo menos em ptBR, se os testes existentes só cobrem um idioma — seguir o padrão já
  estabelecido no restante da suíte).

---

## ITEM 3 — Rateio de Taxas do Resumo Financeiro em Notas SINACOR (`b3Parser.ts`)

### Contexto
`TradeRecord` (interface em `b3Parser.ts`) não tem campo de taxa — as taxas de uma nota B3 real
(emolumentos, liquidação, registro, corretagem, ISS, IRRF) ficam consolidadas no rodapé
("Resumo Financeiro"), não linha a linha por negócio. Hoje isso nunca é extraído nem rateado.

### 🛑 Risco real — implementar com cautela, não adivinhar formato
Não existe, em nenhum lugar do projeto, uma amostra real de texto de rodapé de nota SINACOR para
basear o regex de extração. Implementar esse parsing "no escuro" corre o risco de **atribuir uma
taxa errada silenciosamente** — o que é pior do que não ter taxa nenhuma (mesmo princípio que já
aplicamos ao rejeitar `Date.now()` como fallback de data inválida neste mesmo Tier 0).

### Plano esperado (responda antes de codar)
- **(a) Investigação primeiro:** pesquisar (busca no seu conhecimento de formato SINACOR padrão,
  já que não há amostra real no repo) os rótulos textuais mais comuns usados no "Resumo
  Financeiro" das notas de corretagem B3 (ex: variações de "Taxa de liquidação", "Emolumentos",
  "Taxa de Registro", "Total Corretagem/Despesas", "Líquido para..."). Reportar quais padrões você
  vai usar e o nível de confiança antes de codar — se a confiança for baixa, dizer isso
  explicitamente.
- **(b) Lógica — fallback seguro obrigatório:** se o rodapé não for reconhecido com confiança
  (regex não bater, ou valor extraído não fizer sentido — ex: soma de taxas maior que o volume
  total negociado), a função deve retornar **sem preencher `fees`** (campo `undefined`/`null` em
  todos os trades daquela nota) — nunca inventar um número. Adicionar campo opcional
  `fees?: number` a `TradeRecord`. Ratear proporcionalmente ao volume (`quantity * price`) de cada
  trade em relação ao volume total da nota, só quando o total de taxas for extraído com confiança.
- **(c) Testes:** cobrir pelo menos 1 caso de nota com rodapé reconhecido (rateio correto,
  proporção validada matematicamente) e 1 caso de rodapé não reconhecido (todos os trades saem
  sem `fees`, sem erro/crash). Se você não tiver confiança suficiente no formato para escrever um
  teste de caso positivo realista, **diga isso explicitamente e proponha manter só o fallback
  seguro nesta rodada**, registrando a extração real como possível melhoria futura meramente
  informativa (não bloqueante, não é "backlog" no sentido de bug pendente — é limitação de
  parsing documentada).

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1 (remoção simples). Para o Item 3, se a investigação da Seção (a) não gerar
confiança suficiente no formato do rodapé, é aceitável entregar só o fallback seguro (campo
`fees` existente mas nunca preenchido nesta rodada) em vez de forçar uma extração não confiável —
isso ainda conta como "resolvido" no sentido de não deixar comportamento arriscado, só documenta
a limitação real ao invés de fingir uma solução completa.
