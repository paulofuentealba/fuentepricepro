# PROMPT — Badge de Confiança na Tabela de Dividendos (HG Brasil vs. Estimado)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior. Apresente PLANO (Regra 8) antes de
qualquer código.

CONTEXTO:
A integração com HG Brasil (já em produção) enriquece `paymentDate` de
dividendos/proventos quando a fonte original (Brapi/CVM) não tem essa
data confirmada. Hoje, na tabela "Dividendos" do detalhe do ativo, todas
as linhas de "Pagamento" aparecem visualmente iguais — não dá para saber
se aquela data é confirmada (veio da HG Brasil ou já foi paga de fato) ou
apenas estimada.

ESCOPO:
1. Investigar como identificar, para cada linha de dividendo exibida, se
   o paymentDate veio de enrichDividendPaymentDates (HG Brasil) ou já
   existia na fonte original, ou se está ausente/estimado. O campo
   precisa existir ou ser adicionado no DTO que já retorna esses dados —
   reaproveitar o padrão de badge de confiança (mesmo conceito usado no
   ValuationAssumption) em vez de inventar um novo.
2. Exibir um indicador visual discreto na coluna "Pagamento" — não um
   badge grande, algo sutil (ex: ícone pequeno com tooltip "Data
   confirmada pela HG Brasil" vs. sem ícone quando é só estimativa).
3. Não é para todo dividendo ter esse indicador — só quando fizer sentido
   distinguir confirmado de estimado (ex: proventos futuros/recentes onde
   a incerteza é real; proventos já pagos há muito tempo provavelmente já
   têm a data real de qualquer fonte, não precisa do badge).

PROIBIDO:
- Badge grande/chamativo — é reforço de confiança sutil, não alerta.
- Inventar taxonomia de confiança nova — reaproveitar o conceito já usado
  em outro lugar do produto (confidenceBadge do ValuationAssumption).

ENTREGA:
Plano → aprovação → implementação → tsc/test/build reais colados →
captura de tela mostrando ao menos uma linha com o indicador e uma sem.
```
