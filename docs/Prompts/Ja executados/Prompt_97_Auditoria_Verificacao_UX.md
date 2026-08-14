# Prompt 97 — [REVISÃO] Auditoria de Verificação — 5 itens abertos da Auditoria UX de 14/08/2026
> Copiar e colar integralmente no chat `[REVISÃO]` do Antigravity (ou `[EXECUÇÃO]`, mas em
> modo auditor — ver Seção 0).

---

## 🛑 MODO DE OPERAÇÃO — LEIA ANTES DE QUALQUER OUTRA COISA

Você vai atuar **exclusivamente como Auditor** nesta tarefa, igual ao modelo já usado no
"Code Sweep Arquitetural". Isso significa, sem exceção:

1. **Você NÃO tem permissão para alterar nenhum arquivo nesta rodada.** Nenhum
   `create_file`, nenhum `str_replace`, nenhum `git commit`. Zero.
2. Sua única entrega é um **relatório de verificação**, no formato da Seção 3.
3. Se sentir o impulso de "já corrigir enquanto verifica" — resista. Corrigir é a próxima
   conversa, com plano formal próprio (Regra 8), não esta.
4. **Sobre honestidade de escopo:** se não conseguir verificar algum item por limitação de
   ambiente (ex: sem captura de screenshot real, sem conta de produção autenticada), diga
   isso explicitamente — mesma exigência já aplicada na Auditoria UX de 14/08/2026 e no Code
   Sweep Arquitetural. Uma verificação parcial e declarada é aceitável; uma que finge ser
   completa não é.

---

## 1. Contexto

A Auditoria UX de 14/08/2026 (`AUDITORIA_UX_2026-08-14.md`) deixou 5 itens marcados como
"não foi possível verificar nesta rodada" ou como recomendação de checagem adicional antes
de fechar. Nenhum deles é, hoje, um bug confirmado — são **hipóteses ou verificações
pendentes**. Este prompt existe para transformar cada um em **confirmado / não confirmado /
requer decisão de Paulo**, com evidência, antes de qualquer prompt de correção ser gerado
para eles.

---

## 2. Áreas de Verificação Obrigatórias

Para cada área, reporte **evidência concreta** (trecho de código com caminho+linha, ou
resultado de comando/teste executado) — não opinião ou impressão.

### 2.1 Completude do export CSV/Excel — Minha Carteira
Achado de origem: "Falta visível (não testável sem export real): confirmar que o export
CSV/Excel traz as 40+ colunas cruas, não só o resumo — critério de bloqueio do
`fuente-investidor-profissional` se vier resumido."
- Localizar a função de export (grep por `export`, `csv`, `xlsx` em `src/lib/` e
  `src/components/`).
- Gerar um export real (dado de dev é aceitável aqui, é só para contar colunas) e listar
  **todas** as colunas presentes vs. as colunas do estado interno da carteira.
- Reportar: número exato de colunas exportadas vs. número de campos disponíveis no dado
  bruto da carteira.
- Relevância LGPD (`fuente-advogado-lgpd-gdpr`): este export é também o mecanismo de
  Portabilidade (Art. 18 LGPD) — confirme também se ele inclui, quando aplicável,
  transações e não só posição consolidada.

### 2.2 Formulário duplicado em inglês (display:none) — Aporte Inteligente
Achado de origem: "existe uma segunda cópia do formulário inteira em inglês, presente no DOM
mas com `display:none`... parece um artefato de um variante mobile/desktop montado
simultaneamente."
- Localizar o(s) componente(s) de `/app/smartallocation` responsáveis pelo formulário.
- Confirmar se é: (a) código morto de uma refatoração anterior nunca removido, (b) uma
  variante de layout condicional que deveria estar com `hidden`/render condicional em vez de
  `display:none` sempre montado, ou (c) outra causa.
- Se for código morto: confirmar que não há **nenhum** import ativo apontando para ele antes
  de recomendar remoção (Regra 3 — arquivo/bloco órfão deve ser sinalizado para remoção, não
  removido nesta rodada).

