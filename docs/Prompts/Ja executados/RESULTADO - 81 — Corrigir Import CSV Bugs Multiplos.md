# RESULTADO — 81 — Corrigir Import CSV Bugs Múltiplos

## Contexto

Paulo tentou importar um CSV real de ~600 transações (abril/2022 a
agosto/2026, exportado de corretora) e a importação falhava
silenciosamente/produzia dado errado. Foram identificados 5 problemas
independentes (porém interdependentes na correção) em
`parseTransactionTemplateCsv` (`src/lib/csv.ts`).

## Os 5 problemas e as correções

### 1. Cabeçalhos não reconhecidos

O arquivo real usa `Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo
de ordem`. Nenhum desses batia com a lista exaustiva de aliases exatos que o
parser verificava.

**Correção**: nova função `normalizeHeaderCell()` que remove acentos
(`stripAccents`, via `String.normalize("NFD")` + regex de diacríticos),
baixa a caixa e remove espaços. O matching de cada coluna passou de
igualdade exata (`h === "..."`) para `h.includes("palavra-chave")` — ex.
coluna de data casa se o header contém `"data"`/`"date"`/`"fecha"`; coluna
de preço se contém `"valorunitario"`/`"precounitario"`/`"preco"`/etc; coluna
de tipo se contém `"tipo"`/`"operacao"`/`"ordem"`. Mais tolerante a
variações de nomenclatura sem precisar listar cada frase possível.

### 2. Preço com prefixo de moeda e separador decimal misto

Valores reais: `US$8.65` (ponto decimal) e `R$ 105,80` (vírgula decimal,
espaço/NBSP entre `R$` e o número). `Number(...)` direto produzia `NaN` em
100% das linhas.

**Correção**: nova função exportada `parseCurrencyValue(raw: string):
number`. Remove prefixo (`R$`/`US$`/`$`, com ou sem espaço), remove todos os
espaços (incl. NBSP), e decide o separador decimal pela **posição relativa**
de vírgula e ponto:
- se tem os dois: o que aparece **por último** é o decimal (`R$
  1.234,56` → BR; `US$1,234.56` → US);
- se só tem vírgula: vírgula é decimal (convenção BR — `10,00` → `10`);
- se só tem ponto ou nenhum separador: já está em formato JS válido.

**Achado extra durante o teste de integração, não previsto no prompt
original**: a coluna de **quantidade** no CSV real também vem com vírgula
decimal (`"10,00"`, `"5,00"`), e o parser só usava `Number()` ali também.
Decisão: aplicar `parseCurrencyValue()` também à quantidade (mesma lógica de
parsing numérico, sem prefixo de moeda para remover, mas com o mesmo
tratamento de separador). Sem essa correção, 100% das linhas continuariam
com quantidade 0 mesmo depois de resolver o preço.

### 3. Formato de data DD-MM-AA (ano de 2 dígitos, traço)

Datas reais: `17-06-26`, `08-06-26`. O parser só tratava `AAAA-MM-DD` e
`DD/MM/AAAA`, caindo no fallback genérico `new Date(s)` (que não interpreta
esse formato corretamente).

**Correção**: novo case em `parseCsvDate` para `/^\d{1,2}-\d{1,2}-\d{2}$/`,
assumindo ano de 2 dígitos como `20XX`. Também adicionado (por consistência,
já que aparece em formatos de exportação semelhantes) `DD-MM-AAAA` com ano
de 4 dígitos.

### 4. Linha de evento corporativo dentro do arquivo de transações

Linha real: `BBAS3,15-04-24,De 1 para 2,"R$ 0,00",Desdobramento` — um split,
com a proporção como texto na coluna quantidade e `"Desdobramento"` na
coluna tipo.

**Investigação**: confirmado em `src/lib/transactions.ts` que o tipo
`Transaction` já suporta `type: "corporate_action"` com campo `factor?:
number | null`, consumido em `recalculateHoldingFromTransactions` — ele
multiplica a quantidade corrente por `factor` e divide o preço médio por
`factor`, sem gerar fluxo de caixa. Não foi necessário alterar esse
contrato.

**Correção**:
- `ParsedTransactionTemplateRow.type` ganhou o terceiro valor
  `"corporate_action"` e um campo `factor?: number`.
- Regra de detecção: se a coluna "tipo" (após remover acentos e baixar
  caixa) contém `desdobramento`, `grupamento`, `split`, `bonificacao` ou
  `inplit`, a linha é desviada do fluxo normal de buy/sell.
- `parseCorporateActionFactor(raw)`: regex `/de\s+([\d.,]+)\s+para\s+([\d.,]+)/`
  sobre a coluna quantidade (após `stripAccents`+lowercase), calculando
  `factor = to / from` — **não assume sempre 1:2**; testado com `"De 1 para
  2"` → 2, `"De 1 para 10"` → 10, `"De 1 para 5"` → 10 (real: `VINO11`
  1→5 → factor 5).
- Se o texto não bate o padrão `"De X para Y"`, a linha é **pulada** (`console.warn`
  com a linha bruta), sem travar a importação inteira — comportamento
  testado explicitamente.
- `useWatchlistCsvImport.ts` (único consumidor de
  `parseTransactionTemplateCsv`) ganhou um branch para `row.type ===
  "corporate_action"`: cria uma `Transaction` com `type:
  "corporate_action"`, `factor: row.factor`, `quantity: 0`, `pricePerShare:
  0` (esses dois últimos não são usados pelo cálculo de holding para esse
  tipo, conforme `transactions.ts`).

