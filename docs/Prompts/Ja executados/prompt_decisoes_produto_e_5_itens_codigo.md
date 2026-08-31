# PROMPT — Decisões de Produto Fechadas + 5 Itens de Código Pendentes
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

1. **As 4 decisões de produto da Seção 1 já estão fechadas — não reabrir a
   discussão.** Elas valem como requisito para qualquer item que dependa
   delas (em particular o Item 18).
2. **Os 5 itens de código da Seção 2 seguem o padrão de sempre: 1 item por
   vez.** Para cada item: você responde com o plano (arquivos + lógica +
   riscos, Regra 8), eu e Claude revisamos, só depois de aprovado você
   codifica, roda os 3 gates, e aguarda autorização explícita antes de
   qualquer `git commit`/`git push`. Não empacote os 5 num commit só.
3. Branch: `git fetch origin dev:dev && git checkout dev && git pull origin dev`
   antes de tocar em qualquer arquivo — sempre a partir do commit local
   `57a66cf` (fix de cashflow), que segue aguardando push separado.
4. Comece pelo **Item 23** (Seção 2.1). Só avance para o próximo item da
   lista depois que o anterior estiver aprovado e (se autorizado) commitado.

---

## 1. Decisões de Produto — Fechadas

### 1.1 Smart Allocation — Regra de Combinação de Estratégias
**Decisão: Média ponderada.** Quando 2+ estratégias são selecionadas, os
pesos sugeridos por `computeSuggestedAllocation` para cada estratégia
individual são combinados por média simples (peso igual entre as
estratégias selecionadas, não ponderado por ordem de clique).

Requisito de transparência (Regra do `fuente-investidor-profissional`): a
UI deve deixar visível que o resultado é uma média — não apresentar como
se fosse uma estratégia única e nova. Exemplo de copy: "Combinação de Max
Yield + Defensive (média 50/50)".

**Rejeitado:** interseção (risco de conjunto vazio sem estratégia de
fallback) e prioridade por ordem de seleção (não é uma escolha consciente
do usuário em um multi-select).

### 1.2 `smartAllocationTargets` — Cache vs Recalculado
**Decisão: Opção B — remover do modelo de dados, recalcular sempre
on-the-fly.** Consistente com a decisão já tomada neste projeto para
`ceilingPrice`/`safetyMargin` (nunca persistir como snapshot estático
quando o cálculo depende de dado de mercado que muda). `computeSuggestedAllocation`
roda inteiramente no client sem chamada de rede — não há ganho de
performance real em cachear, só risco de exibir sugestão desatualizada.

Se `settings.smartAllocationTargets` já existe hoje como campo persistido,
isso entra como item de código adicional (migração/remoção) — investigar
extensão antes de decidir se precisa de item próprio na fila ou se cabe
dentro do Item 11 (já marcado resolvido na re-verificação, mas confirmar
se esse campo específico ainda está sendo escrito em algum lugar).

### 1.3 Export CSV — Simétrico vs Dois Formatos
**Decisão: Opção A — export simétrico com o import.** `buildWatchlistCsv`
(hoje 4 colunas) passa a exportar o mesmo conjunto de colunas que o
importador de CSV aceita de volta, permitindo edição offline em planilha e
reimportação sem perda de dado. Não criar um segundo formato paralelo — um
schema só, para não duplicar manutenção futura.

Isso desbloqueia o **Item 18** da Seção 2 — ver plano de arquivos lá.

### 1.4 Nomenclatura "Screener"
**Decisão: Manter "Screener".** Não renomear. Adicionar 1 subtítulo curto
explicativo abaixo do nome, visível na primeira visita/onboarding (ex:
"Screener: encontre ativos por critério de preço e dividendo"), sem
sacrificar o reconhecimento do termo para o perfil profissional. Isso é
mudança de copy/i18n, não mudança estrutural — pode entrar em qualquer
item de baixo risco já em andamento, ou como item isolado trivial se
preferir tratar separado.

---

## 2. Itens de Código Pendentes — Ordem de Execução

### 2.1 — Item 23: IRR soma taxas na venda em vez de subtrair
**Arquivo:** `src/lib/portfolioIrr.ts:247-256`

**Causa raiz confirmada:**
```typescript
const totalCost = (tx.quantity * sharePrice + fees) * rate;
...
} else if (tx.type === "sell") {
  cashFlows.push({ date: tx.date, amount: +totalCost });
}
```
Na venda, `fees` está sendo **somado** ao valor bruto recebido
(`quantity * sharePrice + fees`), quando deveria ser **subtraído** — taxa
de corretagem reduz o valor líquido recebido na venda, não aumenta.

