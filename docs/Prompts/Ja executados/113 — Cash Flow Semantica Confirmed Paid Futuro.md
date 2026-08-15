# PROMPT 113 — Cash Flow: Semântica de "Confirmed/Paid" em Meses Futuros
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

Investigação primeiro (Regra 8) — o achado abaixo já identifica a causa
raiz técnica, mas a correção certa depende de uma decisão de produto/
UX que não deve ser tomada sozinha pelo agente.

## Contexto — Causa Raiz Já Confirmada

Paulo reportou: meses futuros (Nov, Dez) no gráfico de Cash Flow
mostram valores não-zero na categoria **"Confirmed/Paid"**, mesmo
sendo meses que ainda não aconteceram.

Investigação em `src/lib/cashflow.ts`:
- `paidAmount` (linha 227): `isPast ? effectiveAmount : 0` — **tem**
  gate correto de mês passado/futuro.
- `realizedAmount` (linhas 232-255): calculado via
  `calculateRealizedIncome(transactions, dividendEventsMap, ...)`,
  bucketado pelo mês de `ev.paymentDate || ev.exDate` — **NÃO tem**
  gate de mês passado/futuro. Um provento já **declarado** pela
  empresa (data-com já passada, logo "renda auferida" no sentido
  contábil/competência), mas com pagamento agendado pra um mês futuro,
  entra em `realizedAmount` normalmente.
- `CashFlowChart.tsx:65`:
  `confirmedAmount: bucket.realizedAmount > 0 ? bucket.realizedAmount : bucket.paidAmount`
  — a UI usa `realizedAmount` como prioridade, rotulando como
  **"Confirmed/Paid"** (cor verde, mesmo tratamento visual de mês
  genuinamente passado).
- **Achado adicional**: existe um campo `announcedAmount` já
  declarado na estrutura do bucket (`cashflow.ts:228`), mas
  **hardcoded em `0`, nunca populado**. Isso sugere fortemente que o
  design original já previa 3 estados (Pago / Anunciado-mas-não-pago /
  Projetado) e ficou incompleto — não é bug de cálculo, é feature
  truncada.

**Não é erro de matemática** — `realizedAmount` reflete corretamente
"renda já declarada por competência". **É problema de rótulo/UX**:
"Confirmed/Paid" para um mês futuro sugere dinheiro já recebido, que
não é o caso.

## Tarefas de Investigação

1. Confirmar a hipótese acima: para os proventos específicos que
   aparecem em Nov/Dez nas capturas de Paulo (`TGAR11`, `VALE3`,
   `LEVE3`, `FGAA11`), rastrear se de fato têm `exDate` já passada mas
   `paymentDate` futura — reproduzir com dado real, não presumir.
2. Investigar se `announcedAmount` foi projetado para resolver
   exatamente este caso (declarado-mas-não-pago) e nunca foi
   finalizado — procurar histórico de commit/comentário que explique
   por que ficou em `0`.
3. Levantar as opções de correção e apresentar para Paulo escolher
   (não decidir sozinho):
   - **Opção A**: Popular `announcedAmount` de verdade (proventos com
     `exDate` passada mas `paymentDate` futura, ou sem `paymentDate`
     confirmada), criar uma 3ª categoria visual na UI ("Declarado",
     cor distinta de verde/azul), e `realizedAmount` volta a significar
     só "genuinamente pago" (com gate de `isPast`, igual `paidAmount`).
   - **Opção B**: Manter só 2 categorias (Confirmed/Paid vs Projected),
     mas mudar o rótulo de "Confirmed/Paid" para algo que cubra os 2
     sentidos sem confundir (ex: "Confirmado" em vez de "Confirmed/Paid",
     com tooltip explicando "declarado pela empresa, pagamento pode
     estar agendado para data futura").
   - **Opção C**: Simplesmente aplicar o mesmo gate de `isPast` que já
     existe em `paidAmount` também para `realizedAmount` — meses
     futuros nunca mostram nada em "Confirmed/Paid", mesmo que haja
     provento declarado. Mais simples, mas descarta informação real
     (o usuário perde a visibilidade de "isso já está garantido, só
     falta a data de pagamento chegar").

## Gate de Saída (após escolha de Paulo)
- `npx tsc --noEmit`, `npx vitest run` (teste de regressão cobrindo o
  cenário exato reportado: provento com `exDate` passada e
  `paymentDate` futura, confirmar que aparece na categoria certa após
  o fix escolhido), `npm run build`.
- Teste manual visual comparando o estado antes/depois nas mesmas 3
  telas das capturas de Paulo (USD, BRL, mês Nov e Dez).

## Proibido
- Não implementar nenhuma das 3 opções sem confirmação explícita de
  qual delas Paulo prefere — apresentar e parar.
- Não remover ou esconder dado real (proventos declarados) só para
  "resolver visualmente" — a informação de que um provento já foi
  declarado é valiosa, o problema é só o rótulo/categoria, não o dado
  em si.
