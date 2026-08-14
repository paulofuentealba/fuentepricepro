# 81 — Corrigir Import CSV: Encoding, Cabeçalhos Alternativos, Preço com Moeda, Data DD-MM-AA, Desdobramento

## Contexto e evidência do bug

Paulo tentou importar um CSV real (histórico de ~600 transações, abril/2022
a agosto/2026) e a importação falha silenciosamente/produz dado errado.
Investigação encontrou **5 problemas reais e independentes** no arquivo
enviado, todos precisam ser corrigidos em `src/lib/csv.ts`
(`parseTransactionTemplateCsv`) pra esse arquivo importar corretamente:

### 1. Cabeçalhos não reconhecidos

Arquivo real usa `Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo
de ordem` — `ticker`/`ativo` já é reconhecido, mas `data do lançamento`,
`preço unitário`, `tipo de ordem` **não batem com nenhum alias hoje
verificado** em `idx.date`/`idx.price`/`idx.type`
(`parseTransactionTemplateCsv`, linhas ~209-236). Resultado: essas 3
colunas nunca são encontradas (`idx.date/price/type = -1`), e o parser
segue adiante silenciosamente com data inválida, preço 0, tipo sempre
"buy" — nunca lança erro, só produz dado errado.

**Correção**: tornar o matching de header mais tolerante — normalizar
removendo acentos antes de comparar (não só espaços/caixa, como já faz),
e expandir os aliases: adicionar variantes com "do"/"da"/"de" no meio
(`datadolancamento`, `datadolançamento`), `tipodeordem`, e qualquer
combinação razoável de "preço"+"unitário" junto ou separado. Considerar
usar matching por `includes()` de palavras-chave (`data`, `preco`/`preço`,
`tipo`) em vez de lista exaustiva de frases exatas, que fica frágil a
cada nova ferramenta de export com nomenclatura ligeiramente diferente.

### 2. Preço com prefixo de moeda e separador decimal misto

Valores reais: `US$8.65` (ponto decimal) e `R$ 105,80` (vírgula decimal,
com o caractere de espaço não-quebrável entre `R$` e o número). Hoje
`Number(cols[idx.price])` não trata nenhum dos dois — produz `NaN` em
100% das linhas, mesmo com o header corrigido.

**Correção**: nova função `parseCurrencyValue(raw: string): number`
que: remove prefixo de moeda (`R$`, `US$`, `$`, e variantes com/sem
espaço), detecta o separador decimal (se tem vírgula E ponto, o último
caractere de pontuação antes de 2 dígitos finais é o decimal; se só tem
vírgula, vírgula é decimal; padrão brasileiro vs. americano), remove
separador de milhar, converte pra `number`. Testar com os dois formatos
reais do arquivo (`US$8.65`, `R$ 105,80`) mais casos com milhar
(`R$ 1.234,56`, `US$1,234.56`).

### 3. Formato de data DD-MM-AA (2 dígitos de ano, traço)

Datas reais: `17-06-26`, `08-06-26` (dia-mês-ano com 2 dígitos, separado
por traço). `parseCsvDate` hoje só trata `AAAA-MM-DD` e `DD/MM/AAAA` —
esse formato cai no fallback genérico `new Date(s)`, que interpreta
errado ou produz `Invalid Date`.

**Correção**: adicionar um case pra `/^\d{1,2}-\d{1,2}-\d{2}$/`,
assumindo ano de 2 dígitos como 20XX (não 19XX — todas as datas do
arquivo real são 2022-2026).

### 4. Linha de evento corporativo dentro do arquivo de transações

Linha real: `BBAS3,15-04-24,De 1 para 2,"R$ 0,00",Desdobramento` — não é
compra/venda, é um desdobramento (split) com a proporção escrita como
texto ("De 1 para 2") na coluna de quantidade, e "Desdobramento" na
coluna de tipo.

**Investigar antes de implementar**: o sistema já tem um tipo de
transação `corporate_action` (usado no split/agrupamento via `factor`,
implementado em auditoria anterior desta sessão) — confirmar a
assinatura exata dele em `src/lib/transactions.ts` e desenhar como uma
linha desse formato no CSV deveria virar uma transação
`corporate_action` com o `factor` certo (`"De 1 para 2"` → fator 2,
`"De 1 para 3"` → fator 3, etc. — parsear o texto com regex, não assumir
sempre proporção 1:2). Se o texto não seguir o padrão "De X para Y",
pular a linha e reportar, não travar a importação inteira.

**Regra de detecção**: quando a coluna "tipo" (após header corrigido no
item 1) contiver "desdobramento", "grupamento", "split", "bonificação" ou
equivalente, tratar como evento corporativo em vez de transação
buy/sell — desviar pro fluxo `corporate_action` em vez de tentar
`Number()` na coluna de quantidade (que teria "De 1 para 2", não um
número).

### 5. Encoding do arquivo

Caracteres acentuados aparecem corrompidos (`�`) — investigar se o
arquivo é Windows-1252/Latin-1 (comum em export de planilha no Brasil)
em vez de UTF-8, e se o app assume UTF-8 ao ler o arquivo
(`FileReader`/`text()`). Se confirmado, detectar/normalizar encoding
antes de fazer o parsing de texto (ex: usar `TextDecoder` com fallback
de encoding, ou detectar BOM/heurística simples). Isso afeta
principalmente o nome das colunas do header (com acento) e qualquer
valor de coluna com acento — tickers em si (SCM, XPML11) não têm acento,
então não afetam a identificação do ativo, mas afetam o matching de
header do item 1.

## Regras obrigatórias

- Corrigir os 5 problemas juntos — são interdependentes (corrigir só o
  header sem corrigir o preço ainda deixaria a importação quebrada).
- Não alterar o formato do template "Baixar modelo CSV" nem o
  comportamento do `AssetForm`/Screener — escopo é só o parser de
  import de transação.
- Manter compatibilidade com o formato que já funciona hoje (nosso
  próprio template) — não quebrar nada que já importa corretamente.

## Testes obrigatórios

1. `parseCurrencyValue` com `US$8.65`, `R$ 105,80`, `R$ 1.234,56`,
   `US$1,234.56`, valor sem prefixo (`8.65`).
2. `parseCsvDate` com `17-06-26` (novo formato) e os formatos já
   existentes (regressão).
3. Header matching com os nomes reais do arquivo (`Ativo`, `Data do
   lançamento`, `Preço unitário`, `Tipo de ordem`) — confirmar que os 4
   índices são encontrados corretamente.
4. Linha de desdobramento (`"De 1 para 2"`) — confirmar que vira
   `corporate_action` com fator 2, não uma transação buy/sell quebrada.
5. Teste de integração: rodar o arquivo real anexo completo (ou uma
   amostra representativa de ~20 linhas cobrindo BRL, USD, venda,
   compra, e a linha de desdobramento) através do parser completo e
   confirmar que produz o número esperado de transações válidas.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Rodar o arquivo CSV real (anexo a esta tarefa,
   `modelo-importacao-transacoes (1).csv`) através da importação de
   verdade e reportar quantas linhas importaram com sucesso vs.
   falharam, com detalhe de qualquer linha que ainda falhar

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
