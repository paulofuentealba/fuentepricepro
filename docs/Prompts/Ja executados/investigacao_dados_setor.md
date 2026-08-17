# PROMPT — Investigação: Dados de Setor/Segmento para Comparativo e Pares
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Investigação pura, sem código.

```
Atue como Engenheiro de Dados Sênior. Investigação pura — não altere nada.

CONTEXTO:
Benchmark contra Investidor10 (investidor10.com.br/acoes/bbse3) mostrou dois
módulos que o Fuente não tem: (1) Comparativo Setorial — indicadores do
ativo lado a lado com médias de Setor/Subsetor/Segmento; (2) Empresas
Relacionadas — 4-5 cards de pares do mesmo segmento com P/L, P/VP, DY, ROE.

Investigar, COM caminho de arquivo + linha para cada afirmação:

1. src/lib/api/brapi.server.ts, src/lib/api/yahoo.server.ts e
   src/lib/api/types.ts já referenciam "setor"/"sector"/"segmento" — que
   campo exatamente vem de cada fonte? É taxonomia B3 real (setor/
   subsetor/segmento, como GICS ou classificação B3) ou só um texto livre
   da API (ex: "Financial Services" do Yahoo, sem hierarquia)?
2. Esse campo já é persistido em algum lugar (cache /assets, Firestore) ou
   é buscado ao vivo por request?
3. Para calcular MÉDIA de um indicador por setor (ex: DY médio do setor
   Financeiro), seria necessário ter todos os ativos daquele setor
   carregados de uma vez — isso já existe em algum catálogo/lista interna
   do produto, ou teria que ser buscado ativo por ativo (o que teria custo
   de leitura relevante)?
4. Para "Empresas Relacionadas" (pares do mesmo segmento), existe hoje
   algum mapeamento de "ticker → lista de pares do mesmo segmento", ou
   precisaria ser construído do zero a partir do campo de setor/segmento?
5. Estimativa honesta: isso é um refinamento de dado que já temos
   (semanas de trabalho pequeno) ou precisa de uma fonte/catálogo novo
   (trabalho maior, possível ADR)?

PROIBIDO:
- Prometer prazo ou solução — só levantar o que existe e o que falta.
- Especular sem evidência de código.

ENTREGA:
Relatório respondendo as 5 perguntas com citação exata. Aguardar minha
decisão sobre se avançamos com Comparativo Setorial/Empresas Relacionadas
nesta fase ou adiamos.
```
