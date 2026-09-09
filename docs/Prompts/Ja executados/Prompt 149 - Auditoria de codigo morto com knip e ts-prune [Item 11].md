# Prompt para Antigravity — Auditoria de Código Morto em `src/lib` (Item 11)

## Modo de operação

`[REVISÃO]`. Este prompt não altera nenhum arquivo de produção — só roda ferramenta de análise estática e reporta o resultado bruto. Nenhum commit ao final.

## Contexto

Auditoria arquitetural anterior mapeou os 83 arquivos de `src/lib` por categoria (SSOT financeiro, estado de portfólio, import/parsing, API, config/sessão, i18n, domínio/tipos, hooks de UI-state, erro/observabilidade, legal/conteúdo estático). Não foi possível confirmar quais desses arquivos têm consumidores reais sem uma ferramenta de análise de grafo de imports — leitura manual arquivo-por-arquivo não escala e não tem garantia de completude.

## Escopo técnico

1. Instalar (se ainda não presente) e rodar `knip`:
   ```bash
   npx knip
   ```
2. Se `knip` reportar ruído excessivo de falso-positivo (comum em projetos com file-based routing do TanStack Router, que importa arquivos implicitamente via convenção de nome), rodar também `ts-prune` como segunda fonte:
   ```bash
   npx ts-prune
   ```
3. Colar o output **bruto e completo** dos dois comandos no relatório de conclusão — sem resumir, sem filtrar, sem interpretar. A classificação de severidade de cada achado é feita por Claude depois, com os 9 papéis de governança.
4. Focar a leitura do output em arquivos dentro de `src/lib/` (não `src/components/` ou `src/routes/`, que já foram cobertos em auditorias anteriores) — mas colar o output completo de qualquer forma, para não perder contexto de arquivos relacionados.

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| `knip`/`ts-prune` podem reportar falso-positivo em arquivos consumidos só via import dinâmico (`React.lazy`, `import()`) ou convenção de rota do TanStack Router | Não remover nada nesta passada — é só coleta de dados. Falsos-positivos são filtrados na análise seguinte, não aqui |
| Se nenhuma das duas ferramentas estiver instalada e a instalação falhar (rede, permissão, etc.) | Reportar o erro exato, não improvisar uma alternativa (ex: não escrever um script de grep customizado para substituir a ferramenta) |

## Proibido

- Deletar, mover, ou modificar qualquer arquivo com base no output desta análise nesta passada.
- Interpretar ou priorizar os achados — só coletar e reportar.
- Fazer commit.

## Governança de roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório, mesmo para revisão read-only |
| `fuente-solution-architect` | ❌ | Não há decisão de desenho nesta passada — só coleta |
| Demais 7 roles | ❌ | Passada é puramente mecânica (rodar ferramenta, colar output) |

## Saída esperada

Output literal de `npx knip` (e `npx ts-prune` se necessário) colado na íntegra. Sem gates de `tsc`/`test`/`build` aqui — não há mudança de código para verificar.
