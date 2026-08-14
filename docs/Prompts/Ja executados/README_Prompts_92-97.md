# Índice — Prompts 92 a 97 (correções da Auditoria UX de 14/08/2026)

Gerados a partir de `AUDITORIA_UX_2026-08-14.md`, aplicando o gate de 9 regras
(`fuente-architecture-review`), desenho de solução (`fuente-solution-architect`),
priorização (`fuente-product-manager`), UX (`fuente-ux-designer`), perfis de investidor
(`fuente-investidor-iniciante`/`profissional`) e LGPD (`fuente-advogado-lgpd-gdpr`) onde
aplicável a cada um.

## Ordem de execução recomendada

| # | Prompt | Categoria PM | Por quê nesta ordem |
|---|---|---|---|
| 1 | **92** — Regra Firestore `config/featureGates` | 🔴 Bug Crítico | Sem isso, o painel Admin do Prompt 88 (já gerado, pendente) é decorativo. Trivial, zero dependência dos demais. |
| 2 | **93** — Classificação ETF/BDR (BIVB39) + dívida de teste do Prompt 86 | 🟠 Bug Não-Crítico (Reach alto) | Mesma família de bug já corrigida antes — fecha uma dívida técnica em aberto explicitamente registrada. |
| 3 | **94** — Zero → "indisponível" | 🟠 Bug Não-Crítico | Depende parcialmente do 93 (mesmos tickers na tela), mas é fix independente — pode rodar em paralelo se Antigravity tiver 2 sessões, respeitando o limite de WIP≤2 do `fuente-product-manager`. |
| 4 | **95** — `ResponsiveTable` mobile | 🟡 Melhoria UX/Tech | Sem dependência técnica dos anteriores; prioridade por Reach (Home). |
| 5 | **96** — Copy "mediana" + tooltip ETF | 🟡 Melhoria UX/Tech (trivial) | Menor risco de todos, pode entrar em qualquer sessão livre. |
| 6 | **97** — Auditoria de verificação (5 itens) | Modo Auditor — sem categoria única | Roda em paralelo a qualquer um dos anteriores — não altera código, só produz relatório para os **próximos** prompts (98+). |

**Regra de ouro do `fuente-product-manager` aplicada:** nunca mais de 2 itens "Em Progresso"
simultâneos — o gargalo real é o tempo de revisão do Paulo, não a velocidade do Antigravity.

## O que NÃO virou prompt de execução (decisão de negócio, não bug)

**Nomenclatura "Screener" vs. conteúdo real** (aba `/app/screener` hoje é uma calculadora de
um ticker, não um filtro de lista — quem filtra de fato é o Radar Global). Isso é
**🟣 Decisão de Negócio** no framework do `fuente-product-manager`, não um item técnico —
renomear ou fundir telas muda a informação arquitetural do produto (Regra 7: em caso de
ambiguidade de escopo de produto, parar e sinalizar, não decidir sozinho). Recomendo registrar
em `BACKLOG_V2.md` sob "Decisões de Negócio" com dono = Paulo e data de revisão, não como
Prompt 98.

## Item já corrigido nesta sessão de auditoria (fora dos prompts acima)

**Achado 1.1** — hooks fora de ordem em `NextPaymentBanner.tsx:127-131`, causando crash de
`/app/screener`. Já corrigido, testado (`tsc`/340 testes/`build` limpos) e commitado
(`2dee04c`) durante a própria sessão de auditoria, **antes** deste lote de prompts. Não
precisa de prompt novo — só confirmar que `PROMPTS_LOG.md` e `BACKLOG_V2.md` já refletem essa
entrega (se ainda não refletirem, é o único item de "arrumação de log" pendente, sem código
novo).

## Nota sobre acesso a arquivos nesta sessão

Não tenho, nesta conversa, uma conexão de Filesystem MCP ou GitHub ativa para gravar
diretamente em `C:\Users\paulo\OneDrive\Fuente Price Pro\docs\Prompts`. Os 6 arquivos foram
gerados aqui e você pode copiá-los diretamente (são apresentados como blocos copiáveis, no
seu padrão de trabalho) ou salvar os arquivos anexados nesta pasta.
