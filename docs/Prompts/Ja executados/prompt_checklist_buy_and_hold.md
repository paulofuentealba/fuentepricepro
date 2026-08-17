# PROMPT — Checklist "Investidor de Longo Prazo" (estilo Buy & Hold)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo mobile explícito.

CONTEXTO:
Benchmark contra Investidor10 identificou o "Checklist Buy and Hold" como
o módulo de maior retorno para adicionar: 10 critérios binários (✓/✗)
sobre a saúde de longo prazo do ativo. Isso serve dois perfis ao mesmo
tempo — resposta simples e visual para o iniciante, rigor auditável para
o profissional (fuente-investidor-iniciante + fuente-investidor-
profissional).

ESCOPO — INVESTIGAR PRIMEIRO, DEPOIS IMPLEMENTAR:
1. Mapear, para cada critério abaixo, se o dado já existe no pipeline
   (CVM/SEC EDGAR) e onde. Adaptar a lista para o que for tecnicamente
   viável e financeiramente correto por CLASSE de ativo (nem todos os 10
   critérios do I10 fazem sentido para FIIs/REITs, por exemplo — não
   copiar cegamente, adaptar):
   - Ativo listado há mais de 5 anos
   - Nunca teve prejuízo anual (ano fiscal)
   - Lucro positivo nos últimos 20 trimestres (ou equivalente para a
     classe)
   - Pagou proventos consistentes nos últimos 5 anos (>X% ao ano, definir
     limiar razoável por classe)
   - ROE acima de 10% (não aplicável a FIIs/REITs — usar critério
     equivalente, ex: vacância baixa, ou omitir com nota)
   - Dívida menor que patrimônio
   - Crescimento de receita nos últimos 5 anos
   - Crescimento de proventos/lucro nos últimos 5 anos
   - Liquidez diária mínima
2. Onde algum critério não for calculável com o dado atual, retornar
   null/não-avaliado explicitamente (nunca ✗ falso por falta de dado —
   isso seria pior que não mostrar).
3. Implementar o cálculo no backend (não no componente — mesma regra já
   estabelecida de "frontend só exibe").
4. UI: lista de checklist com ✓ (verde), ✗ (atenção, não vermelho de
   pânico — token var(--warning) ou var(--muted), seguindo regra do
   investidor iniciante) e "—" para não avaliável, cada item com tooltip
   de 1 linha explicando o critério.
5. Disclaimer obrigatório abaixo do checklist (mesmo padrão do I10):
   "Esta ferramenta é apenas informativa e não constitui recomendação de
   investimento" — reaproveitar o disclaimer regulatório já existente no
   produto (RegulatoryDisclaimerBanner ou equivalente) em vez de criar
   texto novo solto.

PROIBIDO:
- Copiar exatamente os 10 critérios do Investidor10 sem adaptar por
  classe de ativo — isso gera critério "ROE > 10%" aparecendo errado num
  FII, por exemplo.
- Mostrar ✗ quando na verdade é "não temos dado" — são estados visuais
  diferentes.
- Hardcode de limiares (5 anos, 10%, etc.) sem justificar no plano.

ENTREGA:
Plano (com a lista final de critérios por classe, adaptada, e a fonte de
dado de cada um) → aprovação → implementação → tsc/test/build reais
colados → captura de tela mobile e desktop.
```
