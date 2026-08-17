# PROMPT — Investigação: API dadosdemercado.com.br como Nova Fonte de Dado
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Investigação pura, sem código.

```
Atue como Engenheiro de Dados Sênior. Investigação pura — não altere nada,
não integre nada ainda.

CONTEXTO:
Encontramos dadosdemercado.com.br — site com API pública documentada em
https://www.dadosdemercado.com.br/api/docs, oferecendo indicadores de
mercado, balanços, resultados, fluxos de caixa e classificação setorial
B3 real (Setor/Subsetor/Segmento, não string livre) para ações listadas.

Isso é potencialmente relevante para DOIS gaps já identificados:
1. Comparativo Setorial (investigação anterior concluiu que precisava de
   catálogo novo — esta API pode já ser esse catálogo, pronto).
2. Profundidade de DRE/Balanço/Fluxo de Caixa histórico (13 anos
   trimestrais visíveis no site, mais profundo do que confirmamos ter via
   CVM hoje).

INVESTIGAR, COM EVIDÊNCIA (URL da doc, resposta de teste, etc.) PARA CADA
PERGUNTA:

1. Ler a documentação completa em dadosdemercado.com.br/api/docs. Quais
   endpoints existem? Confirmar especificamente: indicadores de mercado,
   balanços, resultados, fluxos de caixa, classificação setorial,
   dividendos.
2. Requer autenticação/chave de API? É gratuita, paga, ou freemium com
   limite? Qual o rate limit documentado?
3. Os termos de uso permitem uso comercial (um produto SaaS como o
   Fuente consumindo a API para servir a usuários pagantes)? Ler os
   Termos de Uso do site antes de responder — não assumir.
4. A cobertura é só ações BR, ou também FIIs/BDRs? Isso importa porque
   nosso produto cobre Ações BR, Stocks US, FIIs, REITs e ETFs — essa
   fonte só ajudaria a fatia BR de ações.
5. Comparar a profundidade de DRE/Balanço/Fluxo de Caixa que essa API
   oferece contra o que já temos hoje via CVM INF_TRIMESTRAL — é
   genuinamente mais profundo, ou redundante?
6. Se tudo isso for viável (uso comercial permitido, rate limit
   razoável, cobertura útil): estimar o esforço de integração seguindo o
   MESMO padrão de taxonomia de erro das 9 fontes existentes
   (PASSED/FAILED/ERROR/INVALID/WARNING/SKIPPED) — não decidir
   prioridade de uso ainda, só mapear o esforço.

PROIBIDO:
- Integrar qualquer coisa nesta rodada.
- Assumir termos de uso favoráveis sem ler o texto real.
- Prometer que isso resolve o Comparativo Setorial sem confirmar as 6
  perguntas acima primeiro.

ENTREGA:
Relatório respondendo as 6 perguntas com evidência real (links, trechos
citados dos Termos de Uso, exemplos de resposta de endpoint se acessível
sem chave). Aguardar minha decisão sobre se vale a pena um ADR de nova
fonte de dado antes de qualquer prompt de integração.
```
