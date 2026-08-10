### Prompt 32 — Fix: Detecção Automática de Eventos Corporativos (Query String Yahoo Finance) 🛠️

- **Objetivo**: Corrigir o endpoint de busca de eventos corporativos em `src/lib/apiService.functions.ts` (`checkPendingSplitsFn`) adicionando os parâmetros históricos de query string necessários (`&interval=1d&range=5y`).
- **Implementações Realizadas**:
  1. **Ajuste na Query String (`src/lib/apiService.functions.ts`)**:
     - Atualizada a URL de consulta ao Yahoo Finance para:
       `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yhTicker)}?events=split&interval=1d&range=5y`
  2. **Verificação dos 6 Tickers de Referência (Latência & Eventos)**:
     - `NVDA`: 188ms | `yh_1718026200` (Split 10:1 em 10/06/2024)
     - `CMG`: 60ms | `yh_1719408600` (Split 50:1 em 26/06/2024)
     - `AVGO`: 121ms | `yh_1721050200` (Split 10:1 em 15/07/2024)
     - `BBAS3`: 92ms | `yh_1713272400` (Split 2:1 em 16/04/2024)
     - `MGLU3`: 71ms | `yh_1716814800` (Agrupamento 1:10 em 27/05/2024)
     - `ITUB4`: 88ms | `yh_1742302800` (Bonificação 1,1:1 em 18/03/2025)
  3. **Verificação End-to-End**:
     - Confirmado que a presença do evento em `pendingEvents` dispara automaticamente a badge pulsante em `AssetCardHeader` e pré-popula a modal `CorporateEventModal` para aplicação imediata.
  4. **Atualização do Backlog (`docs/BACKLOG_V2.md`)**:
     - Seção `1.3 Eventos Corporativos Automatizados` reestabelecida para ✅ (Concluído e Validado End-to-End).
---