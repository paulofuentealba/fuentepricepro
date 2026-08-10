### Prompt 20 — Hardening do Fallback de Classificação (`classify.ts`) ✅

- **Objetivo**: Substituir a lista parcial de exceções hardcoded em `src/lib/classify.ts` por uma estrutura declarativa (`Set<string>`) documentada com base nos registros de Units (ações ON+PN terminadas em 11) da B3.
- **Implementação Técnica (`src/lib/classify.ts`)**:
  - Criado o conjunto `B3_STOCK_UNIT_PREFIXES` contendo 22 prefixos conhecidos de Ações Units da B3 (`TAEE`, `KLBN`, `SANB`, `BPAC`, `ENGI`, `ALUP`, `SAPR`, `IGTI`, `CPLE`, `ELET`, `SOMA`, `SULA`, `BIDI`, `TIET`, `PARD`, `MODL`, `ALPK`, `AURE`, `ALLD`, `STBP`, `RPMG`, `BMGB`).
  - Adicionada documentação detalhada explicando a fonte dos dados (B3 - Empresas Listadas) e ressaltando que se trata de uma heurística de fallback ativada exclusivamente quando a API principal (`apiType`) não retornar a classificação do ativo.
  - Refatorada a função `classifyBr` para consultar `B3_STOCK_UNIT_PREFIXES.has(prefix)`.
- **Testes Unitários (`src/lib/__tests__/classify.test.ts`)**:
  - Criada suíte de testes com 4 casos cobrindo:
    1. Classificação de todas as 22 Units como `STOCK_BR`.
    2. Classificação de FIIs reais (`HGLG11`, `MXRF11`, etc.) como `FII`.
    3. Classificação de ações ordinárias/preferenciais padrão (`PETR4`, `VALE3`).
    4. Garantia de que `apiType` tem prioridade absoluta sobre o fallback.
- **Validação**: Testes totais subiram de 49 para **53 testes passados** (10 arquivos). Build de produção executado com sucesso.

- **Re-verificação Rigorosa Item-a-Item (Prompt 20 - Correção/Re-checagem)**:
  - Realizada re-checagem rigorosa dos 22 prefixos contra o cadastro de emissores CVM, Yahoo Finance (`query1.finance.yahoo.com`), B3 e notícias/RI de empresas.
  - **Confirmados (16 prefixos)**:
    - Ativos atuais (8): `TAEE`, `KLBN`, `SANB`, `BPAC`, `ENGI`, `ALUP`, `SAPR`, `IGTI`.
    - Históricos convertidos/extintos (8): `CPLE` (Copel), `SULA` (SulAmérica), `BIDI` (Banco Inter), `TIET` (AES Tietê), `MODL` (Banco Modal), `AURE` (Auren Energia), `STBP` (Santos Brasil), `BMGB` (Banco BMG).
  - **Removidos (6 prefixos falsos/não-units)**:
    - `RPMG` (Manguinhos opera apenas como RPMG3 ON, nunca existiu RPMG11).
    - `ELET` (Eletrobras operava apenas ELET3/ELET5/ELET6, nunca existiu ELET11).
    - `SOMA` (Grupo Soma negociava apenas SOMA3 no Novo Mercado).
    - `PARD` (Hermes Pardini negociava apenas PARD3).
    - `ALPK` (Estapar negocia apenas ALPK3).
    - `ALLD` (Allied Tecnologia negocia apenas ALLD3).
  - Atualizados `B3_STOCK_UNIT_PREFIXES` em `classify.ts` e a suíte de teste em `classify.test.ts`. Testes (53/53) e build 100% limpos.

---