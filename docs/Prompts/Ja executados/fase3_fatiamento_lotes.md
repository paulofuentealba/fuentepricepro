# Fase 3 — Fatiamento em Lotes por Risco (padrão Tier 1/Tier 2 da Fase 2)

Baseado no Relatório de Reconfirmação de Escopo (branch `dev` @ `77cefdd`).

## Critério de priorização

| Achado | Bloco | Natureza do risco | Tier |
|---|---|---|---|
| `/settings` sem `beforeLoad` | A.2 | UX/segurança de borda — dado não vaza, mas tela quebrada para anônimo | **Tier 1** |
| `portfolioBffLogic.ts` sem null-check + sem `MAX_ITEMS` | C.1 | Estabilidade/DoS server-side | **Tier 1** |
| `fetchBenchmarkHistoryFn` sem validação de data | C.1 | Estabilidade server-side (NaN → chamada externa) | **Tier 1** |
| `dataExport.ts` não inclui `feedbacks` | B.1 | Completude do direito de acesso LGPD (não é vazamento, é omissão) | **Tier 2** |
| Cookie consent sem TTL | B.2 | Governança/conformidade — sem urgência (não há scripts de analytics ativos) | **Tier 2** |
| Campos futuros de privilégio no doc `users/{userId}` | Achados Adicionais | Preventivo, sem gatilho hoje | **Backlog (registro apenas, sem execução)** |

Nada do Bloco A.1 (mapeamento), B.3 e C.2 exige ação — já confirmados como corretos/cobertos.

**Ordem de execução recomendada:** Lote 1 (Tier 1) primeiro — são os dois únicos achados desta fase com potencial de instabilidade/quebra de tela em produção compartilhada. Lote 2 (Tier 2) depois, sem bloqueio entre eles. O item de "Achados Adicionais" (proteção futura de campo de privilégio) vai só para o `BACKLOG_V2.md` como nota preventiva — não vira lote, pois não há campo `isAdmin` no documento Firestore hoje (o claim vive no Firebase Auth custom claims, conforme já mapeado).

---

# LOTE 1 (Tier 1 — Segurança/Estabilidade) — Prompt pronto para colar no `[EXECUÇÃO]`

