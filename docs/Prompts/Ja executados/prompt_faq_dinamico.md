# PROMPT — FAQ Dinâmico por Ativo ("Dúvidas Comuns")
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código.

CONTEXTO:
Benchmark contra Investidor10 identificou o bloco "Dúvidas Comuns" como
baixo custo/alto valor: perguntas geradas a partir dos próprios dados do
ativo (cotação atual, quando paga dividendos, variação recente), sem
custo de conteúdo editorial manual.

ESCOPO:
1. Definir 3-4 perguntas fixas por classe de ativo (adaptar por classe —
   uma pergunta sobre "dividendos" não faz sentido igual para um ETF de
   acumulação, por exemplo):
   - "Qual a cotação de [ativo] hoje?"
   - "Quando [ativo] paga proventos?" (mês/frequência baseado no
     histórico real)
   - "[Ativo] vale a pena?" — resposta NEUTRA, baseada em dado (cotação,
     variação, yield), terminando sempre com o disclaimer de que não é
     recomendação — nunca dar veredito de compra/venda.
2. Todo texto é montado a partir de dado real já disponível no
   ValuationResult/asset data — nenhuma resposta genérica ou hardcoded
   sem interpolação do ativo específico.
3. i18n: a estrutura da pergunta/resposta precisa estar nos 3 dicionários
   com interpolação de variáveis (ticker, valores), não texto fixo em
   português.
4. Posicionar na aba Highlights, abaixo do conteúdo já existente, como
   accordion/collapse (não expandido por padrão, para não competir com o
   conteúdo principal).

PROIBIDO:
- Qualquer resposta que soe como recomendação de compra/venda — sempre
  neutro e factual ("a cotação está X, o yield está Y"), nunca "é um bom
  momento para comprar".
- Hardcode de resposta sem interpolação real do dado do ativo.

ENTREGA:
Plano → aprovação → implementação → tsc/test/build reais colados →
captura de tela com um ativo real mostrando as perguntas geradas.
```
