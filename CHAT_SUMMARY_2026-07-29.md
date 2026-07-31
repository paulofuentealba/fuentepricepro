# Fuente Price Pro — Resumo da Sessão (encerrada em 29/07/2026)

## Contexto pra retomar no chat novo

Esse projeto agora tem DOIS arquivos de fonte única de verdade no repositório, que já persistem independente do chat:

- **`BACKLOG_V2.md`** — todo o backlog (o que existe, o que falta, o que é decisão de negócio pendente)
- **`PROMPTS_LOG.md`** — histórico completo de prompts rodados + fila do que falta rodar, com texto pronto pra copiar

No chat novo, o primeiro passo é me pedir pra ler os dois arquivos — não precisa reexplicar o histórico, está tudo lá.

**Acesso técnico configurado** (deve persistir automaticamente no Claude Desktop, mas confirme no chat novo): conexão direta ao filesystem do seu computador (leitura/escrita no repositório) e ao Chrome (consigo navegar, clicar, testar ao vivo em `localhost:5173`).

---

## O que foi feito nessa sessão (visão geral)

### 1. Causa raiz do bug de fidelidade do Fuente Consensus

O ponto de partida foi o Consensus mostrando valores diferentes pro mesmo ativo em telas diferentes. Rastreamos até **6 lugares escondidos** no código calculando a mesma coisa de formas divergentes (dividendo-base, BVPS misturando fonte de preço, yield-alvo hardcoded, diálogo de edição contaminando o banco). Todos corrigidos, unificados numa única fonte de verdade (`useValuedPortfolio` + `getAssetValuation`).

### 2. Refatoração estrutural

Componentes passaram a consumir o `valuation` já calculado em vez de recalcular localmente — isso já pegou e corrigiu, de bônus, bugs que apareceram bem depois (a grade de ativos vazia da Tarefa 14.3 era exatamente esse padrão se repetindo).

### 3. Varredura de navegação + P2 (polimento)

Bugs de UX (busca, classificação de ativos, i18n incompleto, acessibilidade, responsividade mobile, hierarquia visual do dashboard) — tudo isso ficou concluído em sprints.

### 4. Acesso direto ao repositório (mudança de capacidade no meio da sessão)

Você instalou o Claude Desktop e configurou acesso direto ao filesystem e ao navegador. A partir daí, parei de depender só de ZIP e relatório do Antigravity — passei a **verificar direto no código e testar ao vivo no seu navegador**. Isso pegou vários problemas que só apareceriam depois:

- CNPJs errados nas corretoras (BTG e Itaú estavam com o CNPJ de outra entidade do mesmo grupo)
- O travamento real ao clicar "Restore Mock Data" (causa raiz: `pdfjs-dist` sendo avaliado durante SSR)
- Firebase inicializando sem proteção, exigindo reiniciar o servidor a cada erro de parse
- Import duplicado quebrando o build

### 5. Incidente e recuperação

Um `git checkout` destrutivo apagou trabalho de i18n não commitado. Recuperamos reconstruindo o conteúdo real (não placeholder), e isso gerou uma regra permanente: comandos git destrutivos precisam de confirmação explícita antes de rodar.

### 6. Unificação de documentação

`BACKLOG_V2.md` consolidou o backlog original de Produto + tudo que a auditoria técnica achou. `PROMPTS_LOG.md` virou a lista única de prompts (por pedido seu, pra parar de espalhar arquivo novo a cada rodada).

### 7. Import de nota de corretagem (mais recente)

Suporte estendido de 2 pra 9 corretoras (XP, Clear, Rico, Modal, BTG, Inter, NuInvest, Órama, Genial), com CNPJs verificados em fonte oficial (2 estavam errados na primeira tentativa do Antigravity, achei e corrigi antes de implementar). 3 bancos tradicionais (Itaú, Bradesco, Santander) identificados com fallback gracioso, sem forçar parsing que provavelmente quebraria.

---

## O que está pendente (fila completa está no `PROMPTS_LOG.md`)

**Próximo item**: Tarefa 17.3 (catalogar corretoras suportadas — documentação, baixo risco)

**Fila depois disso**: 14.5 (nova massa de dados DEV), 14.6 (tratamento de erro do botão), 14.7 (CSRF), 14.8 (método depreciado), 18 (AGENTS.md com Golden Rules completas), 19 (limpar scripts órfãos), 20 (documentar fragilidade do classify.ts), 22 (Nitro beta→estável), 23 (refatorar Watchlist.tsx — maior, por último)

**Decisões de negócio paradas, sem prazo**:

- Monetização real (Free vs. Pro) — estrutura em DEV apenas, você decide quando ativar
- P3 (funcionalidades novas: proventos, rentabilidade real, alertas, IR, etc.) — plano de 5 sprints já pronto, aguardando você decidir começar
- Itens do `BACKLOG_V2.md` ainda sem prompt: assistente de IA, onboarding KYC, LGPD completo, painel admin

**Ação de ambiente, não de código**: mover o projeto pra fora da pasta sincronizada pelo OneDrive (causa da lentidão do `npm run dev`)

---

## Regras e convenções estabelecidas nessa sessão

- **Golden Rules 1-6** do projeto (reusabilidade, i18n, isolamento de dados DEV/prod, SSOT, mobile-first, qualidade visual) — versão revisada, ainda não sincronizada no `AGENTS.md` (é a Tarefa 18)
- Comandos git destrutivos exigem confirmação explícita antes de rodar
- Todo relatório de prompt deveria confirmar o console do `npm run dev` limpo, não só o `tsc`
- `PROMPTS_LOG.md` é a única lista — sempre adicionar, nunca recriar
