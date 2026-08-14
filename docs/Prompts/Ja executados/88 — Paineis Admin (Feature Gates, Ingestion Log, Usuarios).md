# PROMPT 88 — Painéis do `/admin` (Feature Gates, Ingestion Log, Usuários)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> PRÉ-REQUISITO: Prompt 87 (Fundação de Auth Admin) já aprovado e
> mergeado. Não rodar este prompt antes disso.

---

## MODO DE OPERAÇÃO

Este prompt não exige plano formal separado (Regra 8) para a maior
parte do escopo — é execução direta sobre uma fundação já aprovada.
A única exceção é o item de segurança do 2.1 (`listUsersFn`), que deve
ser implementado com atenção redobrada a minimização de dados (ver
seção específica abaixo) antes de seguir para a UI.

---

## Contexto e Referências

- Fundação de auth (Prompt 87) já existe: `requireAdmin()` em
  `src/lib/api/requireAdmin.server.ts`, Firestore Rules corrigidas,
  rota `/admin` com guard de navegação.
- Referência visual/funcional: protótipo HTML `admin_panel_prototype.html`
  (compartilhado por Paulo) — reflete o layout esperado das 3 abas:
  Feature Gates, Ingestion Log, Usuários. **Não copiar o HTML/CSS/JS do
  protótipo diretamente** (é vanilla JS de demonstração, sem
  TypeScript, sem shadcn/ui, sem os tokens reais do projeto) — usar
  apenas como referência de UX/layout e reconstruir com os componentes
  reais do Fuente Price Pro.
- A aba "Custos de Nuvem" do protótipo **não entra neste prompt** — foi
  descopada (não existe fonte de dado real hoje). Ver item 2.4 abaixo
  para a versão mínima que substitui essa aba.

---

## Tarefas

### 2.1 `createServerFn`s

Todas seguem o mesmo padrão de guarda: `requireAdmin(request)` no
início do handler, antes de qualquer leitura/escrita no Firestore.

| Função | Ação | Observações |
|---|---|---|
| `getFeatureGatesFn` | Lê `config/featureGates` via Admin SDK | — |
| `updateFeatureGatesFn` | Merge em `config/featureGates` (toggles + `freeAssetLimit`) | Validar payload contra as chaves conhecidas de `FeatureGatesConfig` — rejeitar campos desconhecidos no payload antes de gravar |
| `getIngestionLogFn` | Lê últimos documentos de `ingestionLog/{source}_{date}` | Padrão: últimas 24-48h, todas as fontes. Não trazer histórico ilimitado |
| `listUsersFn` | Lê `users/{uid}` | **Ver regra de minimização abaixo — é o item mais sensível deste prompt** |

**Regra de minimização de dado para `listUsersFn` (equivalente ao
princípio do `fuente-advogado-lgpd-gdpr`, mesmo não sendo dado
financeiro/Regra 4):**
- Retornar **somente** os campos: `displayName`, `email`,
  `subscriptionStatus` (ou o campo equivalente de plano),
  `createdAt`, `lastLoginAt`, `providerId`.
- **Não** retornar nenhum outro campo do documento do usuário — nada de
  posições, ativos, dados financeiros, preferências internas, etc.,
  mesmo que estejam no mesmo documento Firestore.
- Paginar a consulta (usar `limit` + cursor do Firestore,
  ex: `startAfter`) — não trazer a base inteira de usuários numa
  chamada só, mesmo que hoje sejam poucos usuários.
- Ao terminar, confirmar manualmente (ver Gate de Saída) que o payload
  de resposta da função não contém nenhum campo além dos listados
  acima, inspecionando a resposta real no Network tab — não confiar
  apenas em que a UI não os exibe.

### 2.2 UI — 3 abas dentro de `/admin`

Reconstruir com os componentes reais do projeto (Radix + CVA, não os
elementos HTML nativos do protótipo):

