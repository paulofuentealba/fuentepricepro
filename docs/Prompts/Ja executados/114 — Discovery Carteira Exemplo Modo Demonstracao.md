# PROMPT 114 (Discovery) — Carteira de Exemplo / Modo Demonstração
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Escopo grande, decisões de arquitetura reais — discovery primeiro,
> seguindo o mesmo modelo dos Prompts 75-77 e 102. Aplicar todas as 9
> skills, com destaque para `fuente-solution-architect`,
> `fuente-business-architect`, `fuente-product-manager`,
> `fuente-ux-designer`, `fuente-advogado-lgpd-gdpr`.

---

## Contexto e Objetivo (de Paulo)

Quando alguém faz login pela primeira vez (ou mesmo antes, na landing),
deveria existir um botão "Ver Carteira de Exemplo" que mostra uma
carteira fictícia populada, navegável, com todas as funcionalidades da
plataforma já demonstradas (Screener, Comparador, Radar de Risco,
Radar Global, Cash Flow, Smart Allocation, Snowball, Wiki) — para o
usuário entender o valor do produto antes de montar a própria carteira
do zero.

## Perguntas de Arquitetura a Responder no Discovery

### 1. Onde vive o dado da carteira de exemplo?
Opções a avaliar, com trade-off de cada uma:
- **Conta demo real no Firestore** (um usuário fixo, ex:
  `demo@fuentepricepro.com`, com carteira populada) — todo usuário
  visualizando "carteira de exemplo" na verdade lê o documento desse
  usuário demo. Risco: se a Regra de Firestore permitir escrita, um
  usuário mal-intencionado poderia alterar a demo de todo mundo —
  precisa ser estritamente read-only para não-donos.
- **Dado estático no client** (JSON/mock embutido no bundle, sem
  Firestore) — mais simples, zero risco de escrita, mas não exercita
  o pipeline real de dados (cotação ao vivo, cálculo via
  `getAssetValuation` reais) a menos que o dado estático seja
  "hidratado" com preço/consenso calculado em tempo real a partir de
  tickers reais.
- **Cópia efêmera por sessão** (gerada ao clicar no botão, existe só
  na sessão do navegador, nunca persiste) — mais complexo de
  implementar, mas isolamento total, zero risco de vazamento entre
  usuários ou de dado demo poluir Firestore.

Recomendar uma abordagem com justificativa, considerando: qual delas
exercita de verdade os cálculos reais (Regra 4 — não pode ser number
mockado que não passa por `getAssetValuation`) sem risco de segurança
ou custo desnecessário.

### 2. Onde o botão aparece e o que acontece ao clicar?
- Antes do login (`routes/index.tsx`, landing)? Depois do login, só
  para conta nova sem nenhum ativo ainda (`routes/app/index.tsx`)?
  Os dois lugares?
- Ao clicar: troca o contexto do app inteiro pra "modo demo" (todas as
  telas mostram a carteira de exemplo, com um banner fixo tipo "Você
  está vendo dados de demonstração — [Criar minha carteira]")? Ou abre
  como uma experiência separada/isolada?
- Como o usuário sai do modo demo? Precisa ser óbvio e reversível a
  qualquer momento, sem confundir com a carteira real dele se ele já
  tiver uma.

### 3. Composição da carteira de exemplo
- Quantos ativos, de quais classes (para exercitar TODAS as
  funcionalidades: precisa ter FII para testar Fuente Consensus
  completo, precisa ter ativo US para testar câmbio/Radar Global,
  precisa ter posição com yield trap pra testar Risk Radar, precisa
  ter histórico suficiente pra Snowball Effect fazer sentido
  visualmente).
- Tickers reais (com cotação real, mais autêntico, mas preço muda com
  o tempo e a narrativa "Preço Teto: X, Margem: Y%" pode ficar
  desatualizada/estranha) vs. tickers fictícios com dado sintético
  fixo (mais controlável, mas perde autenticidade e não valida o
  pipeline real de ingestão).

### 4. Isolamento de segurança e LGPD
- Modo demo não deve permitir nenhuma escrita real (adicionar/editar/
  remover ativo, registrar transação) — ou permite escrita só na
  sessão efêmera (opção da pergunta 1) sem persistir?
- Se for conta demo real no Firestore: garantir que nenhum dado
  pessoal de usuário real vaze por engano nessa conta (nunca deveria
  ter, mas documentar a garantia).

## Entregáveis Deste Discovery (documento, não código)

1. Recomendação justificada para a pergunta 1 (onde vive o dado).
2. Recomendação para a pergunta 2 (onde o botão vive, fluxo de
   entrada/saída do modo demo).
3. Proposta de composição da carteira de exemplo (pergunta 3) — lista
   de tickers/classes propostos e o motivo de cada escolha.
4. Plano de isolamento de segurança (pergunta 4).
5. Estimativa de faseamento — quantos prompts de execução esse
   trabalho provavelmente vai precisar (ex: fundação de dado demo +
   UI de banner/troca de modo + composição/seed de carteira).

## Proibido Nesta Rodada
- Não implementar nada — é documento de plano.
- Não criar conta/documento demo real no Firestore ainda, mesmo que a
  recomendação aponte pra essa abordagem — isso é decisão de Paulo
  após ver o discovery.
