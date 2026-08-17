# PROMPT — Evoluir a Aba Transações (Saldo Corrente, Filtro, Densidade)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo mobile explícito.

CONTEXTO:
A aba "Transações" do detalhe do ativo hoje mostra só a lista bruta de
compras/vendas, sem saldo corrente, sem filtro, e sem indicação visual de
eventos especiais (splits, se/quando forem implementados como evento
explícito no ledger). Para carteiras com muitas transações (import de
CSV histórico, por exemplo), isso vira uma lista longa e difícil de
auditar — problema real para o perfil `fuente-investidor-profissional`,
que espera conseguir conferir o histórico como conferiria um extrato.

ESCOPO:
1. Saldo corrente: cada linha da lista passa a mostrar a quantidade
   acumulada APÓS aquela transação (não só o tamanho da própria
   transação). Reaproveitar a lógica já existente de
   recalculateHoldingFromTransactions para não duplicar cálculo — o
   componente deve receber o histórico já processado, não recalcular
   sozinho.
2. Filtro/busca: quando a lista passar de um certo tamanho (definir
   limiar razoável, ex: 15-20 transações), exibir campo de busca/filtro
   por tipo (Compra/Venda) e por período. Abaixo do limiar, não mostrar
   filtro (evita poluir tela de carteira pequena — regra do iniciante,
   que normalmente terá poucas transações).
3. Reservar um estilo visual diferenciado (ícone diferente de
   compra/venda) para linhas de evento especial (split, bonificação,
   etc.) — só a UI/preparação, SEM implementar a lógica de split em si
   aqui (isso depende da decisão pendente do prompt de investigação do
   Evento Corporativo).
4. Total investido e total de proventos recebidos desse ativo específico
   como resumo no topo da lista (se não existir já em outra aba de forma
   redundante — conferir antes de duplicar).

PROIBIDO:
- Recalcular saldo/quantidade no componente — consumir o dado já
  processado pelo hook/SSOT.
- Implementar qualquer lógica de split real nesta tarefa — é só preparar
  o espaço visual, a lógica vem depois da decisão pendente.
- Adicionar filtro/busca em carteiras pequenas — só acima do limiar
  definido no plano.

ENTREGA:
Plano (com o limiar de transações escolhido e justificativa) → aprovação
→ implementação → tsc/test/build reais colados → capturas de tela mobile
e desktop com carteira grande (filtro visível) e pequena (sem filtro).
```
