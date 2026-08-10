### Prompt 17 — Re-checagem Definitiva com Evidências Brutas (FRE + INF_MENSAL + varrimento histórico) ✅

**Script:** `scripts/recheckagem-proventos.ts` — lê tudo ao vivo do servidor, sem cache de execuções anteriores. Deletado após execução.

#### PARTE A — FRE: `fre_cia_aberta_distribuicao_dividendos`

**O arquivo `fre_cia_aberta_distribuicao_dividendos_{ano}.csv` NÃO EXISTE na CVM Dados Abertos.**

Evidência direta:
- Catálogo `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FRE/DADOS/` retornou **16 ZIPs** (2010–2025).
- Baixados e abertos `fre_cia_aberta_2025.zip` (8.297 KB) e `fre_cia_aberta_2024.zip` (8.213 KB).
- **`fre_cia_aberta_2025.zip` — listagem bruta completa (36 arquivos):**
  ```
  [1]  fre_cia_aberta_2025.csv
  [2]  fre_cia_aberta_acao_entregue_2025.csv
  [3]  fre_cia_aberta_administrador_declaracao_genero_2025.csv
  [4]  fre_cia_aberta_administrador_declaracao_raca_2025.csv
  [5]  fre_cia_aberta_administrador_membro_conselho_fiscal_2025.csv
  [6]  fre_cia_aberta_administrador_PCD_2025.csv
  [7]  fre_cia_aberta_auditor_2025.csv
  [8]  fre_cia_aberta_capital_social_2025.csv
  [9]  fre_cia_aberta_capital_social_classe_acao_2025.csv
  [10] fre_cia_aberta_capital_social_titulo_conversivel_2025.csv
  [11] fre_cia_aberta_distribuicao_capital_2025.csv          ← NOTE: "capital", NÃO "dividendos"
  [12] fre_cia_aberta_distribuicao_capital_classe_acao_2025.csv
  [13] fre_cia_aberta_empregado_local_declaracao_genero_2025.csv
  [14] fre_cia_aberta_empregado_local_declaracao_raca_2025.csv
  [15] fre_cia_aberta_empregado_local_faixa_etaria_2025.csv
  [16] fre_cia_aberta_empregado_PCD_2025.csv
  [17] fre_cia_aberta_empregado_posicao_declaracao_genero_2025.csv
  [18] fre_cia_aberta_empregado_posicao_declaracao_raca_2025.csv
  [19] fre_cia_aberta_empregado_posicao_faixa_etaria_2025.csv
  [20] fre_cia_aberta_empregado_posicao_local_2025.csv
  [21] fre_cia_aberta_membro_comite_2025.csv
  [22] fre_cia_aberta_mercado_estrangeiro_2025.csv
  [23] fre_cia_aberta_outro_valor_mobiliario_2025.csv
  [24] fre_cia_aberta_participacao_sociedade_2025.csv
  [25] fre_cia_aberta_posicao_acionaria_2025.csv
  [26] fre_cia_aberta_posicao_acionaria_classe_acao_2025.csv
  [27] fre_cia_aberta_relacao_familiar_2025.csv
  [28] fre_cia_aberta_relacao_subordinacao_2025.csv
  [29] fre_cia_aberta_remuneracao_acao_2025.csv
  [30] fre_cia_aberta_remuneracao_maxima_minima_media_2025.csv
  [31] fre_cia_aberta_remuneracao_total_orgao_2025.csv
  [32] fre_cia_aberta_remuneracao_variavel_2025.csv
  [33] fre_cia_aberta_responsavel_2025.csv
  [34] fre_cia_aberta_titular_valor_mobiliario_2025.csv
  [35] fre_cia_aberta_titulo_exterior_2025.csv
  [36] fre_cia_aberta_transacao_parte_relacionada_2025.csv
  ```
- **Grep por `dividendo/provento/distribuicao` nos nomes** retornou 2 arquivos: `[11]` e `[12]` acima — ambos `distribuicao_capital`, que é **sharehoilding/free float**, não dividendos.
- **`fre_cia_aberta_2024.zip` — mesmos 36 nomes**, nenhum com "dividendo".

