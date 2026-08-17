# PROMPT — Tooltips de Jargão + Correções de Polish (Highlights/Minha Posição)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo mobile explícito.

CONTEXTO:
Auditoria de UX identificou 3 problemas na tela de detalhe do ativo
(Highlights + Minha Posição), sob a ótica do investidor iniciante e da
qualidade visual geral. Todos de baixo risco de regressão, mas cada um
com escopo próprio — trate como 3 sub-tarefas dentro do mesmo commit se
fizer sentido, ou commits separados se preferir maior rastreabilidade.

ESCOPO 1 — Tooltips de jargão (iniciante):
Os seguintes termos aparecem sem nenhuma explicação inline hoje:
"Margem de Segurança", "Yield sobre Custo", "PM Calculado", "CAGR Div
(5A)", "Qtd. Calculada". Adicionar ícone de ajuda (mesmo padrão já usado
em outros tooltips do produto) com explicação em 1 frase, linguagem
simples, para cada um. Exemplo de tom (não copiar literal, adaptar):
"Margem de Segurança: quanto o preço atual está abaixo do preço-teto
calculado — quanto maior, mais 'colchão' de segurança na compra."
Buscar se já existe conteúdo de ajuda para algum desses termos em outro
lugar do produto antes de escrever do zero (Regra 1).

ESCOPO 2 — Explicação do "N/A" no método Graham:
Quando um método de valuation (ex: Graham) retorna N/A no diagrama
"Modelo de Valuation Fuente", hoje isso aparece sem contexto — parece
erro, não "não aplicável". Adicionar tooltip no próprio card do método
quando N/A, explicando o motivo (reaproveitar o campo de
assumptions[]/motivo já existente no ValuationResult para essa
finalidade, não inventar texto novo desconectado do dado real).

ESCOPO 3 — Corrigir barra "Meta Alcançada" além de 100%:
Na aba Minha Posição, quando a quantidade atual excede a meta configurada
(ex: 2.500 cotas vs meta de 2.455), a barra de progresso mostra estado
visualmente estranho (parece querer ir além do próprio contêiner). Cap
visual em 100%, e mostrar o excedente como texto separado (ex: "+45
cotas acima da meta") em vez de tentar preencher a barra além do limite.

PROIBIDO:
- Tooltips com texto genérico que não reflita o dado real do ativo (ex:
  explicação de Graham N/A não pode ser texto fixo se o motivo puder
  variar por classe de ativo).
- Alterar qualquer cálculo — é 100% apresentação.

ENTREGA:
Plano → aprovação → implementação → tsc/test/build reais colados →
capturas de tela mobile e desktop mostrando os 3 pontos corrigidos.
```