**Plano esperado (responda antes de codar):**
- Corrigir para `(tx.quantity * sharePrice - fees) * rate` especificamente
  no ramo `sell` — não alterar o ramo `buy` (onde somar faz sentido: taxa
  aumenta o custo de aquisição).
- Investigar se esse mesmo padrão (fees somado em vez de subtraído em
  venda) se repete em outro lugar do arquivo ou em `realizedIncome.ts`/
  `cashflow.ts` — não corrigir só a ocorrência já identificada sem
  verificar duplicação.
- Teste cobrindo especificamente: uma venda com fee > 0, IRR resultante
  deve ser mais baixo do que a mesma venda com fee = 0 (hoje provavelmente
  o IRR fica artificialmente mais alto com fee, o que é logicamente
  invertido).
- Confirmar se esse bug já afetou algum valor exibido hoje em produção
  para investidores que já venderam algo com taxa — se sim, mencionar no
  relatório de conclusão (não é retroativo, é só para registro de
  severidade real).

### 2.2 — Item 17: ID de WatchlistItem conflitante
**Arquivos:** `src/lib/buildWatchlistItem.ts:24`, `src/lib/watchlist.ts:61-63`

**Causa raiz confirmada:**
```typescript
// buildWatchlistItem.ts:24
const id = `${asset.type.toLowerCase()}:${asset.ticker}`;

// watchlist.ts:61-63 (makeId)
export function makeId(ticker: string, type: AssetType) {
  return `${type}:${ticker.toUpperCase()}`;
}
```
Dois formatos de ID diferentes para o mesmo ativo (`stock:FGAA11` vs
`STOCK:FGAA11`), dependendo de qual função criou o documento.

**Plano esperado:**
- Investigar qual dos dois formatos já está em produção hoje na maioria
  dos documentos existentes (leitura Firestore, Regra 3 — só leitura) antes
  de decidir qual formato vira o canônico. Não escolher arbitrariamente.
- Unificar `buildWatchlistItem.ts` para usar `makeId` diretamente, em vez
  de reimplementar a lógica de ID inline — elimina a duplicação (Regra 1).
- Avaliar se é necessário script de migração para documentos já existentes
  com o formato antigo, ou se o sistema já lida bem com IDs mistos (nesse
  caso, só previne novos conflitos daqui pra frente). Não decidir migração
  de dado em produção sem aprovação explícita separada.

### 2.3 — Item 21: `macroDefaults.ts` (magic numbers Selic/IPCA)
**Arquivo novo:** `src/lib/macroDefaults.ts`

**Plano esperado:**
- Criar o arquivo com `SELIC_FALLBACK`, `SELIC_DECIMAL`, `IPCA_DEFAULT`
  (valores atuais, não inventar novos).
- Buscar todas as ocorrências de `10.5`, `0.105`, `?? 10.5` espalhadas
  (confirmar quantos arquivos além de `useSelic.ts` antes de listar no
  plano).
- Substituir cada ocorrência pela constante importada, sem mudar
  comportamento numérico — é refactor puro, não mudança de valor.

### 2.4 — Item 24: Selic lida direto do client
**Arquivo:** `src/lib/useSelic.ts`

**Plano esperado:**
- Migrar o `fetch` direto ao BCB para uma server function
  (`createServerFn`, seguindo o padrão de `apiService.functions.ts`),
  com cache apropriado (TanStack Query `staleTime` — Selic muda raramente,
  cache pode ser longo, sugerir 24h).
- Preservar o fallback gracioso (`SELIC_FALLBACK`) no server, não só no
  client.
- Confirmar que isso não quebra SSR (a chamada precisa funcionar tanto no
  primeiro render server-side quanto em client-side navigation).

### 2.5 — Item 18: Export CSV Watchlist Completo (desbloqueado pela Decisão 1.3)
**Arquivo:** `src/lib/csv.ts`

**Plano esperado:**
- `buildWatchlistCsv` passa a exportar o mesmo conjunto de colunas que o
  parser de import aceita (investigar o parser de import primeiro — quais
  colunas ele lê — antes de decidir o cabeçalho do export, para garantir
  simetria real, não suposta).
- Testes cobrindo round-trip: exportar → reimportar → dado idêntico ao
  original (sem perda de campo).

---

## 3. Governança

Cada um dos 5 itens acima recebe sua própria tabela de 9 roles no relatório
de conclusão — não uma tabela única para os 5. Segue o mesmo padrão rigoroso
das rodadas anteriores desta investigação: diff completo, gates com output
literal, sem commit/push sem autorização explícita por item.

---

## 4. Lembrete Final

Comece pelo plano do Item 23 (Seção 2.1). Não pule para os outros 4 itens
nem para as decisões de produto sem eu confirmar cada etapa.
