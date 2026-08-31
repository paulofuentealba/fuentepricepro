# PROMPT — Tier 0 / Lote 2: 5 Correções (Fase 2 Sweep)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

5 itens, cada um com plano, diff e gates próprios — não misture num commit só. Regra 8: plano
antes de codar, por item. Branch: `git fetch origin dev:dev && git checkout dev && git pull
origin dev` antes de tocar em qualquer arquivo (já deve estar em cima dos 9 commits anteriores,
incluindo os 3 do Lote 1 do Tier 0). Sem `git commit`/`git push` sem autorização explícita por
item. **3 gates reais, output literal completo, sempre** — o formato que usamos desde o início
(`npx tsc --noEmit`, `npm run test`, `npm run build`), não um checklist substituto.

Ordem: **4 → 5 → 2 → 1 → 3** (os 2 bugs de fuso primeiro, por serem o mesmo padrão repetido em 2
arquivos; depois os 2 de silent-fallback; o Item 3 — feedback descartado — por último, porque tem
uma decisão de produto em aberto, ver Seção 3 abaixo).

---

## ITEM 4 — Bug de Fuso Horário UTC (`AddFixedIncomeDialog.tsx` + `DividendsHistoryPanel.tsx`)

### Causa raiz confirmada (2 ocorrências do mesmo padrão)
```typescript
// AddFixedIncomeDialog.tsx:49
const todayStr = new Date().toISOString().split("T")[0];

// DividendsHistoryPanel.tsx:62
const todayISO = new Date().toISOString().split("T")[0];
```
`toISOString()` sempre converte para UTC antes de fatiar a data. Em fusos a oeste do meridiano
(Brasil, GMT-3), qualquer chamada feita entre 21h00 e 23h59 (horário local) já cai no dia
seguinte em UTC — o campo de data pré-preenchido do formulário de Renda Fixa mostra amanhã como
"hoje", e a janela de 12 meses de histórico de proventos em `DividendsHistoryPanel` fica
deslocada em 1 dia perto da borda.

### Investigado: não existe utilitário compartilhado para isso hoje
Busquei em `src/lib/` por uma função de "data local em string ISO" já existente — não encontrei
nenhuma. Isso já apareceu 2 vezes nesta varredura (aqui, e antes em `cashflow.ts`/`realizedIncome.ts`
com o mesmo tipo de bug, já corrigido). Vale criar o utilitário SSOT agora, em vez de corrigir
inline nos 2 arquivos separadamente — mesmo espírito de `macroDefaults.ts`/`makeId`.

### Plano esperado (responda antes de codar)
- **(a) Arquivos:** decidir onde o utilitário mora — investigar `src/lib/formatters.ts` (parece o
  lugar mais natural, já concentra funções de formatação) antes de criar arquivo novo. Se criar
  arquivo novo, justificar por que `formatters.ts` não serve. Propor algo como
  `getLocalDateISOString(date?: Date): string` que usa `getFullYear()`/`getMonth()`/`getDate()`
  locais (não UTC), formatando manualmente para `YYYY-MM-DD`.
- **(b) Lógica:** substituir as 2 ocorrências pelo utilitário novo. Buscar se há mais alguma
  ocorrência de `toISOString().split("T")[0]` no projeto além dessas 2 e das já corrigidas em
  `cashflow.ts`/`realizedIncome.ts` — reportar quantas encontrou antes de decidir se corrige só
  essas 2 ou todas.
- **(c) Testes:** teste do utilitário sob mock de horário (ex: 23h30 local em fuso GMT-3) —
  garantir que a data retornada é o dia local correto, não o dia seguinte em UTC.

---

## ITEM 5 — Auto-Seleção Silenciosa de Ticker Errado (`TickerSearchField.tsx`)

### Causa raiz confirmada
`src/components/shared/TickerSearchField.tsx:107`:
```typescript
const hit = suggestions.find((s) => s.ticker === target) ?? suggestions[0];
```
Quando um ticker pré-selecionado (via link externo/deep-link) ainda não tem correspondência exata
nas sugestões (ex: resultado da API ainda carregando parcialmente), o código trava a seleção no
**primeiro resultado da lista**, não no ticker pedido.

### Plano esperado
- **(a) Arquivos:** `src/components/shared/TickerSearchField.tsx`.
- **(b) Lógica:** remover o fallback para `suggestions[0]`. Se não houver correspondência exata,
  não fazer auto-pick nesse ciclo do effect — deixar o `useEffect` rodar de novo quando
  `suggestions` mudar (a dependência já existe no array de deps), até achar o match exato ou
  esgotar as tentativas. Investigar se precisa de um limite de tentativas/timeout para não ficar
  esperando para sempre um ticker que nunca vai aparecer (ex: usuário chegou com ticker inválido
  no link) — decidir com base no comportamento real de `suggestions` (sempre estabiliza depois de
  N ciclos?).
