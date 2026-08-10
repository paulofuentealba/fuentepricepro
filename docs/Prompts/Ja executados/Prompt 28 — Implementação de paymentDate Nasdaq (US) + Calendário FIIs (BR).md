### Prompt 28 — Implementação de `paymentDate`: Nasdaq (US) + Calendário FIIs (BR) 🚀

- **Objetivo**: Preencher `paymentDate` para ativos US da Nasdaq e calcular `paymentDate` estimado para FIIs BR mapeados com base no regulamento oficial de distribuição.
- **Implementações Realizadas**:
  1. **Nasdaq API Module (`src/lib/api/nasdaq.server.ts`)**:
     - Função `fetchNasdaqDividends(ticker)` consulta a Nasdaq Public API e retorna um `Map<exDateIso, paymentDateIso>`.
     - Tratamento gracioso para papéis da NYSE (`rows: null`) ou falhas de rede (retorna mapa vazio).
     - Conectado em `fetchAssetFn` (`src/lib/apiService.functions.ts`), populando `paymentDate` quando `null` sem sobrescrever datas reais já existentes.
  2. **Calendário de Dias Úteis Brasileiros (`src/lib/br-business-calendar.ts`)**:
     - Cálculo de feriados nacionais fixos e móveis via **Algoritmo de Páscoa de Gauss** (Carnaval, Sexta-feira Santa, Corpus Christi).
     - Funções `isBusinessDay`, `nthBusinessDayOfMonth` e `nthCalendarDayPostponed`.
     - Testes unitários cobrindo 2024/2025 em `src/lib/__tests__/br-business-calendar.test.ts`.
  3. **Regras de Distribuição de FIIs (`src/lib/fiiPaymentRules.ts`)**:
     - Mapeamento das regras dos 10 FIIs líquidos (`HGLG11`, `MXRF11`, `KNRI11`, `XPLG11`, `VISC11`, `BTLG11`, `KNCR11`, `AFHI11`, `CPTS11`, `ALZR11`).
     - Função `estimatePaymentDate(ticker, referenceDate)`.
  4. **Suporte a Estimativa no Domínio e i18n**:
     - Campo `paymentDateEstimated?: boolean` adicionado em `DividendEvent` (`src/lib/domain.ts`).
     - Chaves de tradução i18n para tooltip adicionadas em `dict.en.ts`, `dict.ptBR.ts`, `dict.es.ts` (`tooltips.estimatedPaymentDate`).
  5. **Atualização do Backlog**: `docs/BACKLOG_V2.md` atualizado com o status final dos proventos (Nasdaq resolvido, FIIs resolvidos via estimativa, Gaps conhecidos em Ações BR e NYSE US).
- **Validação de Testes**:
  - `npm run test`: **67/67 testes unitários aprovados** em 13 arquivos de teste.
  - `npm run build`: Build de produção executado com sucesso.
  - Teste de integração E2E ao vivo executado com sucesso (`AAPL`/`MSFT` preenchidos via Nasdaq, `HGLG11`/`BTLG11` preenchidos via regra de dia útil, `O` mantido `null`).

---