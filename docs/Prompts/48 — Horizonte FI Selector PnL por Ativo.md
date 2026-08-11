# 48 — Horizonte FI: Selector de P&L por ativo

## Contexto

`useValuedPortfolio()` (`src/lib/useValuedPortfolio.ts`) já retorna preço
atual, preço médio, quantidade e yield por ativo em `valuedItems`, mas **não**
calcula ganho/perda (P&L) absoluto nem percentual por posição — cada tela que
precisou disso até hoje calculou na mão. A tabela de carteira da v2 (prompt 52)
precisa dessa coluna.

## Objetivo

Criar um selector puro, sem tocar `useValuedPortfolio.ts` nem seu contrato
existente (zero risco à v1).

## O que fazer

1. Ler `src/lib/useValuedPortfolio.ts` e o tipo `ValuedWatchlistItem`
   (linhas 14-21) para confirmar os campos exatos disponíveis (preço atual,
   `averagePrice`, `quantity`).
2. Criar `src/lib/selectors/assetPnL.ts`:
   ```ts
   export function getAssetPnL(item: ValuedWatchlistItem): {
     pnlAbsolute: number; // (currentPrice - averagePrice) * quantity
     pnlPercent: number;  // (currentPrice - averagePrice) / averagePrice
   }
   ```
   Tratar `averagePrice === 0` explicitamente (posição sintética/legado sem
   preço médio) retornando `pnlPercent: 0` em vez de `Infinity`/`NaN` — mesmo
   padrão de guard já usado no restante do `calculations.ts`.
3. Teste unitário em `src/lib/selectors/__tests__/assetPnL.test.ts`: ganho,
   perda, posição zerada, `averagePrice` zero.

## Critérios de aceite

- Função pura, sem side-effect, sem chamada de rede.
- `npm run test` passa.
- Nenhum arquivo de v1 modificado além da criação dos dois arquivos novos.

## Fora de escopo

- Não adicionar coluna de P&L nas tabelas da v1 hoje — isso seria mudança de
  produto na versão em produção, fora do escopo desta série de prompts.
  
## Ao terminar

- Gerar documento (resultado ou plano de impelementação), salvar na pasta e realizar o commit desta atividade usando nome da atividade como comentário.
- Gerar o commit desta execução e adicionar ao documento final salvo no diretório
