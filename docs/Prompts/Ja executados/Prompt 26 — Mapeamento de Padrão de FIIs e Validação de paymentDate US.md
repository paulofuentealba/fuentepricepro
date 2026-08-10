### Prompt 26 — Mapeamento de Padrão de FIIs e Validação de `paymentDate` US 📑

- **Parte A: Mapeamento de Padrão de Pagamento de FIIs (10 Fundos)**:
  - Mapeados 10 FIIs representativos (`HGLG11`, `MXRF11`, `KNRI11`, `XPLG11`, `VISC11`, `BTLG11`, `KNCR11`, `AFHI11`, `CPTS11`, `ALZR11`) através dos regulamentos oficiais dos administradores (CSHG/Pátria, XP Asset, Kinea/Intrag, BTG Pactual, Vinci Real Estate, Vórtx, Daycoval) e dados históricos da B3.
  - **Resultado**: 9 dos 10 fundos possuem regra determinística estrita no regulamento: **10º dia útil do mês subsequente** ao mês de referência (com Data-Com no último dia útil do mês de referência). Exceção: `BTLG11` (BTG Pactual Logística), cujo regulamento especifica o **25º dia corrido do mês subsequente** (posterga para o 1º dia útil seguinte se for final de semana/feriado). Todos com nível de confiança **Alta**.

- **Parte B: Validação de `paymentDate` para Ativos US**:
  1. **Nasdaq API Pública** (`https://api.nasdaq.com/api/quote/{ticker}/dividends?assetclass=stocks`):
     - Exige headers `User-Agent`, `Accept`, `Origin` e `Referer`.
     - **Ações Nasdaq-Listed** (`AAPL`, `MSFT`): Retorna **100% de preenchimento** de `paymentDate`, `exOrEffDate`, `declarationDate`, `recordDate` e `amount`. Latência: ~40-200ms.
     - **Ações NYSE-Listed / REITs** (`O`, `JNJ`, `KO`): Retorna `rows: null` por serem custodiadas/negociadas na NYSE (a API da Nasdaq restringe `assetclass=stocks` a papéis listados na sua própria bolsa).
  2. **Alpha Vantage `DIVIDENDS`**: `ALPHAVANTAGE_API_KEY` ausente no ambiente (`NOT SET`); etapa ignorada conforme regra do prompt.
  3. **Yahoo Finance API**: Retorna apenas `amount` e `date` (onde `date` é a data-ex do gráfico). **Não possui `paymentDate`**.
- **Código de Produção**: Preservado e sem alterações (`src/lib/api/*`, `apiService.functions.ts` e React intactos).

---