# PROMPT 111 — Backlog P2/P3 do Sweep v2 (Warning, Lazy Admin, Type Safety)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> 4 itens independentes, todos confirmados contra código real antes
> deste prompt ser gerado. Prioridade menor que o Prompt 110 — pode
> rodar depois, sem urgência, mas todos são achados reais, não
> especulação.

---

## ITEM 1 (P2) — Warning Estruturado em `yahoo.server.ts`

### Causa Raiz
`src/lib/api/yahoo.server.ts:183` —
`currency: (res.meta.currency as Currency) || "USD"` — assume `"USD"`
silenciosamente sem log quando a API omite o campo. Padrão já
corrigido em `brapi.server.ts` (Prompts 107/109), mas não replicado
aqui.

### Tarefa
- Seguir exatamente o mesmo padrão já usado em `brapi.server.ts`:
  ```ts
  const currency: Currency = (res.meta.currency as Currency) || "USD";
  if (!res.meta.currency) {
    console.warn(`[yahoo] missing currency in response for ${ticker}, defaulted to USD`);
  }
  ```
  (ajustar nome de variável de ticker conforme o escopo real da
  função).
- Confirmar se `"USD"` como fallback faz sentido pra todos os tickers
  que passam por essa função (Yahoo é usado majoritariamente para
  ativos internacionais — diferente do Brapi, que tinha o caso de BDR
  em BRL) — se houver caso onde Yahoo resolve ticker BR, revisar o
  fallback com a mesma lógica condicional já usada no Brapi.

### Gate de Saída
- `npx tsc --noEmit`, `npx vitest run` (teste cobrindo o warning
  disparando quando `currency` ausente), `npm run build`.

---

## ITEM 2 (P2) — Lazy Loading das Abas do Painel Admin

### Causa Raiz
`src/routes/admin.tsx:4-7` importa estaticamente `FeatureGatesTab`,
`IngestionLogTab`, `UsersTab`, `CloudCostsCard` — código carregado por
qualquer usuário que navegue para `/admin`, mesmo que a maioria nunca
tenha acesso (rota já é `admin`-only via `requireAdmin`, mas o bundle
ainda é baixado antes do guard rejeitar, dependendo de como o guard
está implementado — confirmar isso também).

### Tarefa
- Converter as 4 importações para `React.lazy`, com `<Suspense>` por
  aba (não um único Suspense global, pra não recarregar as 4 juntas
  ao trocar de aba).
- Confirmar via leitura do guard de rota (`beforeLoad` em
  `admin.tsx`) se o bundle das abas já é evitado para usuário
  não-admin, ou se isso é um ganho adicional de segurança-por-obscuridade
  além do ganho de performance — reportar essa distinção no relatório.

### Gate de Saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Teste manual: navegar entre as 4 abas do painel Admin, confirmar
  que cada uma carrega corretamente com o fallback de loading.

---

## ITEM 3 (P3) — Tipagem `SecEdgarFactsResponse`

### Causa Raiz
`src/lib/api/secEdgar.server.ts:106` —
`const factsData = await response.json() as any;` — ignora a
estrutura conhecida da resposta da SEC EDGAR (`units.USD`,
`units.shares`, etc.).

### Tarefa
- Criar interface `SecEdgarFactsResponse` com os campos realmente
  consumidos pelo resto da função (não precisa tipar a resposta
  inteira da API se só uma fração é usada — tipar o que é lido).
- Substituir `as any` pela interface nova.
- Confirmar que `tsc` não acusa incompatibilidade real com o uso
  posterior de `factsData` no resto do arquivo.

### Gate de Saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.

---

## ITEM 4 (P3) — Type Guard em `corporateEvents.ts`

### Causa Raiz
`src/lib/corporateEvents.ts:104` —
`(rawEvents as any[]).filter((ev: any) => !appliedIds.has(ev.eventId)) as PendingCorporateEvent[]`
— duplo cast sem validação real de shape.

### Tarefa
- Tipar `rawEvents` como `Array<Record<string, unknown>>` (ou o tipo
  mais preciso que já exista para o dado bruto vindo do Firestore
  nesse ponto).
- Criar type guard `isPendingCorporateEvent(ev: unknown): ev is PendingCorporateEvent`
  validando os campos mínimos esperados, usar no `.filter()` no lugar
  do cast duplo.

### Gate de Saída
- `npx tsc --noEmit`, `npx vitest run` (teste do type guard com
  entrada válida e inválida), `npm run build`.

---

## Proibido em Todos os Itens
- Não expandir nenhum item pra revisão mais ampla do arquivo além do
  ponto específico citado.
- Item 1: não mudar o comportamento de fallback (continua `"USD"`),
  só adicionar o log — a menos que a investigação da tarefa 2 revele
  necessidade real de mudar o fallback, e nesse caso reportar antes de
  decidir sozinho.
