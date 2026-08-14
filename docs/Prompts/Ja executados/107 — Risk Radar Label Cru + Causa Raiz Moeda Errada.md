# PROMPT 107 — Risk Radar: Label Cru de Tipo de Ativo + Causa Raiz da Moeda Errada
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

Duas partes. Parte 1 é fix direto (bug confirmado, sem ambiguidade).
Parte 2 é **investigação primeiro, fix depois** (Regra 8) — o fix do
Prompt 106 estava correto para o que se propôs, mas o sintoma
persistiu porque a causa raiz é upstream, na origem do dado, não no
consumo. Não repetir o padrão de "corrigir onde é fácil ver, sem
achar a causa real".

---

## PARTE 1 — Label Cru de Tipo de Ativo (🔴 confirmado, fix direto)

### Causa Raiz
`src/components/ceiling/RiskRadar.tsx:138` — `{tItem.type}` renderiza
o valor cru do enum (`STOCK_US`, `STOCK_BR`, etc.) em vez de traduzir
via `t.types[...]`. Mesmo padrão de bug já corrigido no Prompt 86 para
`PortfolioTableV2.tsx` — mas esta tela (`RiskRadar.tsx`) nunca foi
tocada por aquele fix.

### Tarefa
- Substituir `{tItem.type}` por
  `{t.types[tItem.type as keyof typeof t.types] ?? tItem.type}` —
  mesmo padrão exato usado em `PortfolioTableV2.tsx` (Regra 1, não
  inventar uma segunda forma de fazer a mesma tradução).
- **Buscar em todo `src/` por outras ocorrências do mesmo padrão**
  (`{item.type}`, `{tItem.type}`, `{asset.type}`, `{it.type}` etc.
  renderizado direto em JSX sem passar por `t.types[...]`) — esse é o
  3º lugar encontrado com esse bug (Prompt 86 achou 1, este prompt
  acha o 2º). Se houver mais, corrigir todos nesta rodada, não deixar
  um 4º pra aparecer depois. Reportar quantos foram encontrados e
  onde.

### Gate de Saída (Parte 1)
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Teste manual: `/app/riskradar` com carteira real, confirmar que
  "Exposure by Asset Class" mostra rótulos traduzidos (ex: "FII",
  "Ação", "Stock"), não `STOCK_BR`/`STOCK_US` crus.

---

## PARTE 2 — Causa Raiz da Moeda Errada (investigar antes de corrigir)

### O Que Já Sabemos (não repetir investigação)
- `usePortfolioRisk.ts:68` já foi corrigido no Prompt 106
  (`item.currency` em vez de inferência quebrada por `type`) — **essa
  correção está confirmada correta no código**, o problema não está
  mais aí.
- Todos os pontos de criação/edição de `WatchlistItem` já verificados
  propagam `currency` corretamente a partir do `Asset` resolvido:
  `buildWatchlistItem.ts:33,42`, `useWatchlistCsvImport.ts` (4
  ocorrências), `transactionPersistence.ts:129-160` (Prompt 105),
  `EditPositionFields.tsx:151`, `AddToWatchlistDialog.tsx` (via
  `buildWatchlistItem`).
- **Suspeita concreta, não confirmada**: `src/lib/api/brapi.server.ts:114`
  tem `currency: (res.currency as Currency) || "BRL"`. Brapi é fonte
  de dado brasileira. Se um ticker `STOCK_US` for resolvido através
  dessa função (em vez de `yahoo.server.ts`), ou se a resposta da
  Brapi para aquele ticker específico não incluir `currency`, o
  fallback grava `"BRL"` **na origem**, antes de qualquer lógica de
  consumo — o que explicaria o sintoma persistir mesmo com o Prompt
  106 correto.

### Tarefas de Investigação
1. Identificar exatamente qual ativo(s) `STOCK_US` na carteira de
   Paulo está com `currency` incorreto (a captura de tela mostra 0.13%
   de peso em `STOCK_US` no card de tipo — é pouco, provavelmente 1
   único ativo). Ler o documento real desse item no Firestore
   (via Filesystem MCP ou script de leitura) e confirmar: o campo
   `currency` armazenado é literalmente `"BRL"`?
2. Se confirmado, rastrear **qual função resolveu esse ticker
   originalmente** — buscar no código quem decide se um ticker vai
   para `brapi.server.ts` vs `yahoo.server.ts` (provavelmente algo
   como `isBrTicker()`/checagem de sufixo `.SA`). Confirmar se esse
   ticker específico foi roteado corretamente ou se caiu no branch
   errado.
3. Se o roteamento estiver correto (foi pro Yahoo, que faz fallback
   `|| "USD"`, não `|| "BRL"`) mas o problema persistir mesmo assim,
   investigar se o item foi criado ANTES de alguma mudança de schema
   (dado legado, de uma época em que `currency` não era
   consistentemente gravado) — nesse caso é problema de dado
   histórico, não de código atual, e a solução é backfill (mesmo
   padrão do Prompt 89, script de correção pontual), não mudança de
   lógica.
4. Reportar a causa raiz encontrada antes de decidir a correção — pode
   ser: (a) bug de roteamento brapi/yahoo, (b) fallback perigoso em
   `brapi.server.ts:114` que deveria falhar/logar em vez de assumir
   BRL silenciosamente, (c) dado legado precisando de backfill, ou
   (d) outra causa não prevista aqui. Não implementar a correção até
   confirmar qual é.

### Correção (após causa raiz confirmada)
- Se for (a) ou (b): corrigir a função/fallback responsável, com teste
  de regressão específico para o ticker afetado.
- Se for (c): script de backfill somente-leitura primeiro (listar
  itens suspeitos: `type` começando com `STOCK_US`/`REIT` mas
  `currency === "BRL"`), depois correção pontual com aprovação de
  Paulo antes de gravar.
- Em qualquer caso: **o fallback `|| "BRL"` em `brapi.server.ts:114`
  merece revisão própria** — assumir moeda silenciosamente quando a
  API não informa é arriscado por natureza (mascarou este bug por
  tempo indeterminado). Avaliar se deveria logar um aviso/warning
  quando esse fallback dispara, em vez de mascarar silenciosamente.

### Gate de Saída (Parte 2)
- `npx tsc --noEmit`, `npx vitest run` (teste de regressão específico
  para a causa raiz encontrada), `npm run build`.
- Teste manual: `/app/riskradar` com a mesma carteira da captura de
  Paulo, confirmar que "Currency Exposure" mostra USD > 0%,
  proporcional ao peso real de ativos dolarizados (deve bater
  aproximadamente com o 0.13% + qualquer outro USD visível no card de
  tipo de ativo).
- Reportar no relatório: qual era a causa raiz real (não presumir no
  prompt, confirmar na execução), e se foi necessário backfill de
  dado além da correção de código.

## Proibido
- Não implementar a correção da Parte 2 sem antes confirmar a causa
  raiz real (não é aceitável repetir "se resolveu daqui, deve estar
  ok" sem testar contra o dado real da carteira de Paulo).
- Não expandir o fallback de `brapi.server.ts` para "sempre assumir
  USD" como solução simplista — a causa pode não ser esse arquivo,
  investigar antes.
