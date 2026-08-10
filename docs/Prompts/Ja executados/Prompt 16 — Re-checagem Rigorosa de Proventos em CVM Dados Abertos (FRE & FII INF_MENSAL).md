### Prompt 16 — Re-checagem Rigorosa de Proventos em CVM Dados Abertos (FRE & FII INF_MENSAL) ✅

- **Objetivo**: Inspecionar de forma completa e empiricamente comprovada a presença de datas de pagamento (`paymentDate`) no dataset FRE (Formulário de Referência) de Cias Abertas e no Informe Mensal de FIIs (`INF_MENSAL`).
- **Parte A — Cias Abertas via FRE (`fre_cia_aberta_2025.zip`)**:
  - **36 arquivos CSV inspecionados**. Grep por `dividen/provento/distribu` encontrou apenas 2 arquivos: `fre_cia_aberta_distribuicao_capital_2025.csv` (15 colunas) e `fre_cia_aberta_distribuicao_capital_classe_acao_2025.csv` (9 colunas).
  - **Granularidade & Conteúdo**: Trata-se exclusivamente de um **resumo anual de distribuição de capital social / composição do shareholding** (quantidade de acionistas PF, PJ, Institucionais e % de ações em circulação).
  - **Datas & Eventos**: **NÃO EXISTEM eventos por dividendo/JCP** nem coluna de data de pagamento (`paymentDate`). A única data além do período é `Data_Ultima_Assembleia`.
- **Parte B — FIIs via Informe Mensal (`INF_MENSAL`)**:
  - **`inf_mensal_fii_complemento_{ano}.csv` (30 colunas)**: Inspecionadas todas as 30 colunas. Não possui eventos por data de pagamento nem valor em R$/cota por evento; possui apenas as colunas de porcentagem agregada **`Percentual_Dividend_Yield_Mes`** (Col #29) e **`Percentual_Amortizacao_Cotas_Mes`** (Col #30).
  - **`inf_mensal_fii_ativo_passivo_{ano}.csv` (52 colunas)**: Inspecionadas todas as 52 colunas. Contém apenas a coluna de saldo acumulado no balanço **`Rendimentos_Distribuir`** (Col #42 - ex: HGLG11 = R$ 46,64M, MXRF11 = R$ 41,15M).
  - **`inf_mensal_fii_geral_{ano}.csv` (37 colunas)**: Inspecionadas todas as 37 colunas. Nenhuma coluna de proventos ou datas de pagamento.
- **Conclusão Final de Proventos**: A CVM Dados Abertos **não possui tabela estruturada com eventos de dividendos por `paymentDate`**. Avisos aos acionistas continuam sendo arquivados como PDFs/HTMLs no sistema IPE (`CIA_ABERTA/DOC/IPE/`).

---