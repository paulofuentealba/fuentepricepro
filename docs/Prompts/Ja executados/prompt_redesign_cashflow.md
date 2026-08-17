# PROMPT — Redesign do Gráfico de Cash Flow (estilo Investidor10, cores Fuente)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo comportamento mobile
explícito (Regra 5).

CONTEXTO:
Referência visual anexada por Paulo: o gráfico de Cash Flow do
Investidor10 usa barras por mês com 3 estados visuais distintos
(Confirmed/Paid, Announced, Projected) e um badge de "Best month". Paulo
quer a MESMA clareza visual e estrutura de legenda, mas SIMPLIFICADA para
2 estados (não 3) e usando a nomenclatura e paleta já estabelecidas do
Fuente — não é para copiar cores nem introduzir um terceiro status.

ESCOPO:
- Manter exatamente 2 estados: "Proventos a receber" (projetado, ainda
  não pago) e "Proventos recebidos" (já pago/confirmado) — os mesmos
  dois já usados no card atual, só a APRESENTAÇÃO visual muda.
- Legenda no topo do gráfico (like Investidor10), com indicador de cor
  claro para cada estado — usar os tokens do design system "Horizonte
  FI" já existentes (petroleum green / emerald para "recebido", tom
  secundário/mais claro do mesmo sistema para "a receber" — NÃO usar
  verde/azul genérico do Investidor10, usar a paleta já definida em
  styles.css).
- Cada barra mensal reflete visualmente o mix dos dois estados (empilhada
  ou dividida, mantendo o padrão já usado hoje) — mas com contraste mais
  forte entre os dois do que o gráfico atual (Image 1 anexada por Paulo
  mostra o problema: as duas cores atuais ficam parecidas demais de longe,
  só dá pra distinguir no tooltip).
- Avaliar se faz sentido adotar o indicador de "melhor mês" (troféu, como
  no Investidor10) — se sim, usar ícone/cor do design system, não
  reproduzir o emoji/troféu exato do concorrente.
- Tooltip mantém os 3 valores já existentes (a receber, recebidos,
  total), só reorganizado para bater com a nova hierarquia visual.
- Zero string hardcoded — rótulos "Proventos a receber"/"Proventos
  recebidos" já devem estar no i18n; se não estiverem, adicionar
  corretamente nos 3 idiomas.

MOBILE (Regra 5, obrigatório no plano):
- Legenda não pode quebrar o layout em telas estreitas — considerar
  formato compacto (ícones pequenos + texto abreviado) abaixo de 375px.
- Confirmar que o scroll horizontal do gráfico (se existir) continua
  funcionando com a legenda fixa no topo.

FORA DE ESCOPO — NÃO TOCAR NESTA RODADA:
- O bug já documentado de ETFs e STOCK_US não aparecerem nas projeções de
  Cash Flow. É um bug de DADO, não de design — mistura os dois teria risco
  de mascarar um no outro. Se durante a investigação você notar que esse
  bug interfere diretamente no redesign (ex: dado ausente quebra a barra
  visualmente), PARE e reporte antes de tentar corrigir os dois juntos.

PROIBIDO:
- Introduzir um terceiro estado visual ("Announced") sem eu pedir — Paulo
  foi explícito que quer simples, 2 estados.
- Copiar paleta de cores do Investidor10 — só a estrutura/clareza da
  legenda e do agrupamento por status.
- Hardcode de cor fora dos tokens do design system.

ENTREGA:
Plano (com mockup textual ou referência de componente análogo já existente
no projeto, se houver) → aprovação → implementação → tsc/test/build reais
colados → capturas de tela mobile e desktop comparando antes/depois.
```
