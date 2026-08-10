### 40 — Mover "Investing Since" da Calculadora para AssetDetailSheet ✅ CONCLUÍDO E CONFIRMADO

Contexto: Hoje "Investing Since" é pedido no momento de adicionar o ativo na
Calculadora (fricção desnecessária). Deve ser removido de lá e virar um campo
editável dentro da aba "My Position" do AssetDetailSheet, com fallback para
addedAt quando não preenchido manualmente.

Prompt pronto:

Preciso de uma mudança de UX no fluxo de "Investing Since":

1. Remover da Calculadora (fluxo de adicionar ativo)
No componente que hoje exibe o dialog "Confirm details for [TICKER] — Select
the approximate date you started investing in this asset" (campo
`Investing Since`), remova esse campo do fluxo de adição de ativo. O botão
"Done" deve funcionar sem exigir essa data — o ativo é adicionado usando o
`addedAt` (data atual) como valor padrão para `investingSince`, sem pedir
nada ao usuário nesse momento.

2. Adicionar na aba "My Position" do AssetDetailSheet
Na aba My Position, adicione um campo exibindo "Investing Since: [mmm/aa]"
(ex: "Jul/2024"), usando o valor de investingSince do item (com fallback
para addedAt se não tiver sido setado manualmente).

Esse campo deve ser editável — ao clicar, abre um seletor de data (pode
reaproveitar o componente de date-picker que já existia no dialog da
Calculadora) permitindo ao usuário corrigir a data real em que começou a
investir naquele ativo. Ao salvar, deve persistir corretamente no
Firestore/localStorage seguindo o mesmo padrão de USE_LOCAL_ONLY já
validado na Tarefa 38.

3. Garantir que o "Minha Jornada" (Cash Flow) continue funcionando
Como esse campo alimenta o modo "Minha Jornada" no Cash Flow (Tarefa 32/33),
confirme que:
- o fallback para addedAt não quebra o cálculo existente quando o usuário
  nunca editou a data manualmente;
- editar a data em My Position reflete corretamente no gráfico do Cash Flow
  na próxima renderização (invalidação de cache/query, se houver).

Antes de aplicar, confirmar:
- posicionamento do campo dentro do card "My Position" (ideal: perto do
  "QTY" ou como linha de metadata acima dos cards);
- se o date-picker reaproveitado mantém o mesmo comportamento mobile-first
  já validado nas outras abas.

---