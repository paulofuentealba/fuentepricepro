# RESULTADO — 83 — Corrigir Detecção de Formato do CSV

## Causa raiz confirmada

`useWatchlistCsvImport.ts` decidia qual parser usar via uma regex
hardcoded (`/data\s*da\s*compra|date|valor\s*unit[áa]rio/i`) que duplicava
— de forma divergente — a lógica de reconhecimento de coluna já existente
dentro de `parseTransactionTemplateCsv` (tornada tolerante no prompt 81
via `normalizeHeaderCell()` + `includes()`). Um header real de corretora
("Data do lançamento"/"Preço unitário") já era reconhecido pelo parser,
mas a regex externa não continha esses termos, então o arquivo caía no
parser Fase 1 (simples) e falhava com "No valid rows found in CSV.",
mesmo com o parser correto já funcionando perfeitamente. Violação de SSOT
— duas fontes de verdade sobre "esse header é avançado ou não".

## Correção aplicada

- **`src/lib/csv.ts`**: nova função exportada `detectCsvFormat(text: string): "advanced" | "simple"`.
  Reutiliza literalmente os mesmos critérios `includes()` de coluna de
  data e coluna de preço já usados dentro de `parseTransactionTemplateCsv`
  — nenhuma segunda lista de palavras-chave foi criada. Se a primeira
  linha (header) tiver ambas as colunas reconhecíveis, retorna
  `"advanced"`; senão, `"simple"`.
- **`src/components/ceiling/watchlist/useWatchlistCsvImport.ts`**: a regex
  hardcoded foi removida; `isAdvancedTemplate` agora é
  `detectCsvFormat(text) === "advanced"`.
- `parseTransactionTemplateCsv` e `parseWatchlistCsv` **não** foram
  alterados — permanecem exatamente como testados/corrigidos no prompt 81.

Agora só existe **um lugar** (`csv.ts`) que define o que conta como header
"avançado"; se os critérios mudarem de novo no futuro (ex: prompt 84+
adicionar mais variações), só precisa mudar ali.

## Testes novos

1. **`src/lib/__tests__/csvDetectFormat.test.ts`** (4 testes, unitários de `detectCsvFormat`):
   - Header real do arquivo de Paulo (`Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem`) → `"advanced"`.
   - Header formato simples Fase 1 (`Ticker,Type,Quantity,AveragePrice`) → `"simple"`.
   - Header do template avançado próprio (`Ticker,Data da Compra,Quantidade,Valor Unitário,Tipo`) → `"advanced"` (regressão).
   - String vazia → `"simple"`.

2. **`src/lib/__tests__/useWatchlistCsvImport.integration.test.tsx`** (2 testes,
   integração ponta a ponta pelo **hook real**, via `renderHook` +
   `handleFile()`, não só o parser isolado):
   - CSV sintético reproduzindo o header real do bug ("Ativo,Data do
     lançamento,Quantidade,Preço unitário,Tipo de ordem") — confirma que
     as 3 linhas são detectadas como avançado, parseadas, e importadas
     (transações criadas via `upsertTransaction`, itens via `onImport`)
     através do fluxo real do componente/hook.
   - Regressão: CSV formato simples Fase 1 continua funcionando pelo
     mesmo fluxo.
   - `QueryClient` real do TanStack Query com cache pré-populado
     (`setQueryData`) simula os lookups de ativo sem rede; `useTransactions`
     mockado (sem dependência de Firebase/Auth); `sonner` mockado.

3. **Verificação ad-hoc contra o CSV real de 602 linhas do Paulo** (teste
   temporário criado, rodado e **apagado** ao final — não é fixture
   permanente, pois usava o arquivo pessoal real): chamou
   `decodeCsvBytes` + `detectCsvFormat` + `parseTransactionTemplateCsv`
   diretamente sobre o arquivo real.
   - `detectCsvFormat` → `"advanced"` ✅
   - `parseTransactionTemplateCsv` → **602/602 linhas parseadas** (igual
     ao resultado do parser isolado no prompt 81, agora confirmado também
     com a camada de detecção corrigida no caminho)

Esse item 3 é o teste que faltou no prompt 81: lá, a validação de 602/602
chamou o parser diretamente, nunca passou pela camada de detecção de
formato que fica *antes* dele no fluxo real do hook — por isso o bug de
regex desatualizada passou despercebido até aparecer em produção.

## Gates de verificação

- `npx tsc --noEmit` — limpo ✅
- `npm run test` — **322 testes passando, 4 skipped** (326 total, incluindo
  os 6 novos deste prompt) ✅
- `npm run build` — build de produção completo sem erros ✅

## Dados pessoais

O arquivo `docs/Prompts/modelo-importacao-transacoes (1).csv` (602
transações reais do Paulo) foi usado **apenas localmente** para a
verificação ad-hoc descrita acima, através de um teste temporário que foi
apagado imediatamente depois de rodar. O arquivo CSV real foi **deletado**
do working tree ao final e **não foi commitado** em nenhum momento — os
testes automatizados permanentes usam apenas dados sintéticos/fictícios
(`PETR4`, `VALE3`, `ITUB4` com valores de exemplo, não os dados reais de
Paulo).

## Gap registrado

Documentado em `docs/SSOT.md` (seção 4, linha do tempo): o prompt 81
validou apenas o parser isolado, não a camada de detecção de formato que
roda antes dele no fluxo real (`useWatchlistCsvImport.handleFile`). Esse
gap permitiu que uma regex desatualizada divergisse silenciosamente da
lógica do parser sem que nenhum teste pegasse. A correção deste prompt
elimina a possibilidade estrutural de recorrência (fonte única de
verdade) e adiciona cobertura de integração pelo hook real para que
qualquer futura divergência entre detecção e parser seja pega em CI.