```
# PROMPT — Fase 3 / Lote 1 (Tier 1: Segurança/Estabilidade) — 3 itens

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Branch dev, a partir de 77cefdd. Escopo estritamente limitado aos 3 itens abaixo —
qualquer alteração fora deste escopo (mesmo que "óbvia" ou "de passagem") será rejeitada na revisão.
Nenhum commit deve ser feito sem aprovação explícita após os 3 gates (tsc/test/build) com output literal.

## Classificação PM (fuente-product-manager)
Severidade: ALTA para os itens 2 e 3 (risco de instabilidade em produção — mesmo projeto Firebase
compartilhado entre dev e prod). MÉDIA para o item 1 (UX quebrada para visitante anônimo, sem
exposição de dado). Nenhum destes é bug de dado financeiro (Épico 1), então não bloqueia a agenda
de monetização — mas deve ser resolvido antes de qualquer scale de tráfego não-autenticado.

---

## ITEM 1 — Guarda de rota em `/settings`

**Arquivo:** `src/routes/settings.tsx`

**Problema:** a rota não tem `beforeLoad`. Um visitante anônimo acessando `/settings` vê o formulário
vazio (os handlers fazem `if (!user) return`, mas a tela em si renderiza).

**Plano de implementação:**
- Adicionar `beforeLoad` no `createFileRoute("/settings")`, seguindo exatamente o mesmo padrão já
  usado em `src/routes/admin.tsx:21-46` (aguardar `onAuthStateChanged`, checar usuário autenticado)
  — mas SEM checar `claims.isAdmin` (essa rota é para qualquer usuário logado, não só admin).
- Se não autenticado: redirecionar para `/auth` (mesmo destino usado em outras rotas autenticadas do
  app, confirme o padrão existente antes de decidir o destino final — não invente um novo).
- Não alterar nada do conteúdo interno de `settings.tsx` além do bloco de rota/guarda.

**Risco:** baixo — é aditivo, não remove nenhum comportamento existente para usuário autenticado.

---

## ITEM 2 — Sanitização em `portfolioBffLogic.ts`

**Arquivos:** `src/lib/portfolioBffLogic.ts` (linha ~63) e `src/lib/api/portfolioBff.functions.ts`
(linhas 14-16, validador do TanStack Start).

**Problema:** `item.ticker.trim()` é chamado sem checar se `item.ticker` é string não-nula. O array
`items` não tem limite máximo de tamanho.

**Plano de implementação:**
- Em `portfolioBffLogic.ts`: adicionar guard antes do `.trim()` — se `item.ticker` não for string ou
  estiver vazio após trim, descartar o item silenciosamente (não lançar exceção que derrube o
  request inteiro) ou retornar erro de validação claro, dependendo do que já for o padrão de
  tratamento de erro nesta função (investigar antes de decidir).
- Definir `MAX_ITEMS` (sugestão: alinhar com o mesmo racional de `MAX_QUERY_LEN`/`MAX_TICKER_LEN` já
  usados em `searchAssetsFn`/`checkPendingSplitsFn` em `apiService.functions.ts` — usar um valor
  condizente com o tamanho real de carteira esperado, não um número arbitrário; investigar se há
  algum limite de ativos por carteira já estabelecido no produto antes de cravar o número).
- Validar o limite no validador do TanStack Start em `portfolioBff.functions.ts` (hoje é passthrough
  `(d) => d`), não só dentro da lógica de negócio.

**Risco:** médio — toca uma função usada por telas de estado salvo (`useValuedPortfolio`), então
qualquer mudança de contrato de erro deve ser testada contra os testes existentes desta função.

---

## ITEM 3 — Validação de data em `fetchBenchmarkHistoryFn`

**Arquivos:** `src/lib/apiService.functions.ts` (linhas 554-560) e `src/lib/api/benchmark.server.ts`
(linha ~151).

**Problema:** o validador não confirma que `fromDate`/`toDate` são strings no formato ISO
`YYYY-MM-DD`. Input arbitrário vira `NaN` na chamada à API do Yahoo Finance.

**Plano de implementação:**
- Adicionar validação de formato (regex `YYYY-MM-DD` ou `Number.isNaN` check após `Date.parse`) no
  validador da Server Function, rejeitando o request com erro claro antes de chegar em
  `benchmark.server.ts`.
- Não reimplementar parsing de data — usar as funções SSOT já existentes em `formatters.ts`
  (`getLocalDateISOString`) para qualquer normalização, nunca lógica de data solta e nova.

**Risco:** baixo-médio — é um endpoint server-side isolado; validar contra os testes de
`benchmark.server` existentes, se houver.

---

## Roles Governança (Rule 9) — justificativa obrigatória

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório de todo plano antes de execução — 9 regras AGENTS.md |
| fuente-solution-architect | SIM | Item 2 mexe em padrão de validação/limite de payload compartilhado — checar se `MAX_ITEMS` deveria virar constante central reusável, não local ao arquivo |
| fuente-business-architect | NÃO | Nenhum dos 3 itens altera modelo de negócio ou jornada de valor, só hardening técnico |
| fuente-product-manager | SIM | Classificação de severidade acima |
| fuente-product-marketing | NÃO | Sem impacto em posicionamento/copy |
| fuente-ux-designer | SIM | Item 1 precisa decidir o destino do redirect e o que o usuário vê durante o `beforeLoad` (loading state) — não pode ser um flash de tela em branco |
| fuente-investidor-iniciante | NÃO | Nenhum destes itens é visível para o investidor iniciante como fricção de onboarding |
| fuente-investidor-profissional | NÃO | Não afeta rigor de cálculo/dado exibido ao profissional |
| fuente-advogado-lgpd-gdpr | SIM | Item 1 protege rota que expõe fluxo de exclusão de conta e dado pessoal — confirmar que o redirect não deixa nenhum dado pessoal renderizar antes do redirect disparar (race condition) |

## Gates de Verificação (obrigatórios, output literal)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Não resuma output. Cole o terminal completo, incluindo contagem de arquivos, duração e exit code.
Aguardo os 3 diffs + os 3 gates antes de aprovar qualquer commit.
```

---

# LOTE 2 (Tier 2 — Governança LGPD) — Prompt pronto para colar no `[EXECUÇÃO]`