**Conteúdo do `fre_cia_aberta_distribuicao_capital_2025.csv` (arquivo mais próximo do esperado — inspecionado):**
- Header bruto: `CNPJ_Companhia;Data_Referencia;Versao;ID_Documento;Nome_Companhia;Quantidade_Acionistas_PF;Quantidade_Acionistas_PJ;Quantidade_Acionistas_Investidores_Institucionais;Quantidade_Acoes_Ordinarias_Circulacao;Percentual_Acoes_Ordinarias_Circulacao;Quantidade_Acoes_Preferenciais_Circulacao;Percentual_Acoes_Preferenciais_Circulacao;Quantidade_Total_Acoes_Circulacao;Percentual_Total_Acoes_Circulacao;Data_Ultima_Assembleia`
- **15 colunas — zero colunas de pagamento/evento de dividendo.**
- Linha bruta BBSE3: `17.344.597/0001-94;2025-12-31;13;156950;BB SEGURIDADE PARTICIPAÇÕES S.A.;605394;2956;1270;616248544;31.742000;0;0.000000;616248544;31.742000;2026-03-27`

**Conclusão PARTE A:** `fre_cia_aberta_distribuicao_dividendos_{ano}.csv` **não existe** em nenhum ano verificado (2024 e 2025). O nome mencionado no `api_enrichment_action_plan.md` (Item 3.5 do Anexo 24 da ICVM 480) ou não está publicado nos dados abertos ou o nome real é diferente. Os únicos arquivos com "distribuicao" no nome são de composição acionária (free float), sem `paymentDate`.

---

#### PARTE B — INF_MENSAL FII: listagem fresca + grep completo

**`inf_mensal_fii_2026.zip` — listagem bruta (nova leitura ao vivo, 850 KB):**
```
[1] FILE | inf_mensal_fii_ativo_passivo_2026.csv | 1616.76 KB
[2] FILE | inf_mensal_fii_complemento_2026.csv   | 1187.03 KB
[3] FILE | inf_mensal_fii_geral_2026.csv          | 2957.70 KB
```
**Confirmado: 3 arquivos exatos, sem nenhum arquivo "rendimento" ou "distribuicao".**

**`inf_mensal_fii_ativo_passivo_2026.csv` — 52 colunas, header bruto:**
`CNPJ_Fundo_Classe;Data_Referencia;Versao;Total_Necessidades_Liquidez;...;Rendimentos_Distribuir;...;Total_Passivo`
- Grep encontrou: `Rendimentos_Distribuir` (Col #42) — saldo contábil do passivo, **não um evento de pagamento**.
- Valores: HGLG11=50.161.884,30 · MXRF11=46.028.560,70 · AFHI11=0

**`inf_mensal_fii_complemento_2026.csv` — 30 colunas, header bruto:**
`CNPJ_Fundo_Classe;Data_Referencia;Versao;...;Percentual_Rentabilidade_Efetiva_Mes;Percentual_Rentabilidade_Patrimonial_Mes;Percentual_Dividend_Yield_Mes;Percentual_Amortizacao_Cotas_Mes`
- Grep encontrou: `Percentual_Dividend_Yield_Mes` (Col #29) e `Percentual_Amortizacao_Cotas_Mes` (Col #30).
- Valores (% do mês): HGLG11=0.006635 · MXRF11=0.009328 · AFHI11=0
- **Sem `Data_Pagamento`, `Data_Com`, `Rendimento_Por_Cota` ou qualquer coluna de evento individual.**

**`inf_mensal_fii_geral_2026.csv` — 37 colunas:**
- Grep: 0 colunas de proventos/pagamento encontradas.

**Conclusão PARTE B:** Os 3 arquivos do `INF_MENSAL` reportam apenas métricas agregadas mensais (% yield, saldo de passivo). **Não há evento-por-evento com `Data_Pagamento` ou `Rendimento_Por_Cota` em nenhum deles** — confirmado por leitura direta ao vivo do servidor.

---

**Conclusão Final:** A CVM Dados Abertos **não publica dataset tabular estruturado com eventos de proventos (dividendos, JCP, rendimentos de FII) discriminados por data de pagamento** em nenhum dos datasets verificados. O `fre_cia_aberta_distribuicao_dividendos` mencionado no plan não existe no servidor; o `inf_mensal_fii_rendimento` (mencionado em conteúdo de LLM) nunca existiu. Avisos de pagamento de proventos continuam exclusivamente em PDF/HTML no sistema IPE.

---