- **Feature Gates**
  - Switches: usar o componente de switch já padronizado no projeto
    (verificar se algo em `src/components/ui/` já cobre isso antes de
    criar novo — Regra 1).
  - Slider do `freeAssetLimit`: `@radix-ui/react-slider` ou equivalente
    já usado em outra tela do projeto.
  - Botão "Salvar" com toast de confirmação (usar o sistema de toast já
    padronizado no projeto, ex: `sonner`).
  - Estado otimista ao togglar um gate, com rollback visual se
    `updateFeatureGatesFn` retornar erro.

- **Ingestion Log**
  - Tabela com badges de status PASSED/FAILED/ERROR/INVALID/WARNING.
  - Antes de criar um componente de badge novo, verificar se já existe
    um componente cobrindo essa taxonomia em algum lugar do projeto
    (ela já é usada em produção segundo o SSOT — Regra 1).

- **Usuários**
  - Tabela **read-only** — sem nenhuma ação (banir, editar, resetar
    senha, forçar downgrade). Isso fica para um prompt futuro, só se
    Paulo decidir que precisa.
  - Campo de busca **client-side** (por nome/email) sobre os dados já
    paginados retornados por `listUsersFn` — não criar endpoint de
    busca server-side nesta rodada.

- Todas as 3 abas devem seguir, sem exceção:
  - i18n completo nos 3 dicionários (Regra 2) — zero string hardcoded.
  - Mobile-first (Regra 5) — tabelas viram cards empilhados abaixo de
    768px, não scroll horizontal forçado.
  - Tokens de `src/styles.css`/design system do projeto (Regra 6) —
    zero cor ou espaçamento hardcoded, zero classe Tailwind crua tipo
    `bg-white/80` ou `p-4` solto.

### 2.3 Aba/rota "Guarda de Acesso" (opcional, avaliar com Paulo)
O protótipo tinha uma aba demonstrativa mostrando as 3 camadas de
defesa em profundidade com um toggle "simular usuário não-admin". Essa
aba é puramente educativa/demonstrativa — não é funcionalidade real do
painel. **Não implementar nesta rodada** a menos que Paulo confirme
que quer essa visualização também na versão real (se confirmar, tratar
como item separado, não bloqueia o resto deste prompt).

### 2.4 Custos de Nuvem — versão mínima (substitui a aba do protótipo)
- Card estático simples, sem `createServerFn`, sem fetch de dado
  nenhum.
- Conteúdo: um texto curto explicando que a visão de custos fica no
  Google Cloud Console, e um link:
  `<a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener">`.
- Zero lógica nova, zero estado. Deve levar minutos, não horas.

---

## Gate de Saída

1. `npx tsc --noEmit` — 0 erros.
2. `npx vitest run` — suite completa passando.
3. `npm run build` — build limpo.
4. **Teste manual das 3 abas, logado como admin:**
   - Feature Gates: alterar um toggle e o slider, salvar, dar reload na
     página, confirmar que o valor persistiu.
   - Ingestion Log: confirmar que os dados exibidos são reais (batem
     com o que está em `ingestionLog/*` no Firestore), não mock.
   - Usuários: abrir o Network tab do navegador, inspecionar o payload
     de resposta de `listUsersFn`, e confirmar visualmente que **só**
     os 6 campos permitidos (seção 2.1) aparecem — reportar essa
     confirmação explicitamente no relatório de execução, com um
     trecho do payload real (mascarando emails se preferir por
     privacidade no relatório).
5. Reportar cobertura de i18n (3 dicionários) e confirmação de que
   nenhuma tabela quebra layout em viewport mobile (375px).

## Proibido Nesta Rodada
- Nenhuma ação destrutiva ou de escrita sobre usuário (banir, deletar,
  resetar senha, editar plano manualmente) — a aba Usuários é 100%
  leitura.
- Nenhuma integração real de billing/GCP — a aba de custos é só o link
  estático do item 2.4.
- Não expandir `listUsersFn` para trazer campos além dos 6 listados,
  mesmo que pareça conveniente para uma feature futura — se precisar de
  mais campos depois, é decisão explícita em prompt novo, não decisão
  silenciosa de agente.
