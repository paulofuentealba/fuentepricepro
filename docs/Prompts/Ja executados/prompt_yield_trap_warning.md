# PROMPT — Adicionar Alerta de Yield Trap na Aba Highlights
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código.

CONTEXTO:
Na aba Highlights de cada ativo, hoje é possível um ativo mostrar DY alto
(ex: 14,52%) junto com CAGR de dividendos negativo (ex: -18,36% em 5 anos)
sem nenhum alerta visual — esse é o padrão clássico de "yield trap"
(yield alto mascarando declínio estrutural de proventos). Investigação
prévia confirmou que o backend já calcula um campo `yieldTrapWarning` no
ValuationResult (ver src/lib/calculations.ts) — o problema é que ele não
está sendo exibido em lugar nenhum da UI.

ESCOPO:
1. Investigar exatamente onde `yieldTrapWarning` é calculado hoje e sob
   que condição ele fica não-nulo (que combinação de DY/CAGR/payout
   dispara o alerta).
2. Exibir esse alerta na aba Highlights do AssetDetailSheet, próximo aos
   indicadores DY Atual / CAGR Div (5A) — como um chip/banner de atenção,
   não um popup bloqueante.
3. Linguagem: seguir o padrão do fuente-investidor-iniciante — não usar
   "yield trap" como termo técnico cru. Algo como "Atenção: yield alto,
   mas os proventos vêm caindo nos últimos anos" + tooltip explicando o
   que isso significa na prática.
4. Cor/token: usar var(--warning), não var(--danger) — é alerta de
   atenção, não erro/prejuízo (regra do investidor iniciante: vermelho =
   pânico desproporcional para capital pequeno).
5. O card CAGR Div (5A) em si também deveria mudar de tom quando negativo
   (hoje é texto neutro) — aplicar var(--warning) ou var(--danger) leve
   quando o valor for negativo, mantendo o número em si sem alarmismo
   exagerado.

PROIBIDO:
- Calcular a lógica de yield trap no frontend — o campo já vem pronto do
  backend, o componente só exibe.
- Usar vermelho/tom de "prejuízo" — é alerta de atenção qualitativa, não
  P&L negativo.
- Bloquear a navegação com modal — é informação inline, não interrupção.

ENTREGA:
Plano → aprovação → implementação → tsc/test/build reais colados →
captura de tela mostrando um ativo com yield trap ativo (pode usar CPTS11
como exemplo, já que os dados reais dele disparam a condição) e um sem.
```
