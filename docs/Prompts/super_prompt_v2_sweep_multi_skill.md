# SUPER PROMPT v2 — Varredura Completa Multi-Lente (Fuente Price Pro)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Este prompt substitui e amplia o `super_prompt_code_sweep_antigravity.md`
> original — mesma disciplina de auditoria, lentes adicionais.

---

## 🛑 MODO DE OPERAÇÃO — SÓ DIAGNÓSTICO, IGUAL DA ÚLTIMA VEZ

1. **Zero alteração de código nesta rodada.** Nenhum `create_file`,
   `str_replace`, `git commit`. Sua única entrega são as tabelas da Seção 5.
2. **Honestidade de cobertura é obrigatória e verificada.** Da última vez a
   varredura foi auditada por Claude com clone real do repositório — vai ser
   de novo. Declarar "X de Y arquivos varridos, faltou Z" é aceitável.
   Fingir 100% e não ter varrido é o pior resultado possível — já causou
   retrabalho neste projeto (contagens fabricadas, "build limpo" que não
   estava limpo, "kind" de API que não foi checado com chamada real antes
   de propor no plano). Não repita.
3. **A base tem ~274 arquivos `.ts`/`.tsx` em `src/` (fora testes).** Uma
   varredura de 9 lentes sobre isso tudo de uma vez, numa sessão só, tende a
   ficar rasa em todas as lentes. Este prompt está fatiado em **3 FASES**
   (Seção 3). Execute a Fase 1 primeiro, entregue o relatório dela, aguarde
   aprovação, só então prossiga para a Fase 2. Não pule fases.
4. **Se uma lente não se aplica a um arquivo/área, diga isso explicitamente**
   em vez de forçar um achado artificial só para preencher a tabela. Achado
   forçado é ruído, degrada a confiança no resto do relatório.

---

## 1. Lentes de Auditoria — 9 Perspectivas, Aplicadas Juntas por Arquivo

Para cada arquivo varrido, considere as 9 lentes abaixo (nem todas se
aplicam a todo arquivo — declare N/A quando for o caso, não force).

### 1.1 `fuente-architecture-review` — Gate das 9 Regras de Ouro
Já usado no sweep anterior — mantém-se. Checklist completo: reusabilidade,
i18n zero-hardcode, isolamento dev/mock, SSOT financeiro, mobile-first, WOW
effect, precedência AGENTS.md, plano de implementação, governança de roles.

### 1.2 `fuente-solution-architect` — Acoplamento
Para cada componente/hook/módulo: UI acoplada a lógica de negócio? Camada de
dados vazando pra cima (componente conhecendo `collection()`/`doc()` do
Firestore direto)? Estado mutável compartilhado sem dono claro? Fan-out de
mudança > 3-4 arquivos sem interface? Classificar 🟢/🟡/🔴 com justificativa.

### 1.3 `/tech-debt` (engineering:tech-debt) — Categorização e Pontuação
Categorizar cada achado como: código, arquitetura, teste, dependência,
documentação, ou infraestrutura. Pontuar `(Impacto + Risco) × (6 - Esforço)`,
escala 1-5 cada. Isso substitui a coluna solta "Risco de Regressão" do sweep
anterior por uma pontuação comparável entre achados de áreas diferentes.

### 1.4 `/validate-data` (data:validate-data) — Especificamente para Lógica
### de Cálculo/Agregação (calculations.ts, cashflow.ts, realizedIncome.ts,
### suggestedAllocation.ts, portfolioIrr.ts, dividendProjection.ts, etc.)
Aplicar o catálogo de pitfalls: mistura de fuso horário (local vs UTC —
já achamos um caso real em `cashflow.ts:72-73` vs `188/247`, procure
outros padrões iguais em outros arquivos), nomes de função que prometem mais
do que garantem (ex: `calculateRealizedIncome` que não filtra settlement),
average-of-averages, denominador mudando no meio do cálculo, viés de
sobrevivência (ex: ativo removido da carteira ainda entrando em cálculo
histórico). Não aplicar essa lente a componentes puramente visuais.

### 1.5 `/testing-strategy` (engineering:testing-strategy) — Gaps de
### Cobertura em Lógica Crítica
Para cada função de domínio (`src/lib/*.ts`, não componentes): existe teste
cobrindo o caso de borda mais perigoso (evento futuro, fuso horário, valor
zero/negativo, dado ausente)? Se a função já causou um bug real neste
projeto (ver `PROMPTS_LOG.md`/histórico), o teste da correção cobre
especificamente o cenário que causou o bug, ou só o caso feliz?