### 2.3 Paleta dos 3 gráficos do Cash Flow
Achado de origem: "Não foi possível capturar screenshot nesta sessão... recomenda-se rodar o
validador do skill `dataviz` (`scripts/validate_palette.js`) contra as cores reais usadas
nesses 3 charts antes de dar como fechado."
- Rodar o validador do skill `dataviz` contra as cores reais dos 3 gráficos de
  `/app/cashflow` (mensal, acumulado, investido-vs-recebido).
- Reportar contraste (WCAG AA) e se a paleta é colorblind-safe, com o output literal do
  validador — não uma impressão visual.

### 2.4 Milestone "50% da renda coberta" — Home
Achado de origem: "Milestone '✓ Primeiros R$ 100 mil' é um ótimo toque de gamificação... mas
só um milestone aparece; vale conferir se o de '50% da renda coberta' também dispara."
- Localizar a lógica de milestones da Home (`/app`).
- Listar **todos** os milestones definidos no código (não só os dois citados na auditoria).
- Para cada um, confirmar a condição de disparo e se há um caminho de teste (fixture de dev
  ou cálculo manual) que comprove que ele dispara quando a condição é satisfeita — não
  apenas que a condição existe no código.
- Reportar também: existe CTA visível para "configurar meta de renda" perto do número-herói
  da Home, ou o achado original (CTA ausente) se confirma?

### 2.5 Mesa de Decisão (Comparador) com 3 ativos em viewport <375px
Achado de origem: "não testado o comportamento em telas <375px com 3 ativos simultâneos,
recomenda-se checagem visual manual."
- Testar `/app/comparator` com 3 ativos adicionados, em viewport 375px e, se possível, 320px
  (menor breakpoint comum).
- Reportar overflow, quebra de layout, ou confirmação de que o limite de 3 ativos já resolve
  bem a densidade nesse viewport (medida real em px, mesmo padrão de evidência já usado para
  o Radar de Risco na auditoria original — "351px medido").

---

## 3. Formato de Saída Obrigatório

Uma tabela, com exatamente estas colunas:

| Item | Confirmado? | Evidência (caminho+linha ou output de comando) | Recomendação | Categoria (`fuente-product-manager`) |
|---|---|---|---|---|

**Regras de preenchimento:**
- **Confirmado?**: Sim (bug real) / Não (falso positivo, tela já correta) / Parcial (achado
  diferente do esperado) / Não verificável neste ambiente (declare o motivo).
- **Recomendação**: se confirmado, direção da correção (não o diff pronto — esta rodada não
  implementa nada) e se merece prompt de execução dedicado ou pode entrar junto de outro já
  existente.
- **Categoria**: use as 5 categorias do `fuente-product-manager` (🔴/🟠/🟡/🟣/⚙️) — nenhum
  item sem categoria.

Ao final, adicione uma seção **"Cobertura da Verificação"** declarando, por item (2.1 a
2.5), se a verificação foi completa, parcial (e por quê), ou bloqueada por limitação de
ambiente.

---

## 4. Governança de Roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | Sim | Padrão mínimo de qualidade, mesmo em modo auditor |
| `fuente-advogado-lgpd-gdpr` | Sim | Item 2.1 toca diretamente o direito de Portabilidade |
| `fuente-product-manager` | Sim | Classificação obrigatória de cada item confirmado |
| `fuente-ux-designer` | Sim | Itens 2.3 e 2.5 são de UX/densidade/acessibilidade |
| `fuente-investidor-iniciante` | Não | Nenhum item toca diretamente onboarding/jargão |
| `fuente-investidor-profissional` | Sim | Item 2.1 é critério de bloqueio explícito deste perfil |
| `fuente-solution-architect` | Sim | Item 2.2 (código morto vs. variante intencional) é decisão de arquitetura |
| `fuente-business-architect` / `fuente-product-marketing` | Não | Nenhum item toca modelo de negócio/posicionamento |

---

## 5. Lembrete Final

Você não vai implementar nada agora, não vai rodar gates de aprovação de código (`tsc`/
`test`/`build`) como critério de fechamento desta rodada — isso é para quando houver plano
de execução dedicado a cada item confirmado, gerado **depois** que este relatório for
revisado por Paulo e Claude.