- **(c) Testes:** cenário onde `suggestions` chega em 2 lotes (primeiro sem o target, depois com)
  — auto-pick não deve disparar no primeiro lote, deve disparar no segundo.

---

## ITEM 2 — CSV Avançado Não Fecha o Modal (`useWatchlistCsvImport.ts`)

### Causa raiz confirmada (já diagnosticado em detalhe na Fase 2)
`src/components/ceiling/watchlist/useWatchlistCsvImport.ts` — o ramo `if (isAdvancedTemplate)`
termina com `toast.success(...)` sem `return true;`, enquanto o ramo `else` (simples) tem
`return true;` explícito. `CsvImportUploader` provavelmente usa o retorno para decidir se fecha
o modal — confirmar isso antes de assumir.

### Plano esperado
- **(a) Arquivos:** `src/components/ceiling/watchlist/useWatchlistCsvImport.ts` +
  `CsvImportUploader.tsx` (confirmar como o retorno é consumido antes de codar).
- **(b) Lógica:** adicionar `return true;` ao final do bloco de sucesso do ramo avançado.
- **(c) Testes:** teste confirmando que a função de import retorna `true` após sucesso no fluxo
  avançado, simétrico ao teste que provavelmente já existe (ou deveria existir) pro fluxo simples.

---

## ITEM 1 — Data Inválida Vira "Hoje" Silenciosamente (`BrokerNoteUploader.tsx`)

### Causa raiz confirmada
`src/components/ceiling/watchlist/BrokerNoteUploader.tsx:34-45`, função
`parseDdMmYyyyToTimestamp`:
```typescript
export function parseDdMmYyyyToTimestamp(dateStr: string): number {
  if (!dateStr) return Date.now();
  ...
  const fallback = new Date(dateStr).getTime();
  return isNaN(fallback) ? Date.now() : fallback;
}
```
Data vazia ou não-parseável vira `Date.now()` — uma compra histórica lida de uma nota de
corretagem real ganha a data de hoje, distorcendo preço médio (ponderado por tempo/quantidade
em alguns cálculos) e IRR.

### Plano esperado
- **(a) Arquivos:** `BrokerNoteUploader.tsx` + qualquer componente que chame
  `parseDdMmYyyyToTimestamp` e precise saber que a linha falhou.
- **(b) Lógica:** a função não deve mais silenciosamente retornar `Date.now()` para entrada
  inválida — mudar assinatura para retornar `number | null`, e o chamador deve rejeitar/sinalizar
  a linha (toast de erro citando qual linha da nota falhou) em vez de importar silenciosamente
  com data errada. Investigar todos os call sites antes de mudar a assinatura, para não quebrar
  silenciosamente em outro lugar.
- **(c) Testes:** entrada vazia e entrada malformada devem retornar `null`, não `Date.now()`;
  teste do fluxo de upload confirmando que uma linha com data inválida gera aviso ao usuário e não
  é importada silenciosamente com timestamp de hoje.

---

## ITEM 3 — Feedback do Usuário Descartado (`FeedbackWidget.tsx`) — Decisão de Produto Necessária

### Causa raiz confirmada
`src/components/ceiling/FeedbackWidget.tsx:29-34`:
```typescript
function handleSend() {
  ...
  setSubmitting(true);
  // Backend wiring will come later — simulate a brief send.
  setTimeout(() => { ... toast.success(labels.success); }, 300);
}
```
O comentário já admite: nunca teve backend. Investiguei — **não existe nenhuma infraestrutura**
no projeto para receber esse feedback (nem coleção Firestore, nem server function, nem endpoint
de e-mail). Isso não é um bug de 1 linha, é uma feature que nunca foi terminada.

### 🛑 Não decidir sozinho — 2 caminhos válidos, escolha de produto
1. **Persistência mínima agora:** criar coleção Firestore (ex:
   `feedback/{autoId}` ou `users/{uid}/feedback/{autoId}`) e gravar via Admin SDK
   (server function), pelo menos para não perder o dado — sem prometer resposta automática.
2. **Desativar/avisar "em breve":** desabilitar o botão de envio com texto indicando que a
   feature ainda não está disponível, até haver decisão de canal de suporte real (e-mail,
   Zendesk, etc.).

**Não codar este item ainda.** Traga as 2 opções de volta pra mim e pro Paulo com estimativa de
esforço de cada uma (a Opção 1 é pouco código mas levanta pergunta de LGPD — dado de usuário
sendo persistido precisa de política de retenção/exclusão associada, que a Regra 3/advogado LGPD
deste projeto vai exigir; a Opção 2 é 10 minutos de trabalho mas deixa a feature capenga
visível). Aguarde nossa decisão antes de implementar.

---

## Governança (Regra 9) — Tabela Individual por Item

Cada um dos 5 itens recebe sua própria tabela de 9 papéis no relatório de conclusão.

---

## Lembrete Final

Comece pelo plano do Item 4. Para o Item 3, pare na investigação/opções — não implemente sem
decisão explícita de Paulo.
