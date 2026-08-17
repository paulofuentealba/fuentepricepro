# PROMPT — Investigação: Como o "Evento Corporativo" Manual Funciona Hoje
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Esta é INVESTIGAÇÃO PURA. Não corrija nada ainda, mesmo que ache óbvio.

```
Atue como Engenheiro Backend Sênior. Esta tarefa é 100% investigação —
NENHUM código deve ser alterado. O resultado é um relatório para decisão.

CONTEXTO:
A tela "Minha Posição" de cada ativo tem uma seção "Evento Corporativo
(Desdobramento/Grup.)" onde o usuário digita uma proporção, vê "Posição
Atual → Nova Posição" e clica "Aplicar Evento". Isso foi implementado há
bastante tempo, antes da arquitetura de SSOT/ledger que consolidamos nos
Prompts 115-125.

Estamos decidindo o desenho de Desdobramentos automáticos via HG Brasil
(Parte 2, pausada). Antes disso, preciso saber exatamente o que esse botão
manual já existente faz por baixo, porque pode estar em conflito direto
com a decisão já aprovada (Opção 2.B: evento SPLIT explícito e auditável
no ledger, nunca ajuste retroativo silencioso).

INVESTIGAR E RESPONDER, COM CAMINHO DE ARQUIVO + NÚMERO DE LINHA PARA CADA
AFIRMAÇÃO (não aceito resposta sem evidência de código):

1. Onde vive o handler do botão "Aplicar Evento"? Qual arquivo, qual
   função?
2. Quando clicado, ele:
   (a) Cria uma transação/evento novo no ledger (`transactions`), OU
   (b) Ajusta diretamente `quantity`/`averageCost` na posição
       (`/users/{uid}/positions/{ticker}` ou equivalente local), sem
       registro no ledger?
3. Se for (b): esse ajuste sobrevive a um recálculo futuro via
   `recalculateHoldingFromTransactions`? Ou seja, se o usuário importar
   um CSV novo ou o read model rodar de novo, o split aplicado
   manualmente se perde?
4. Existe algum teste automatizado cobrindo esse fluxo hoje
   (`__tests__` relacionado a split/desdobramento)? Se sim, o que ele
   valida?
5. Quantos usuários (estimativa, se houver como saber via Firestore
   read, NUNCA escrita) já usaram essa feature, se for possível saber sem
   query cara?
6. Esse botão está sujeito a algum feature gate hoje, ou está disponível
   para todo mundo (Free e Pro)?

PROIBIDO:
- Alterar qualquer arquivo.
- Corrigir o que achar errado — é só relatório.
- Especular sem evidência — se não conseguir confirmar algo com o código,
  diga "não consegui confirmar X, motivo Y" em vez de assumir.

ENTREGA:
Relatório respondendo as 6 perguntas acima, cada uma com citação exata de
arquivo/linha. Aguardar minha decisão antes de qualquer prompt de
correção.
```
