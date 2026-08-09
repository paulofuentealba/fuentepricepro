# Item 10: Registro de Exportação, Importação e Benchmarks no Backlog

> [!NOTE]
> Documentação formal de inclusão dos recursos futuros de exportação/importação (CSV/Excel) e comparação com benchmarks no backlog do projeto ([`BACKLOG_V2.md`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/BACKLOG_V2.md)). **Nenhum código de aplicação foi alterado**, em conformidade com as orientações do prompt.

---

## 1. Resumo das Entradas Adicionadas ao `BACKLOG_V2.md`

### A. Exportação de Dados (CSV/Excel) — Prioridade P2/P3 ⚪
- **Locais Indicados para Implementação**:
  1. **Comparador (`/app/comparator`)**: Exportação da tabela comparativa contendo métricas e indicadores fundamentalistas (`P/E`, `P/VP`, `Dividend Yield`, `CAGR`, `Preço Teto`, `Margem de Segurança`).
  2. **Watchlist / Carteira (`/app/myportfolio` / `/app/watchlist`)**: Exportação do snapshot da carteira com quantidade, preço médio, valor atual e proventos projetados.

### B. Importação de Dados por Planilha (CSV/Excel) — Prioridade P2/P3 ⚪
- **Template de Importação Simples**: Disponibilizar um modelo contendo as colunas:
  - `Ticker` (ex: `VALE3`, `AAPL`)
  - `Data da Compra` (ex: `AAAA-MM-DD` ou `DD/MM/AAAA`)
  - `Quantidade` (ex: `100`)
  - `Valor Unitário` (ex: `62.50`)
- **Regras de Negócio na Ingestão**:
  - **Ativo Existente**: Adiciona as transações ao histórico e recalcula dinamicamente a posição, preço médio, dividendos acumulados e rentabilidade (IRR/TWR).
  - **Novo Ativo**: Cria o ativo na carteira do usuário, registra a transação e propaga os dados para todas as telas (Screener, Cash Flow, Smart Allocation).

### C. Comparação com Benchmarks de Mercado no Comparador — Prioridade P2/P3 ⚪
- **Sobreposição de Índices no Comparador (`/app/comparator`)**:
  - **CDI / Selic**: Para ativos de Renda Fixa e FIIs/FIAGRO.
  - **IBOVESPA (IBOV)**: Para Ações brasileiras (`STOCK_BR`).
  - **S&P 500 (SPX)**: Para Ações e REITs internacionais (`STOCK_US`, `REIT_US`).

---

## 2. Registro de Git

- **Commit de Documentação**:
  ```bash
  git commit -m "docs(backlog): registra exportacao CSV/Excel e comparacao com benchmark como itens futuros [Item 10]"
  ```
