### Prompt 31 — Fase 1 do Épico 1: Validação ao Vivo de Eventos Corporativos 🔎

- **Objetivo**: Testar ao vivo a detecção automática de Eventos Corporativos (`src/lib/corporateEvents.ts` + `CorporateEventModal.tsx`) com ativos reais (US/BR) que sofreram split ou agrupamento nos últimos anos.
- **Validações & Descobertas Empíricas**:
  1. **Motor de Ajuste (`applyCorporateEvent`)**: ✅ **100% Funcional e Matemático**.
     - **NVDA (Split 10:1)**: $10 \text{ cotas @ } \$1.200,00 \rightarrow 100 \text{ cotas @ } \$120,00$. Custo total preservado exatamente em $\$12.000,00$.
     - **BBAS3 (Split 2:1)**: $100 \text{ cotas @ } \text{R}\$ 56,00 \rightarrow 200 \text{ cotas @ } \text{R}\$ 28,00$. Custo total preservado em $\text{R}\$ 5.600,00$.
     - **MGLU3 (Agrupamento 1:10 com Fração)**: $25 \text{ cotas @ } \text{R}\$ 1,50 \rightarrow 2 \text{ cotas inteiras @ } \text{R}\$ 15,00 + \text{R}\$ 6,75$ em caixa de liquidação de fração a preço de mercado ($\text{R}\$ 13,50$).
  2. **Detecção Automática no Server (`checkPendingSplitsFn`)**: ⚠️ **BUG IDENTIFICADO**.
     - A chamada atual em `src/lib/apiService.functions.ts` (`https://query2.finance.yahoo.com/v8/finance/chart/${yhTicker}?events=split`) não passa os parâmetros `interval=1d&range=2y`.
     - Sem esses parâmetros, o Yahoo responde por padrão no modo `range=1d` (apenas o dia atual), retornando `splits: {}` (vazio) para qualquer ativo histórico.
     - Ao testar a API do Yahoo **COM** `interval=1d&range=5y`, o endpoint respondeu perfeitamente com todos os eventos históricos real-time (`NVDA` 10:1 em 10/06/2024, `CMG` 50:1 em 26/06/2024, `AVGO` 10:1 em 15/07/2024, `BBAS3.SA` 2:1 em 16/04/2024, `MGLU3.SA` 1:10 em 27/05/2024).
  3. **Atualização do Backlog (`docs/BACKLOG_V2.md`)**:
     - Seção `1.3 Eventos Corporativos Automatizados` rebaixada de ✅ para 🟡 (Yellow) documentando o detalhe técnico da query string a ser corrigida na próxima oportunidade.

---