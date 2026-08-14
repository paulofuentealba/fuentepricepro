# 77 — Discovery: Controle de Acesso para `/admin` (P2)

## 🛑 Modo de operação: discovery, não implementação

## Contexto

Painel `/admin` (feature gates, dashboard de ingestão — item 13 já
verificado e pronto pra ter um consumidor visual) precisa de controle de
acesso real antes de existir qualquer UI. Hoje não existe nenhum
conceito de usuário admin no código — nem Custom Claims, nem checagem de
UID.

## Escopo do discovery

1. **Avaliar 2 abordagens, com prós/contras**:
   - Custom Claims do Firebase Auth (`isAdmin: true` no token,
     verificável client e server-side).
   - Checagem de UID fixo (lista de UIDs admin em variável de
     ambiente/servidor).
2. **Confirmar que a proteção real fica no servidor** — nunca só
   esconder o link/rota no client.
3. **Mapear quais `createServerFn` novas o painel vai precisar** (ler/
   escrever `config/featureGates`, ler `ingestionLog` — já existe e já
   foi verificado no item 13) e confirmar que cada uma valida a
   permissão de admin no próprio handler do servidor.
4. Propor onde a whitelist/claim de admin fica configurada (Firebase
   Console manualmente, aceitável pra 1 usuário nesta fase).

## Regras obrigatórias

- Não implementar nada nesta rodada — só o documento de decisão.
- Não propor solução que dependa só de esconder algo no client.

## Entregável esperado

Documento markdown com a recomendação (Custom Claims vs. UID fixo),
justificativa, e o desenho de como cada `createServerFn` do painel vai
validar a permissão — pra revisão de Paulo antes de qualquer prompt de
execução de UI.
