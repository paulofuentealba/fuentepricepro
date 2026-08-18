# ANÁLISE MULTI-PAPEL — "My Journey" mostrando só Agosto (2 causas empilhadas)

> Copiar e colar no chat `[EXECUÇÃO]`. Investigação com
> `/fuente-solution-architect`, `/fuente-architecture-review`,
> `/data:explore-data`, `/fuente-ux-designer`, `/frontend-design`,
> `/fuente-product-manager`. Não é um bug só — são dois, empilhados: um de
> dado (raiz real do sintoma) e um de design (que continuaria incomodando
> mesmo com o dado corrigido).

---

## `/data:explore-data` + `/fuente-solution-architect` — Causa Raiz do Dado

**O campo `investingSince` nunca é recalculado a partir do histórico real
de transações — diferente de `quantity`/`averagePrice`, que têm
`recalculateHoldingFromTransactions` como caminho único de mutação
(Regra 4), `investingSince` não tem NENHUM caminho canônico de
recálculo.**

Rastreei todos os pontos onde `investingSince` é definido:

1. `AssetForm.tsx` linha 87 — ativo novo adicionado manualmente:
   `investingSince: Date.now()` (a data em que foi adicionado ao APP, não
   a data real da primeira compra).
2. `useWatchlistCsvImport.ts` linhas 139, 219, 299 — import de CSV/nota de
   corretagem:
   ```typescript
   investingSince: existing?.investingSince ?? txTimestamp,
   ```
   **Este é o bug.** Se o item JÁ EXISTE na watchlist, o código sempre
   mantém o `investingSince` atual — mesmo que a transação importada seja
   de uma data MAIS ANTIGA. Deveria ser o MÍNIMO entre os dois, não
   "mantém o que já tem".
3. `recalculateHoldingFromTransactions` (`transactionsLogic.ts`) — **não
   toca em `investingSince` nunca**, confirmado por busca no arquivo.

**Cenário que reproduz exatamente o sintoma do Paulo:** ele tem uma
transação de compra de 19/10/2022 (print anexo). Se o ativo correspondente
foi adicionado à watchlist do Fuente Price Pro DEPOIS dessa data (comum —
ninguém importa histórico completo no dia exato da primeira compra),
`investingSince` ficou gravado com a data de quando o ativo entrou no
app, não 2022. `Math.min(...items.map(it => it.investingSince))`
(`src/lib/cashflow.ts` linha ~87, usado pra determinar o início da
"Jornada") pega o MENOR `investingSince` de todos os itens — se TODOS os
itens tiverem esse mesmo problema (nenhum reflete a data real de compra),
o "início da jornada" calculado vai ser recente, mesmo o usuário
investindo desde 2022.

### TAREFA — Confirmar com dado real antes de corrigir

```typescript
import { adminDb } from "./src/lib/firebase-admin.server.ts";

const MY_EMAIL = "paulo@fuentepricepro.com";

async function investigate() {
  const usersSnapshot = await adminDb.collection("users").where("email", "==", MY_EMAIL).limit(1).get();
  if (usersSnapshot.empty) { console.error("Usuário não encontrado"); return; }
  const uid = usersSnapshot.docs[0].id;

  const assetsSnap = await adminDb.collection(`users/${uid}/assets`).get();
  console.log(`Total de ativos: ${assetsSnap.size}\n`);

  for (const doc of assetsSnap.docs) {
    const data = doc.data();
    if (!data.quantity || data.quantity <= 0) continue;

    const txSnap = await adminDb.collection(`users/${uid}/transactions`)
      .where("ticker", "==", data.ticker).orderBy("date", "asc").limit(1).get();

    const realFirstTxDate = txSnap.empty ? null : new Date(txSnap.docs[0].data().date).toISOString().slice(0, 10);
    const storedInvestingSince = new Date(data.investingSince).toISOString().slice(0, 10);
    const mismatch = realFirstTxDate && realFirstTxDate !== storedInvestingSince;

    console.log(
      `${data.ticker.padEnd(10)} investingSince gravado=${storedInvestingSince}  primeira transação real=${realFirstTxDate ?? "N/A"}` +
      (mismatch ? "  ⚠️ DIVERGENTE" : "")
    );
  }
}
investigate().catch(console.error);
```

Rode e cole a saída — vai mostrar exatamente quantos ativos (e quais)
têm `investingSince` errado, confirmando ou refutando a hipótese antes de
qualquer correção em massa.

---

## `/fuente-architecture-review` — Classificação do Achado

