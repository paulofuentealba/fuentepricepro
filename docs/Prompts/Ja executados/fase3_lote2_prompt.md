# PROMPT — Fase 3 / Lote 2 (Tier 2: Governança LGPD) — 2 itens
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Branch dev, a partir do commit `138e93e` (Fase 3 / Lote 1, já mergeado nesta
branch). Escopo estritamente limitado aos 2 itens abaixo. Nenhum commit deve ser feito sem
aprovação explícita após os 3 gates (tsc/test/build) com output literal.

## Decisão de TTL confirmada (Rule 7 — já investigado e decidido)
Após a investigação prévia (Opções A/B/C apresentadas com base na ausência de prazo fixo em
`/privacy` e `/terms`), a decisão é: **Opção A — TTL de 12 meses (365 dias)**. Implementar
diretamente com esse valor, sem nova rodada de confirmação.

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

## ITEM 2 — TTL de expiração no Cookie Consent (12 meses)

**Arquivo:** `src/lib/cookieConsent.ts` (chave `"cookieConsent.v1"`, linha ~13).

**Problema:** o consentimento fica salvo no `localStorage` indefinidamente, sem expiração por tempo.

**Plano de implementação:**
- Implementar TTL de **365 dias** a partir do timestamp de consentimento já registrado junto ao
  valor salvo em `"cookieConsent.v1"`.
- Ao carregar a aplicação, se o consentimento existir mas estiver expirado (mais de 365 dias desde
  o timestamp salvo), tratar como se não houvesse consentimento — reexibir o `CookieConsentBanner`.
- Não alterar o comportamento para quem consentiu dentro do prazo — continuar sem exibir o banner.
- Não bump a chave de storage (`"cookieConsent.v1"` continua v1) a menos que o formato do valor
  salvo precise mudar para acomodar o timestamp — se precisar mudar o formato do valor, confirme
  primeiro se o timestamp já não está sendo salvo hoje (investigar antes de assumir).
- Usar a mesma função SSOT de data/hora já usada no projeto (não reimplementar cálculo de dias com
  lógica solta nova).

**Risco:** baixo — não há scripts de analytics ativos hoje, então o pior caso de um bug aqui é o
banner reaparecer cedo/tarde demais, não um vazamento de consentimento.

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

Não resuma output. Cole o terminal completo, incluindo contagem de arquivos, duração e exit code.
Traga o diff completo (`git diff src/`) dos 2 itens junto com os 3 gates antes de eu aprovar
qualquer commit.
