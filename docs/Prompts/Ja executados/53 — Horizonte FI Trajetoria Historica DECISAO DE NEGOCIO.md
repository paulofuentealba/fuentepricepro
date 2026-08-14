# 53 — Horizonte FI: Trajetória histórica ⚠️ DECISÃO DE NEGÓCIO — não executar sem aprovação explícita de Paulo

## Contexto

Achado da varredura de backend (prompt-base desta série): **não existe hoje
nenhuma coleção Firestore que capture o progresso de FI ao longo do tempo** —
só o estado atual (`useFIProgress()`, prompt 47). Isso significa que qualquer
gráfico de "trajetória" (ex.: "sua linha do horizonte nos últimos 6 meses")
exigiria nova persistência, não é um gap de apresentação.

## Por que este prompt está separado dos demais

Os prompts 46-52 e 54 são execução direta — reaproveitam dado que já existe.
Este prompt cria **dado novo e permanente** (uma coleção/campo Firestore), o
que é, pela regra do papel `fuente-product-manager` (SSOT Seção 8/AGENTS.md),
uma decisão de negócio: tem custo de storage recorrente, tem que decidir
granularidade (snapshot diário? mensal? por evento de aporte?), e não pode
ser decidido por Antigravity sozinho.

## Perguntas que Paulo precisa responder antes de qualquer código aqui

1. **Granularidade**: snapshot mensal (barato, suficiente pra mostrar
   tendência) ou por evento de aporte/dividendo (mais preciso, mais
   escrita)?
2. **Retenção**: guardar histórico completo pra sempre, ou só os últimos N
   meses?
3. **Isso é feature Free ou Pro?** — "veja sua trajetória completa" é um
   gancho de retenção real (ver avaliação do investidor iniciante: "pequenas
   confirmações de progresso... geram retenção mais que qualquer feature
   avançada") — pode valer a pena como diferencial pago.
4. **Backfill**: usuários que já têm meses de histórico de transações — vale
   reconstruir snapshots retroativos a partir do `Transaction[]` já existente
   (Ledger, Épico 1), ou começar do zero a partir de hoje?

## Proposta técnica (só implementar após resposta às 4 perguntas acima)

- Nova coleção `users/{uid}/fiSnapshots/{yyyymm}` com campos mínimos:
  `totalCapitalBRL`, `monthlyIncomeBRL`, `coveragePercent`, `capturedAt`.
- Gravação via Cloud Function agendada (mensal) ou client-side no primeiro
  login do mês — decisão técnica que depende da resposta à pergunta 1.
- Consumo: `HorizonteHero` (prompt 50) ganharia uma sparkline opcional
  mostrando a evolução, sem alterar o cálculo do valor atual.

## Status

🔒 **Parqueado.** Não iniciar execução até Paulo responder as 4 perguntas
acima (ver SSOT Seção 6, item 12).

## Ao terminar

- Gerar documento (resultado ou plano de impelementação), salvar na pasta e realizar o commit desta atividade usando nome da atividade como comentário.
- Gerar o commit desta execução e adicionar ao documento final salvo no diretório