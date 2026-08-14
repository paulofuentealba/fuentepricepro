# Prompt 95 — [EXECUÇÃO] Componente compartilhado de tabela mobile (coluna fixa) — aplicar na Home, auditar demais telas
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 Modo de operação

Você tem permissão para alterar código nesta rodada, dentro do escopo abaixo. Classificação
(`fuente-product-manager`): **🟡 Melhoria UX/Tech**, mas Reach alto — afeta a primeira tela
que todo usuário logado vê. Origem: Auditoria UX de 14/08/2026, Seção 1 (aba Home) e Seção 3
("Padrões recorrentes" — inconsistência mobile-first entre telas).

---

## 1. Contexto

Duas tabelas do mesmo app, dois comportamentos diferentes em mobile:
- **Radar de Risco** (`/app/riskradar`): encolhe corretamente para 375px sem overflow
  (351px medido) — comportamento-alvo da Regra 5.
- **Home** (`/app`, tabela "Sua carteira"): usa `<table>` puro de ~800px de largura real
  dentro de um wrapper com scroll horizontal, **sem coluna fixa** (`position: static` na
  1ª coluna/célula, confirmado). Ao rolar para ver P&L/Yield, o usuário perde de vista qual
  ativo é qual — anti-padrão "Tabela Infinita Mobile" (ver `fuente-ux-designer`, Seção 6).

Isso indica que a Regra 5 foi aplicada tela a tela, não como padrão de componente — exatamente
o tipo de achado que a Regra 1 (reusabilidade) existe para prevenir.

**Achado adicional, fora de escopo deste prompt:** a coluna "Variação" na Home mostrou "—"
em 100% das linhas testadas na auditoria. Se ao investigar a tabela você identificar que isso
é o mesmo bug do Prompt 94 (zero/dado ausente mal tratado), **não corrija aqui** — reporte a
suspeita de causa raiz compartilhada no relatório de conclusão, para tratamento no Prompt 94.
Se for uma causa raiz diferente e não relacionada, registre como novo item de backlog, também
sem corrigir nesta rodada.

---

## 2. O que fazer

1. Extrair o padrão de tabela responsiva **já correto** do Radar de Risco em um componente
   reusável (`src/components/ui/ResponsiveTable.tsx` ou hook equivalente — confirme se já
   existe algo parecido em `src/components/ui/` antes de criar do zero, Regra 1).
2. Aplicar esse componente na tabela "Sua carteira" da Home, com coluna de ativo (ticker/nome)
   fixa (`position: sticky; left: 0`) durante o scroll horizontal das demais colunas.
3. Varrer as demais telas com tabelas (`Minha Carteira`, `Screener`, `Comparador`, `Radar
   Global`) para identificar outras candidatas ao mesmo componente — não é obrigatório migrar
   todas nesta rodada, mas é obrigatório **reportar** quais foram encontradas.

---

## 3. Plano de Implementação Obrigatório (Regra 8)

**(a) Arquivos:**
- Componente da tabela do Radar de Risco (fonte da extração — localizar via grep)
- Novo `src/components/ui/ResponsiveTable.tsx` (ou nome equivalente já em uso no projeto)
- Componente da tabela "Sua carteira" na Home (localizar via grep, provavelmente em
  `src/routes/app/index.tsx` ou `src/components/dashboard/*`)
- Lista (no relatório, não necessariamente em código nesta rodada) de outras tabelas
  candidatas encontradas na varredura do item 3 acima

**(b) Lógica central:**
- Coluna fixa via `position: sticky; left: 0` com `background` opaco igual ao fundo da
  linha — sob glassmorphism (Regra 6), um sticky transparente deixa o texto por baixo
  vazando durante o scroll, o que é pior que não ter sticky. Confirme visualmente.
- Scroll horizontal contido para as colunas restantes, mantendo o padrão já validado no
  Radar de Risco como referência de comportamento em ≤375px, não reinventado do zero.

**(c) Pontos de Atenção & Decisões de Arquitetura (risco → decisão):**
- **Risco:** o comportamento do Radar de Risco pode ter lógica inline não extraída
  facilmente sem quebrar aquela tela.
  **Decisão:** extraia com testes de regressão visual manual (screenshot antes/depois do
  Radar de Risco em 375px) — a tela de origem não pode regredir para "ganhar" a tela nova.
- **Risco:** "Variação" mostrando "—" em 100% das linhas pode ser interpretado como já
  correto (mesmo padrão do Prompt 94) e silenciosamente "consertado" aqui por engano, sem
  o contexto completo do Prompt 94.
  **Decisão:** não mexer nessa coluna nesta rodada — só documentar a suspeita, conforme
  Seção 1.
- **Requisito de plano (Regra 5):** o plano preenchido deve descrever explicitamente o
  comportamento em viewport ≤375px antes de ser aprovado para execução — não é suficiente
  dizer "vai ficar responsivo".

---

## 4. Governança de Roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | Sim | Gate obrigatório |
| `fuente-ux-designer` | Sim | Lente principal — mobile-first, densidade, consistência de padrão entre telas |
| `fuente-solution-architect` | Sim | Decisão de extrair componente reusável em vez de duplicar padrão tela a tela (Regra 1) |
| `fuente-investidor-iniciante` | Sim | Perder de vista qual ativo é qual ao rolar é exatamente o tipo de fricção que gera ansiedade nesse perfil |
| `fuente-investidor-profissional` | Não | Tabelas densas já atendem esse perfil em conteúdo — este fix é de usabilidade mobile, não de rigor de dado |
| `fuente-advogado-lgpd-gdpr` | Não | Sem dado pessoal novo exposto |
| `fuente-business-architect` / `fuente-product-manager` | Sim (PM) | Classificação e priorização (Reach alto por ser a Home) |
| `fuente-product-marketing` | Não | Sem mudança de copy/posicionamento |

---

## 5. Gates de Verificação Final (rodar do zero, colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

Adicionalmente: descrever no relatório o teste manual em viewport 375px (medida real em px,
como feito na auditoria original — "351px medido" no Radar de Risco é o padrão de evidência
esperado, não "parece responsivo").

---

## 6. Entregável

Commit único: `feat(ui): extract ResponsiveTable with sticky column, apply to Home portfolio
table [Auditoria UX 1.1/Padrão 3]`. Push para `dev`. Relatório de conclusão inclui a lista de
outras tabelas candidatas (item 3 da Seção 2) para virar itens de `BACKLOG_V2.md` sob
Melhoria UX/Tech, com RICE, não migradas automaticamente nesta rodada.
