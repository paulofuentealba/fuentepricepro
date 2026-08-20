# PROMPT — Desacoplar enriquecimento BR (HG Brasil + Dados de Mercado) do provider para o orquestrador
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Substitui e incorpora o prompt anterior de reordenação de fallback
> (`prompt_reorder_dividendos_fallback_dm_antes_brapi.md`) — não execute
> os dois separadamente, esta versão já contém a ordem correta.

---

## 🛑 MODO DE OPERAÇÃO

Plano de implementação primeiro (Regra 8), gates obrigatórios, output
literal. Escopo: `src/lib/api/brapi.server.ts` e `src/lib/apiService.functions.ts`.
Regra 4 (SSOT): `dividendHistory`/`cagr`/`payoutRatio`/`paymentMonths`/
`dividends3y` continuam vindo exclusivamente do provider base (Brapi ou
Yahoo, o que tiver respondido) — isso não muda. O que muda é onde o
enriquecimento de `dividendEvents`/`pe`/`pb`/`roe`/`currentDy` acontece.

---

## 1. Causa raiz confirmada (auditoria cruzada, código real conferido)

Seu diagnóstico anterior estava certo nos 3 elos da cadeia — confirmei
pessoalmente linha a linha:
- `brapi.server.ts` linha 34: `if (!r.ok) return null;` mata a função antes
  de chegar em HG Brasil (linha 113) ou Dados de Mercado (linha 127).
- `apiService.functions.ts` linhas 177-189: `null` da Brapi cai direto pro
  `fetchFromYahoo`, sem re-tentar HG Brasil/Dados de Mercado.
- `yahoo.server.ts`: zero enriquecimento BR — confirmado, nenhuma menção a
  `fetchHgBrasilDividends`/`fetchDadosDeMercado`.

**O que você não reportou, e é mais grave:** o mesmo bloco de Dados de
Mercado que você identificou para `dividendEvents` (linhas 126-138 de
`brapi.server.ts`) **também enriquece `pe` (P/L) e `pb` (P/VP)**:

```ts
if (pe === null && dmRes.fundamentals.pl) pe = dmRes.fundamentals.pl;
if (pb === null && dmRes.fundamentals.pvp) pb = dmRes.fundamentals.pvp;
roe = dmRes.fundamentals.roe ?? null;
currentDy = dmRes.fundamentals.dy ?? null;
```

`pb` alimenta a fórmula de **Graham**, que é SSOT financeiro (Regra 4). Ou
seja: todo ativo BR que cai pro Yahoo hoje também perde silenciosamente o
enriquecimento de P/VP via Dados de Mercado — não é só a tela de
dividendos que fica incompleta, é potencialmente o cálculo de preço-teto.
**A correção tem que migrar `pe`/`pb`/`roe`/`currentDy` junto com
`dividendEvents`, não só o array de proventos.**

---

## 2. Arquitetura alvo

Mover a chamada de `fetchHgBrasilDividends` e `fetchDadosDeMercado` de
dentro de `fetchFromBrapi` para um passo único no orquestrador
(`apiService.functions.ts`), executado uma vez por ativo `looksBr`, depois
que o asset base já foi resolvido (Brapi OU Yahoo, o que tiver funcionado).

### Ordem de prioridade final para `dividendEvents`, `pe`, `pb`, `roe`, `currentDy`:
1. **HG Brasil** (primário, quando não-vazio/não-nulo)
2. **Dados de Mercado** (segundo, só se HG Brasil vazio/nulo)
3. **Provider base** (Brapi `cash`-derived ou o que o Yahoo já trouxe) —
   último recurso, só se os dois anteriores vierem vazios/nulos

Isso já incorpora a reordenação que eu tinha pedido antes (HG → Dados de
Mercado → Brapi) — não é uma tarefa separada, é a mesma prioridade, agora
aplicada de forma central e funcionando também no caminho Yahoo.

### 2.1 `src/lib/api/brapi.server.ts`

Remova de dentro de `fetchFromBrapi`:
- A chamada a `fetchHgBrasilDividends` (linha ~113)
- A chamada a `fetchDadosDeMercado` e todo o bloco de enriquecimento
  (linhas ~126-138)

`fetchFromBrapi` passa a retornar só o que a própria Brapi trouxe:
`dividendEvents` (a partir de `cash`, como já era antes de qualquer
enriquecimento), `pe`, `pb` brutos da Brapi, `roe`/`currentDy` como `null`
se a Brapi não tiver esses campos nativamente. `dividendHistory`, `cagr`,
`payoutRatio`, `paymentMonths`, `dividends3y` continuam calculados aqui
dentro, sem mudança — isso é SSOT travado, não migra.

### 2.2 `src/lib/api/yahoo.server.ts`

Não precisa de mudança de lógica interna — só confirme que o `ApiAsset`
retornado já expõe `pe`/`pb`/`roe`/`currentDy` (mesmo que `null`) na mesma
estrutura que o retorno da Brapi, pra o enriquecimento do orquestrador
funcionar igual pros dois casos.

