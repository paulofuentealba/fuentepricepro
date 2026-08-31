Prompt 130 — Navegacao por verbos + extensao do SmartAllocation [Item 0.2]

CONTEXTO
Referência visual: docs/design/v6/prototipo-v6.html (sidebar do app).
Base factual: docs/design/v6/AUDITORIA-REUSO.md, seções 3 e 8 — CONFIRMADA
por verificação direta nos arquivos reais (não apenas o relatório do
Antigravity; reconferi eu mesmo AssetType, PROFILE_BASE_ALLOCATION,
STRATEGY_BIAS_MULTIPLIERS, RegulatoryDisclaimerBanner e computeSmartAllocation
contra o código do branch dev).

DUAS DECISÕES DE PRODUTO JÁ TOMADAS, baseadas na auditoria:

1. "Plano de aporte" NÃO é tela nova do zero. A auditoria confirmou ~90% de
   sobreposição algorítmica com SmartAllocation.tsx (estratégias, metas,
   computeSmartAllocation, teto de concentração). A decisão é ESTENDER
   SmartAllocation.tsx, não recriar. Este prompt SÓ cuida da navegação —
   a extensão em si (tese narrativa, modo de reinvestimento, exportação CSV)
   é prompt separado, futuro, depois do AskEngine (Prompt 133+).

2. Screener, Comparador, Radar de Risco, Radar Global e Bola de Neve NÃO são
   removidos. Viram ABAS dentro de "Explorar ativos".

TAREFA
Reorganizar Sidebar.tsx e MobileBottomNav.tsx conforme o protótipo:

DECIDIR
- Reinvestir (rota nova, desabilitada "em breve" — chega no Prompt 135)
- Plano de aporte -> aponta para a rota EXISTENTE /app/smartallocation
  (não criar rota nova; o rótulo do menu muda, o destino é o mesmo até a
  extensão futura substituir o conteúdo)
- Retirar (rota nova, desabilitada "em breve")

ACOMPANHAR
- O que mudou (rota nova, desabilitada "em breve")
- Renda garantida (rota nova, desabilitada "em breve")
- Realidade fiscal (rota nova, desabilitada "em breve" — depende do módulo
  fiscal que ainda nem existe; a auditoria confirmou que NÃO há lógica de
  isenção de R$ 20 mil / ganho de capital hoje, então esta tela tem
  dependência maior que as outras)

ANALISAR
- Minha carteira -> /app/myportfolio (existente)
- Explorar ativos -> rota nova agregadora, abas VAZIAS nesta etapa
  (o conteúdo de screener/comparator/riskradar/globalradar/snowball
  continua nas rotas atuais; a agregação visual é prompt futuro)
- Auditoria (rota nova, desabilitada "em breve")

RODAPÉ DA SIDEBAR
- Chip do usuário (avatar + nome + plano) -> /settings
- Link Admin (só quando isAdmin — já existe via /admin, reusar o guard atual)
- Alternância de tema (se já existir, reusar; se não, reportar antes de criar)
- Seletor de idioma: a auditoria não confirmou se LanguageSwitcher.tsx
  (components/ceiling/LanguageSwitcher.tsx) serve para a sidebar nesta nova
  posição. VERIFICAR antes de codar (ver Investigar Antes) e reusar se servir.

INVESTIGAR ANTES (Regra 7) — fazer isto antes de tocar em código
1. Confirmar se LanguageSwitcher.tsx pode ser reusado na nova posição
   (rodapé da sidebar) sem alteração, ou se precisa de variante.
2. Confirmar mecanismo de alternância de tema hoje: existe componente
   dedicado, ou é outro padrão? Reportar antes de criar algo novo.
3. Confirmar o guard de admin usado em /admin hoje (isAdmin custom claim,
   conforme já documentado em memória do projeto) para reusar exatamente
   o mesmo padrão no link do rodapé.
Apresentar o levantamento e o plano ANTES de codar (Regra 8).

REQUISITOS
1. NENHUMA rota existente pode ser removida ou quebrada. As rotas de
   screener, comparator, riskradar, globalradar, smartallocation e
   snowballeffectsimulator continuam existindo e funcionando.
2. Itens de telas ainda não construídas entram DESABILITADOS com rótulo
   "em breve" — não criar rota morta, não criar página vazia além de
   "Explorar ativos" (que é explicitamente pedida com abas vazias).
3. O item "Plano de aporte" É clicável e funcional desde já — aponta para
   /app/smartallocation existente. Não é "em breve".
4. Badges do menu (valor disponível em Reinvestir, contagem em O que mudou):
   aceitam valor via prop nesta etapa, sem cálculo próprio. Se o dado ainda
   não existe (é o caso agora, ver Auditoria seção 4 sobre ausência de
   fundingSource/cash balance), NÃO renderizar o badge — não inventar valor.
5. Zero hardcode (Regra 2) — rótulos e títulos de seção via i18n nos
   3 idiomas (pt-BR, en, es). Reusar as chaves já existentes
   (t.tabs.smartAllocation etc.) onde o destino é o mesmo; criar chaves
   novas só para os rótulos que mudam (ex.: "Plano de aporte" como novo
   texto de exibição para a mesma rota).
6. Mobile-first (Regra 5): MobileBottomNav tem hoje 6 abas roláveis
   (conforme auditoria seção 8.1). Definir os 5-6 slots da nova estrutura
   e JUSTIFICAR a escolha no relatório de plano.
7. Acessibilidade: navegável por teclado, seções com marcação semântica.

PROIBIDO
- Remover, renomear ou quebrar rota existente
- Criar conteúdo dentro de "Explorar ativos" (só a rota e as abas vazias
  nesta etapa)
- Criar a extensão de SmartAllocation com tese narrativa/CSV/modo de
  reinvestimento — isso é prompt futuro, fora de escopo aqui
- Inventar valor de badge sem fonte de dado real
- Texto hardcoded
- git add -A

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-ux-designer | SIM | arquitetura de informação |
| fuente-product-manager | SIM | decisão de reaproveitar SmartAllocation como Plano de Aporte |
| fuente-investidor-iniciante | SIM | verbos reduzem carga cognitiva |
| fuente-product-marketing | SIM | navegação comunica o reposicionamento |
| fuente-architecture-review | SIM | gate do diff, garante zero rota quebrada |
| fuente-solution-architect | SIM | rota agregadora sem duplicar SmartAllocation |
| fuente-business-architect | NÃO | capacidades inalteradas nesta etapa |
| fuente-investidor-profissional | NÃO | densidade de dado não muda aqui |
| fuente-advogado-lgpd-gdpr | NÃO | não toca dado pessoal |

COMMIT
refactor(nav): reorganiza navegacao por verbos e reaproveita SmartAllocation como Plano de Aporte [Item 0.2]

---

Antes de codar, mande o plano com as respostas do "Investigar Antes"
(LanguageSwitcher, alternância de tema, guard de admin) e a lista final dos
5-6 slots do MobileBottomNav com a justificativa. Só depois disso escreva
código. Envie o diff completo antes do commit.