```
# PROMPT — Fase 3 / Lote 2 (Tier 2: Governança LGPD) — 2 itens

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Só iniciar após Lote 1 estar commitado e mergeado (ou explicitamente liberado em
paralelo por mim). Escopo estritamente limitado aos 2 itens abaixo.

## Classificação PM (fuente-product-manager)
Severidade: MÉDIA-BAIXA para ambos — nenhum é vazamento de dado, são lacunas de completude/robustez
de conformidade. Sem urgência de SLA, mas devem ser fechados antes de qualquer expansão de tráfego
ou auditoria externa.

---

## ITEM 1 — Incluir `feedbacks` no backup de exportação (`dataExport.ts`)

**Arquivo:** `src/lib/dataExport.ts` (função `buildUserDataExport`, linhas ~36-92).

**Problema:** o JSON de backup pré-exclusão de conta inclui ativos, transações e snapshots, mas não
inclui as mensagens de feedback do usuário (subcoleção `users/{uid}/feedbacks`), que já é apagada
pelo fluxo de exclusão. Isso é uma lacuna do direito de acesso/portabilidade LGPD: o dado é
excluído, mas o usuário nunca recebeu cópia dele antes.

**Plano de implementação:**
- Adicionar a leitura da subcoleção `feedbacks` em `buildUserDataExport`, seguindo o mesmo padrão
  já usado para `assets`/`transactions`/`portfolioSnapshots` (mesma função de leitura Firestore,
  mesmo formato de serialização).
- Confirmar no dicionário i18n (`dict.ptBR.ts` + EN + ES) se existe algum texto descritivo do
  conteúdo do backup que precise ser atualizado para mencionar feedbacks — se sim, atualizar nas 3
  línguas (zero hardcode).

**Risco:** baixo — é aditivo ao JSON de export, não altera formato de campos existentes.

---

## ITEM 2 — TTL de expiração no Cookie Consent

**Arquivo:** `src/lib/cookieConsent.ts` (chave `"cookieConsent.v1"`, linha ~13).

**Problema:** o consentimento fica salvo no `localStorage` indefinidamente, sem expiração por tempo.
Práticas de referência de conformidade (incluindo a postura do repo `anthropics/financial-services`
sobre disclaimers) recomendam revalidação periódica do consentimento.

**Plano de implementação:**
- Investigar primeiro (Rule 7) se há algum prazo já definido em `/privacy` ou `/terms` — não decidir
  um número arbitrário de meses sem checar se já existe compromisso público assumido no texto legal.
- Se não houver prazo publicado, apresentar a mim as opções de prazo (ex.: 6, 12, 24 meses — padrão
  de mercado costuma ser 12 meses) para eu decidir antes de implementar — decisão de compliance não é
  autônoma do agente (ver "Decision pattern" do meu modelo de governança).
- Implementar o TTL como timestamp de expiração junto ao registro existente em `"cookieConsent.v1"`,
  reexibindo o banner quando expirado, sem quebrar o comportamento atual de quem já consentiu dentro
  do prazo.

**Risco:** baixo — não há scripts de analytics ativos hoje, então o pior caso de um bug aqui é o
banner reaparecer cedo demais, não um vazamento de consentimento.

---

## Roles Governança (Rule 9)

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório padrão |
| fuente-advogado-lgpd-gdpr | SIM | Gate central desta lote inteira — ambos os itens são governança de dado pessoal |
| fuente-ux-designer | SIM | Item 2 decide quando/como o banner reaparece — não pode ser abrupto ou repetitivo a ponto de irritar o usuário |
| fuente-investidor-iniciante | NÃO | Sem impacto em onboarding financeiro |
| fuente-investidor-profissional | NÃO | Sem impacto em rigor de dado |
| fuente-solution-architect | NÃO | Ambos os itens seguem padrão já estabelecido (leitura de subcoleção, storage local), sem decisão arquitetural nova |
| fuente-business-architect | NÃO | Não altera jornada de valor |
| fuente-product-manager | SIM | Classificação de severidade acima |
| fuente-product-marketing | NÃO | Sem impacto em copy de venda/posicionamento |

## Gates de Verificação (obrigatórios, output literal)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Para o Item 2, antes de codar: me traga as opções de prazo de TTL (Rule 7 — investigar e apresentar
opções, não decidir sozinho) e aguarde minha confirmação antes de implementar.
```

---

# Item registrado só no backlog (sem lote de execução)

**Proteção futura de campo de privilégio em `users/{userId}`** (Achados Adicionais do relatório) —
não há campo `isAdmin` no documento Firestore hoje (o claim vive em Firebase Auth custom claims,
fora do alcance de escrita do client de qualquer forma). Registrar em `BACKLOG_V2.md` como nota
preventiva de arquitetura, para revisão se algum dia um campo de privilégio for adicionado ao
documento — não gera ação agora. Vou adicionar essa linha ao `BACKLOG_V2.md` separadamente, fora
deste fatiamento.