### 2.3 `src/lib/apiService.functions.ts`

Depois da resolução do `asset` (linha ~196, após o bloco `if/else` de
`looksBr`), adicione o passo único de enriquecimento:

```ts
if (looksBr && asset) {
  const hgRes = await fetchHgBrasilDividends(raw);
  const { fetchDadosDeMercado } = await import("./api/dadosDeMercadoScraper.server");
  const dmRes = await fetchDadosDeMercado(raw);

  if (hgRes && hgRes.dividends && hgRes.dividends.length > 0) {
    asset.dividendEvents = hgRes.dividends.map((d) => ({
      exDate: d.approvedDate ?? "",
      paymentDate: d.paymentDate ?? null,
      amountPerShare: d.amount,
      isJCP: typeof d.type === "string" && d.type.toUpperCase().includes("JCP"),
    })).filter((e) => e.exDate !== "");
  } else if (dmRes && dmRes.dividendEvents.length > 0) {
    asset.dividendEvents = dmRes.dividendEvents;
  }
  // se nenhum dos dois vier, asset.dividendEvents mantém o que o provider base já trouxe

  if (dmRes) {
    if (asset.metrics.roe === null) asset.metrics.roe = dmRes.fundamentals.roe ?? null;
    if (asset.metrics.currentDy === null) asset.metrics.currentDy = dmRes.fundamentals.dy ?? null;
    if (asset.metrics.peRatio === null && dmRes.fundamentals.pl) asset.metrics.peRatio = dmRes.fundamentals.pl;
    if (asset.metrics.pbRatio === null && dmRes.fundamentals.pvp) asset.metrics.pbRatio = dmRes.fundamentals.pvp;
  }
}
```

Adapte à estrutura real do arquivo (nomes exatos de variável, se `asset`
é mutável nesse ponto ou se precisa reatribuir) — a lógica de prioridade
é o que importa, não o snippet literal.

**Import de `fetchHgBrasilDividends`:** mova o import para
`apiService.functions.ts`, remova de `brapi.server.ts` se não for mais
usado lá.

---

## 3. O que NÃO fazer

- Não toque em `dividendHistory`/`cagr`/`payoutRatio`/`paymentMonths`/
  `dividends3y` — continuam exclusivos do provider base, sem enriquecimento
  cruzado. SSOT travado, Regra 4.
- Não duplique a chamada de HG Brasil/Dados de Mercado — deve rodar
  exatamente uma vez por ativo `looksBr` por fetch, não uma vez dentro do
  provider e outra no orquestrador.
- Não aplique esse enriquecimento a ativos não-`looksBr` (US) — fora de
  escopo.
- Não faça commit nem push sem aprovação explícita.

---

## 4. Testes obrigatórios

Cubra pelo menos estes 4 cenários em
`src/lib/api/__tests__/apiService.functions.test.ts` (ou arquivo equivalente
— crie se não existir):

1. **Brapi sucesso + HG Brasil com dados:** `dividendEvents`/`pe`/`pb` vêm
   da HG Brasil/Dados de Mercado como já esperado hoje (regressão do
   comportamento atual para o caso feliz).
2. **Brapi falha (403) + HG Brasil com dados:** este é o bug relatado —
   `dividendEvents` deve vir da HG Brasil mesmo com o asset base vindo do
   Yahoo. Use AFHI11 como base do mock (dado real da Seção 1 do prompt
   crítico anterior).
3. **Brapi falha + HG Brasil vazio + Dados de Mercado com dados:**
   `dividendEvents`/`pb` devem vir de Dados de Mercado.
4. **Brapi falha + HG Brasil vazio + Dados de Mercado vazio:** `dividendEvents`
   deve manter o que o Yahoo já trouxe nativamente (não pode virar vazio
   nem `null`).

---

## 5. Verificação obrigatória (Regra 8)

```bash
npx tsc --noEmit
echo %ERRORLEVEL%
npx vitest run
npm run build
```

Depois, valide contra dado real: rode a aplicação localmente (ou o
mecanismo de teste manual que vocês já usam) para o ticker `AFHI11` e
confirme que `dividendEvents` bate com a tabela real da Seção 1 do prompt
`prompt_critico_dado_incorreto_afhi11.md` (data-com 14/07/2026 → pagamento
21/07/2026 → R$ 1,03, etc.) — célula por célula, colado no relatório. Sem
essa comparação explícita, o "corrigido" não é aceito (mesma regra da
rodada anterior).

---

## 6. Entrega final

1. Diff de `brapi.server.ts`, `apiService.functions.ts` (e `yahoo.server.ts`
   se precisar de ajuste de tipo).
2. Os 4 testes novos, resultado passando.
3. Confirmação explícita de que `dividendHistory`/`cagr`/`payoutRatio`/
   `paymentMonths`/`dividends3y` não foram tocados.
4. Comparação célula a célula do AFHI11 real vs. exibido, pós-fix.
5. Gates literais.
6. **Sem commit, sem push.** Aguardo revisão de Paulo e Claude antes de
   qualquer aprovação de merge.