### 1.6 `fuente-investidor-iniciante` — Por Tela/Fluxo (não por arquivo)
Rodar o checklist da persona nas telas principais (Dashboard, Watchlist/
AssetDetailSheet, Onboarding, Import CSV, Upgrade Pro): jargão sem
explicação, ansiedade gerada, sensação de ser guiado. Isso é avaliação de
UX/copy renderizada, não de código-fonte — pode exigir rodar a aplicação
localmente (`localhost:5173`) via Claude in Chrome ou describir com base no
JSX + strings de i18n.

### 1.7 `fuente-investidor-profissional` — Por Tela/Fluxo
Mesma mecânica, persona oposta: toda métrica é auditável (mostra fonte,
data, fórmula)? Exportação CSV/Excel tem paridade com o que a tela mostra?
Zero suavização silenciosa de dado ausente sem sinalização visível?

### 1.8 `fuente-advogado-lgpd-gdpr` — Por Feature que Toca Dado Pessoal
Não é sweep de todo arquivo — é sweep de todo **fluxo** que cria, lê,
atualiza, exporta, ou apaga dado pessoal no Firestore. Usar a tabela de
categorias de dado pessoal do skill como checklist. Sinalizar qualquer
fluxo novo desde o último sweep que não tenha sido revisado sob essa ótica.

### 1.9 `/code-review` (engineering:code-review) — Segurança e Performance
Camada de dados externos (`src/lib/api/*.server.ts`) e funções server
(`apiService.functions.ts`, rotas `createServerFn`): injeção via input não
sanitizado, segredos/chaves hardcoded ou logados, N+1 em loops que chamam
Firestore, falha de tratamento de erro que vaza detalhe interno pro cliente.

---

## 2. Herança do Sweep Anterior — Não Repita, Só Confirme

O sweep anterior (`super_prompt_code_sweep_antigravity.md`) já cobriu SSOT/
Arquitetura, Performance/Referential Equality, Backend/Firebase/Isolamento,
e Qualidade de Código/Type Safety/i18n. **Não refaça essas 4 áreas do zero.**
Nesta rodada, para essas 4 áreas, apenas: (a) confirme se os achados do
relatório anterior foram corrigidos ou ainda estão abertos, (b) aplique as
lentes NOVAS (1.2 a 1.9 acima) sobre o que o sweep anterior não cobriu.

---

## 3. Fatiamento em 3 Fases — Execute Uma de Cada Vez

### FASE 1 — Núcleo Financeiro (prioridade máxima, é onde já achamos bug real)
`src/lib/calculations.ts`, `src/lib/cashflow.ts`, `src/lib/realizedIncome.ts`,
`src/lib/portfolioIrr.ts`, `src/lib/suggestedAllocation.ts`,
`src/lib/dividendProjection.ts`, `src/lib/useValuedPortfolio.tsx`,
`src/lib/api/*.server.ts` (toda a pasta). Lentes: 1.1, 1.2, 1.3, 1.4, 1.5,
1.9. Entregue e pare — aguarde aprovação antes da Fase 2.

### FASE 2 — Camada de Componentes (`src/components/ceiling/**`, com ênfase
em `watchlist/`, `cashflow/`, `assetCard/`)
Lentes: 1.1, 1.2, 1.3, 1.6, 1.7. Entregue e pare — aguarde aprovação.

### FASE 3 — Rotas, Governança de Dado Pessoal, Infra
`src/routes/**`, fluxos de auth/settings/account-deletion/export,
`src/lib/api/*` restante não coberto na Fase 1. Lentes: 1.1, 1.3, 1.8, 1.9.

---

## 4. Honestidade de Cobertura — Repetir o Padrão que Já Funcionou

Ao final de cada fase, declarar por lente: quantos arquivos/telas da fase
foram efetivamente varridos com aquela lente vs. o total da fase. Se uma
lente exigiu rodar a aplicação (1.6/1.7) e isso não foi possível, declarar
isso explicitamente em vez de responder "N/A" genérico.

---

## 5. Formato de Saída — Tabela Única por Fase, Lente Identificada

| Arquivo (caminho + linha) | Lente(s) Aplicada(s) | Descrição do Achado | Pontuação Tech-Debt (I+R)×(6-E) | Regra de Ouro Violada (se aplicável) | Solução Proposta (direção, não diff) |
|---|---|---|---|---|---|

Ordenar cada tabela por pontuação de tech-debt, decrescente — os achados
mais urgentes no topo, não na ordem em que os arquivos foram varridos.

Ao final de cada fase, seção **"Cobertura da Fase N"** conforme Seção 4.

---

## 6. Lembrete Final

Você não vai implementar nada nesta rodada, nem rodar `tsc`/`test`/`build`
como gate — isso é para quando existir plano de execução por achado
específico, que vem depois de eu e Claude revisarmos cada fase. Comece pela
Fase 1. Não pule para a Fase 2 sem aprovação explícita.
