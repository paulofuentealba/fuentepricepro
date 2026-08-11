### 30 — Itens regulatórios, administrativos e IA (fora do escopo central) ⚪ AGUARDANDO DECISÃO DE INÍCIO

Consolida o restante do `BACKLOG_V2.md` que ainda não virou prompt e não
é puramente "funcionalidade de investimento" — são itens regulatórios,
administrativos, ou de inteligência, cada um com peso e risco diferentes.
Mesma lógica da Tarefa 29: precisa de decisão de escopo antes de virar
prompt individual.

**30.1 — Assistente de IA (insights pessoais)** ⚪ (BACKLOG_V2 2.1)
Não existe nenhum código relacionado hoje. Agente lendo a carteira e
sugerindo ações (ex: alerta de desbalanceamento setorial). Decisão
pendente antes de escopar: qual modelo/API de IA usar, e onde entra no
fluxo do produto (proativo vs. sob demanda).

**30.2 — Onboarding regulatório e perfilamento (KYC/Suitability)** ⚪ (BACKLOG_V2 4.2)
Não existe. Nenhum fluxo de perfilamento de risco do investidor no
código hoje. Item regulatório — vale confirmar com você se há exigência
legal real disparando isso (CVM ou similar) antes de dimensionar o
escopo, já que pode mudar bastante o tamanho da tarefa.

**30.3 — Conformidade legal completa (LGPD & GDPR)** 🟡 (BACKLOG_V2 4.3)
Parcial: já existe o item de menu "Privacidade (LGPD)" em Configurações,
mas sem conteúdo funcional atrás. Faltam: banner de cookies, fluxo de
"Direito ao Esquecimento" (excluir conta + limpar Firestore de verdade),
exportação/portabilidade de dados. Tem risco legal real se ficar só no
visual — vale priorizar se o produto já tem usuários reais na base.

**30.4 — Painel administrativo (`/admin`)** ⚪ (BACKLOG_V2 3.2)
Não existe, nenhuma rota `/admin` no projeto. Mesmo tratamento do item de
monetização (3.1, já registrado acima): pode ser construído, mas fica
sem decisão de ativação em produção por enquanto.

Próximo passo real: o mesmo do 29 — decidir se algum desses entra na
fila agora (o 30.3, LGPD, é o único com risco legal ativo, vale pensar
nele primeiro se já há usuários reais usando o app) ou se todos ficam
parados até você ter mais clareza de prioridade de negócio.

---

## Próximo item a rodar

Fila de produção zerada (14.7, 22, 14.8, 23, 25, 25.1, 26, 27, 28 todos 
✅). Restam só itens de baixa prioridade (não tocam produção) e decisões 
de negócio em aberto — ver seção "Pendências registradas" acima.

---