```
Violação: Regra 4 (SSOT) por omissão — não existe caminho canônico de
recálculo para investingSince, diferente de quantity/averagePrice.
Severidade: Alta — afeta cálculo exibido ao usuário (início da jornada),
mas não afeta valuation diretamente (não entra em getAssetValuation).
Correção mínima: em useWatchlistCsvImport.ts (3 ocorrências), trocar
`existing?.investingSince ?? txTimestamp` por
`Math.min(existing?.investingSince ?? Infinity, txTimestamp)`.
Correção estrutural (recomendada, escopo maior): criar uma função
canônica `recalculateInvestingSinceFromTransactions(transactions)` —
mesma filosofia de recalculateHoldingFromTransactions — chamada em todo
ponto que adiciona transação (TransactionsPanel, CSV import, broker note
upload), não só no import. Isso fecha o gap de vez, não só no caminho que
apareceu no bug de hoje.
```

---

## `/fuente-ux-designer` + `/frontend-design` — O Segundo Bug (Design, não Dado)

Mesmo com `investingSince` corrigido, **"My Journey" tem um teto artificial
de 12 meses** — em `src/lib/cashflow.ts` linha ~90:

```typescript
if (mode === "journey") {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(currentYear - 1);
    oneYearAgo.setMonth(currentMonthIndex + 1); // Rolling 12 months

    let startDate = earliestDate;
    if (startDate < oneYearAgo) {
      startDate = oneYearAgo;   // <- nunca deixa "Jornada" mostrar mais que ~12 meses
    }
```

Isso significa: um usuário investindo desde 2022 (quase 4 anos) NUNCA vai
ver mais que 12 meses em "My Journey", mesmo depois do dado corrigido —
o nome da feature promete "sua jornada" (implicitamente, desde o início),
mas a implementação trava em 1 ano. Isso deixa "My Journey" quase
redundante com "Calendar Year" (que já mostra o ano corrente).

**Pergunta de design que precisa de decisão, não é óbvio:** 12 barras
mensais já é bastante informação visual num gráfico de barras — pra
alguém com 4 anos de histórico, mostrar 48 barras mensais individuais
provavelmente fica ilegível. Duas direções possíveis:
- **Opção A:** "My Journey" mostra tudo desde `investingSince` real, mas
  agrupado por ANO em vez de mês quando o período for maior que ~18
  meses (view adaptável).
- **Opção B:** Manter "My Journey" como janela rolante de 12 meses (é uma
  visão deliberada de "últimos 12 meses", não literalmente "desde que
  comecei"), e renomear a aba pra deixar isso explícito (ex: "Últimos 12
  meses" em vez de "My Journey") — evita a promessa que o nome não
  cumpre.
- **Opção C:** Adicionar uma terceira visão "Todo o período" separada de
  "My Journey" (12 meses) e "Calendar Year" (ano corrente), sem mexer no
  comportamento das duas existentes.

## `/fuente-product-manager` — Priorização

- **Bug de dado (`investingSince`):** P1 — não é P0 porque não corrompe
  valuation nem dado financeiro crítico como o bug do BRAP4, mas é visível
  e mina confiança ("meu app não sabe há quanto tempo eu invisto").
- **Teto de 12 meses em "My Journey":** decisão de produto, não bug
  técnico — precisa da escolha entre as 3 opções acima antes de qualquer
  código. Não decidir sozinho.

---

## TAREFA PARA O ANTIGRAVITY

### Fase 1 — Diagnóstico (script acima)
Rode e cole a saída antes de qualquer código.

### Fase 2 — Corrigir o bug de dado (Regra 8, após Fase 1 confirmar)
1. Corrigir as 3 ocorrências em `useWatchlistCsvImport.ts` para usar
   `Math.min` em vez de "mantém o existente".
2. Avaliar se vale implementar `recalculateInvestingSinceFromTransactions`
   como função canônica agora ou registrar em `BACKLOG_V2.md` para rodada
   separada — reportar recomendação, não decidir sozinho.
3. Se a Fase 1 confirmar ativos com `investingSince` já errado no banco:
   propor (não executar ainda) um script de correção retroativa,
   mesma disciplina do BRAP4 — plano revisado antes de tocar dado de
   produção em massa.

### Fase 3 — Decisão de design (aguardar resposta de Paulo às 3 opções)
Não implementar nada do teto de 12 meses até Paulo escolher A, B ou C.

Rode `npm run test`, `npx tsc --noEmit`, `npm run build` — output literal
e completo, sempre. Commits separados por fase/achado.

## PROIBIDO
- Proibido tocar no comportamento do teto de 12 meses sem Paulo escolher
  entre as 3 opções.
- Proibido rodar correção retroativa de dado em massa nesta rodada — só
  diagnóstico e fix do bug de importação futura.
