# 83 — Corrigir Detecção de Formato do CSV (Regex Desatualizado, Diferente do Parser)

## Contexto e causa raiz confirmada

`useWatchlistCsvImport.ts` decide qual parser chamar via:
```ts
const isAdvancedTemplate = /data\s*da\s*compra|date|valor\s*unit[áa]rio/i.test(text);
```

Essa regex **não foi atualizada** quando o prompt 81 tornou
`parseTransactionTemplateCsv` tolerante a variações de header (via
`normalizeHeaderCell` + `includes()`). Resultado: um arquivo real com
headers "Data do lançamento"/"Preço unitário" (que o parser interno já
reconhece perfeitamente, confirmado 602/602 linhas no teste de integração
do prompt 81) **nunca chega a ser roteado pro parser certo**, porque essa
regex externa, desatualizada, não reconhece esses termos — cai como
formato "simples" (Fase 1), que falha, produzindo "No valid rows found in
CSV." mesmo com o parser correto já funcionando.

Esse bug só existe na camada de **detecção de formato**, que hoje duplica
(de forma divergente) a lógica de reconhecimento de coluna que já vive em
`parseTransactionTemplateCsv`. É uma violação de SSOT — duas fontes de
verdade sobre "esse header é avançado ou não", uma delas desatualizada.

## Correção — fonte única de verdade

**Não corrigir só a regex** (isso reintroduziria o mesmo risco na próxima
vez que um header diferente aparecer) — extrair a detecção de formato
para dentro de `csv.ts`, reaproveitando a mesma lógica tolerante já usada
pelo parser:

1. Exportar `detectCsvFormat(text: string): "advanced" | "simple"` em
   `src/lib/csv.ts`. Implementação sugerida: rodar o mesmo
   `normalizeHeaderCell()` na primeira linha (header) e verificar se pelo
   menos as colunas de **data** e **preço** são reconhecíveis pelos
   mesmos critérios `includes()` já usados dentro de
   `parseTransactionTemplateCsv` (reaproveitar a mesma lista de palavras-
   chave, não duplicar uma segunda lista) — se sim, `"advanced"`; senão,
   `"simple"`.
2. `useWatchlistCsvImport.ts` troca a regex hardcoded por
   `detectCsvFormat(text) === "advanced"`.
3. Se no futuro os critérios de reconhecimento de coluna mudarem
   novamente (ex: prompt 84+ adicionar mais variações), só precisa mudar
   em um lugar (`csv.ts`), nunca mais duas fontes divergentes.

## Regras obrigatórias

- Não alterar `parseTransactionTemplateCsv` nem `parseWatchlistCsv` em
  si — já estão corretos e testados (602/602 no prompt 81).
- Testar especificamente com o header real que causou o bug ("Ativo,Data
  do lançamento,Quantidade,Preço unitário,Tipo de ordem") — não só com o
  header do nosso próprio template.

## Testes obrigatórios

1. `detectCsvFormat` com o header real do arquivo de Paulo → `"advanced"`.
2. `detectCsvFormat` com o header do formato simples (Fase 1:
   `Ticker,Type,Quantity,AveragePrice`) → `"simple"`.
3. `detectCsvFormat` com o header do nosso próprio template avançado
   (`Ticker,Data da Compra,Quantidade,Valor Unitário,Tipo`) → `"advanced"`
   (regressão — não pode quebrar o que já funcionava).
4. Teste de integração ponta a ponta: rodar `handleFile` (ou a lógica
   equivalente) com o CSV real completo do Paulo (mesmo arquivo do prompt
   81, buscar se ainda está referenciado/disponível localmente, ou pedir
   novamente) e confirmar que agora completa a importação de verdade
   através do fluxo real do componente, não só chamando o parser
   isoladamente — **esse é o teste que faltou da última vez e permitiu
   esse bug passar**.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Confirmar via teste de integração (item 4 acima) que o fluxo completo
   do componente importa o arquivo real com sucesso, não só o parser
   isolado

## Ao terminar

Atualizar `docs/SSOT.md`, registrando que isso foi um gap do prompt 81
(teste isolado do parser não pegou a camada de detecção de formato).
Trabalhar em `dev`.
