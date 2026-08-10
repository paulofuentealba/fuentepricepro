### Prompt Fix II — Resolução Interativa de Tickers Não Identificados na Importação de PDF ✅

- **Objetivo**: Substituir erros rígidos `broker_layout_unsupported` por um sistema resiliente de resolução de tickers em 4 etapas e tela de interação com o usuário (estilo My Profit) para preenchimento e salvamento persistente de mapeamentos.
- **Implementação Técnica**:
  - **Hook `useIssuerTickerMappings.ts`**: Persistência de `issuerTickerMappings` no Firestore (`users/{userId}.issuerTickerMappings`) e `localStorage` (`ceilingPricePro.issuerTickerMappings.v1`) espelhando o padrão de `useInvestorProfile.ts`.
  - **Ordem de Resolução em 4 Etapas (`b3Parser.ts`)**:
    1. Regex padrão (`/\b([A-Z]{4}\d{1,2}[F]?)\b/`) — precedência estrita para tickers numéricos diretos.
    2. Tabela declarativa `B3_SHORT_NAME_MAP` com normalização via `normalizeIssuerSpecification` (remoção de tags de governança `N1`, `N2`, `NM`, `EJ`, `ED`, `EX`, `ER`, `MB`, `DRN` para chave robusta entre corretoras/épocas, ex: `"OI ON"`).
    3. Mapeamentos do usuário (`userMappings` / `issuerTickerMappings`).
    4. Adição a `unresolvedTrades` (sem falhar a nota inteira).
  - **Interface Interativa em `BrokerNoteUploader.tsx`**: Tela de resolução em layout Emerald apresentando todas as operações pendentes em lista com especificação original, tipo (C/V), quantidade, data, valor total e inputs de ticker. Botão *Confirmar e Importar* salva novos mapeamentos e conclui a importação.
- **Testes Unitários**:
  - `issuerTickerMappings.test.ts`: 2 testes cobrindo inicialização e persistência do hook.
  - `pdf-parser.test.ts`:
    1. `normalizeIssuerSpecification`: Remoção de tags de governança.
    2. Fixture real Clear (`OI ON N1`): Resolução automática para `OIBR3` via `B3_SHORT_NAME_MAP`.
    3. Emissor fictício (`UNKNOWN CO ON N1`): Retorno em `unresolvedTrades` sem falhar a nota.
    4. Mapeamento do usuário: Resolução com sucesso ao fornecer `userMappings`.
- **Validação**:
  - `npm run test`: **103/103 testes unitários aprovados** em 17 arquivos de teste.
  - `npm run build`: Compilação Client/SSR 100% limpa.

---