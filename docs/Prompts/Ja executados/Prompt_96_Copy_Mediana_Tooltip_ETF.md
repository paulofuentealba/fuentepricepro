# Prompt 96 — [EXECUÇÃO] Corrigir copy "média"→"mediana" na Wiki (3 locales) + tooltip de ETF sem consenso em Minha Carteira
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 Modo de operação

Você tem permissão para alterar código/conteúdo nesta rodada, dentro do escopo abaixo.
Classificação (`fuente-product-manager`): **🟡 Melhoria UX/Tech, esforço trivial** — mas
prioridade alta por credibilidade (é o tipo de inconsistência que um investidor profissional
percebe na primeira leitura). Origem: Auditoria UX de 14/08/2026, aba Wiki e aba Minha
Carteira.

**Este prompt NÃO resolve** a decisão em aberto do Prompt 90 (aplicabilidade de Graham a
FIIs/ETFs — decisão de modelagem do Paulo, não do agente). Ele só corrige o texto para
descrever corretamente o que `calculations.ts` **já** implementa hoje (mediana), e adiciona
uma explicação onde hoje não existe nenhuma.

---

## 1. Contexto

**Item A — Wiki (`/app/docs`):** o texto do "Consenso Fuente" afirma que o consenso é obtido
"extraindo a **média** de Bazin, Graham e Gordon" — mas `calculations.ts` implementa
**mediana**, não média (confirmado na investigação do Prompt 90). Para o perfil profissional,
essa é uma inconsistência que mina confiança: "o texto descreve uma fórmula diferente da que
roda".

**Item B — Minha Carteira (`/app/myportfolio`):** ETFs sem consenso hoje mostram `--` sem
nenhuma explicação. Um investidor iniciante pode achar que é erro. Um tooltip curto
("Bazin/Graham/Gordon não se aplicam a ETFs") resolve em uma linha.

---

## 2. Plano de Implementação Obrigatório (Regra 8)

**(a) Arquivos:**
- Conteúdo da Wiki nas **3 locales**: `src/lib/i18n/pt-BR/*` (docs/wiki), `src/lib/i18n/en/*`,
  `src/lib/i18n/es/*` — **confirme se o mesmo erro conceitual existe em EN ("average") e ES
  ("promedio")** antes de assumir que é só um problema de PT-BR; a Auditoria só citou o texto
  em português, mas Regra 2 exige consistência nas 3 locales.
- Componente de Minha Carteira onde ETFs sem consenso renderizam `--` — adicionar tooltip
  reusando o componente de Tooltip/Popover **já existente** no projeto (Regra 1 — não criar
  primitivo novo de tooltip).
- Novas chaves i18n para o texto do tooltip, nas 3 locales.

**(b) Lógica central:**
- Trocar a palavra "média"/"average"/"promedio" por "mediana"/"median"/"mediana" **apenas**
  onde o texto descreve o método de agregação do Consenso Fuente.
- **Ler o parágrafo inteiro antes de editar**: se houver um exemplo numérico ilustrando o
  cálculo logo em seguida (ex: "some os 3 valores e divida por 3"), esse exemplo também
  precisa ser reescrito para demonstrar mediana (valor do meio, não soma/3) — trocar só a
  palavra e deixar o exemplo antigo criaria uma inconsistência nova, pior que a atual.
- Tooltip do item B: texto curto, sem jargão adicional, no padrão já usado em outros
  tooltips do app (confirmar tom/comprimento com exemplos existentes antes de escrever um
  novo).

**(c) Pontos de Atenção & Decisões de Arquitetura (risco → decisão):**
- **Risco:** o exemplo numérico da Wiki, se existir, pode estar em mais de um lugar (texto
  principal + algum card de exemplo interativo) e ser esquecido em um dos dois.
  **Decisão:** grep pelo termo "média"/"average"/"promedio" no contexto de "Bazin", "Graham",
  "Gordon" ou "Consenso" em **todo** `src/`, não só no arquivo óbvio da Wiki — reportar todas
  as ocorrências encontradas, corrigidas ou não.
- **Risco:** adicionar tooltip em Minha Carteira pode ser interpretado como "resolve" a
  questão maior do Prompt 90 (se Graham deveria ou não se aplicar a FIIs) — não é o caso.
  **Decisão:** o texto do tooltip deve descrever o comportamento **atual** do sistema, sem
  prometer ou sugerir uma mudança futura de modelagem.

---

## 3. Governança de Roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | Sim | Gate obrigatório |
| `fuente-investidor-iniciante` | Sim | Tooltip do item B é diretamente para esse perfil — `--` sem explicação gera dúvida se é erro |
| `fuente-investidor-profissional` | Sim | Inconsistência copy-vs-cálculo é exatamente o tipo de detalhe que esse perfil audita |
| `fuente-ux-designer` | Sim | Reuso do padrão de tooltip existente (Regra 1), tom e comprimento consistentes |
| `fuente-solution-architect` | Não | Sem decisão de arquitetura — mudança é só de conteúdo/i18n |
| `fuente-product-manager` | Sim | Classificação e priorização (esforço trivial) |
| `fuente-advogado-lgpd-gdpr` | Não | Sem dado pessoal envolvido |
| `fuente-business-architect` / `fuente-product-marketing` | Não | Conteúdo educacional interno ao app logado, não copy de venda |

---

## 4. Gates de Verificação Final (rodar do zero, colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

---

## 5. Honestidade de execução

Reporte explicitamente, para as 3 locales: (1) se o erro conceitual existia em EN/ES também,
(2) se havia exemplo numérico a reescrever e como ficou o novo exemplo, (3) todas as
ocorrências do grep do item (c), corrigidas ou não.

---

## 6. Entregável

Commit único: `fix(content): correct median wording in Fuente Consensus wiki (3 locales) +
ETF consensus tooltip [Auditoria UX - Wiki + Minha Carteira]`. Push para `dev`.