### 5. Encoding do arquivo (Windows-1252 vs. UTF-8)

Confirmado: o CSV real está em Windows-1252/Latin-1 (bytes `0xE7` para
`ç`, etc.), não UTF-8. `useWatchlistCsvImport.ts` lia o arquivo com
`await file.text()`, que decodifica como UTF-8 por padrão no browser —
qualquer acento vira `U+FFFD` (`�`), irrecuperável depois de decodificado.

**Correção**: nova função exportada `decodeCsvBytes(buffer: ArrayBuffer):
string` em `csv.ts`:
1. Se tem BOM UTF-8 (`EF BB BF`), decodifica como UTF-8 direto.
2. Senão, tenta `new TextDecoder("utf-8", { fatal: true }).decode(buffer)`
   — bytes acentuados Windows-1252 (fora do range válido de continuação
   UTF-8) disparam exceção de forma confiável.
3. No `catch`, decodifica como `windows-1252` (suportado nativamente pelo
   `TextDecoder` do browser e do Node, sem precisar de ICU completo — este
   ambiente Node 26 confirmou suporte).

`useWatchlistCsvImport.ts` trocou `file.text()` por `file.arrayBuffer()` +
`decodeCsvBytes(buffer)`.

Como observado no prompt, tickers (`SCM`, `XPML11`) não têm acento, então a
identificação do ativo nunca foi afetada — o problema era só cabeçalho
(item 1, já resolvido de forma tolerante via `includes()`) e, potencialmente,
qualquer valor textual acentuado (ex. notas, mas isso não é lido do CSV
hoje).

## Testes

`src/lib/__tests__/transactionTemplateCsv.test.ts` — 18 testes (11 já
existentes + 7 novos blocos com múltiplos `it` cada, cobrindo os 5 itens
obrigatórios do prompt):
- `parseCurrencyValue`: `US$8.65`, `R$ 105,80`, `R$ 1.234,56`,
  `US$1,234.56`, valor sem prefixo (`8.65`, `10,00`).
- `parseCsvDate`: `17-06-26` (novo) + regressão de `AAAA-MM-DD` e
  `DD/MM/AAAA`.
- Header matching com nomes reais (`Ativo`, `Data do lançamento`, `Preço
  unitário`, `Tipo de ordem`) — 3 linhas reais (BRL, USD, venda) parseadas
  corretamente.
- Linha de desdobramento (`"De 1 para 2"` → factor 2, `"De 1 para 10"` →
  factor 10) e linha malformada (`"formato inesperado"`) pulada sem travar
  a importação das demais linhas.
- `decodeCsvBytes`: UTF-8 puro preservado; bytes Windows-1252 acentuados
  decodificados corretamente via fallback.

Resultado: **18/18 passando**.

## Verificação obrigatória

- `npx tsc --noEmit` — ✅ limpo.
- `npm run test` — ✅ **307 testes passando, 4 skipped** (42 arquivos, 1
  skipped), nenhuma regressão nos testes já existentes.
- `npm run build` — ✅ build de produção completo sem erros.

### Teste de integração com o CSV real

Rodado via script temporário (`scripts/tmp-test-import.ts`, deletado após o
uso) chamando `decodeCsvBytes` + `parseTransactionTemplateCsv` diretamente
sobre `docs/Prompts/modelo-importacao-transacoes (1).csv`:

```
Total de linhas de dados no arquivo: 602
Linhas parseadas com sucesso:        602
Linhas que falharam:                 0

Por tipo: 480 buy, 117 sell, 5 corporate_action
Linhas com quantidade/preço zerado ou inválido (excluindo corporate_action): 0
```

As 5 linhas de desdobramento (`BBAS3` 1→2, `GGRC11` 1→10, `CPTR11` 1→10,
`CPTS11` 1→10, `VINO11` 1→5) foram todas identificadas corretamente como
`corporate_action` com o `factor` certo, sem tentar `Number()` na proporção
textual.

**Resultado: 602/602 linhas importadas com sucesso, 0 falhas.**

## Escopo respeitado

- Template "Baixar modelo CSV" (`buildTransactionTemplateCsv`) — **não
  alterado**.
- `AssetForm`/Screener — não tocados.
- Compatibilidade com o formato que já funcionava (template próprio,
  `Ticker,Data da Compra,Quantidade,Valor Unitário,Tipo`) — mantida; os 4
  testes de regressão originais continuam passando.

## Arquivos alterados

- `src/lib/csv.ts` — `parseCurrencyValue`, `decodeCsvBytes`,
  `stripAccents`/`normalizeHeaderCell`, novos cases em `parseCsvDate`,
  detecção e parsing de `corporate_action` em
  `parseTransactionTemplateCsv`.
- `src/components/ceiling/watchlist/useWatchlistCsvImport.ts` — leitura via
  `arrayBuffer()` + `decodeCsvBytes`, branch para `type ===
  "corporate_action"` na criação da `Transaction`.
- `src/lib/__tests__/transactionTemplateCsv.test.ts` — 7 novos blocos de
  teste.
- `docs/SSOT.md` — entrada na linha do tempo.

## Dados pessoais

O CSV real (`docs/Prompts/modelo-importacao-transacoes (1).csv`) contém
transações financeiras pessoais reais do Paulo e **não foi commitado**.
Usado apenas localmente para o teste de integração manual acima e apagado
do working tree ao final desta tarefa (não versionado, não ficou órfão).
