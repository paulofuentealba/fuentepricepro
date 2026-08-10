### Fix: i18n Restante (NextPaymentBanner, CurrencyToggle e CorporateEventModal) ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz**:
  1. `NextPaymentBanner.tsx`: uso de ternário binário (`locale === "en" ? ... : ...`), forçando fallback em português para usuários configurados em espanhol.
  2. `CurrencyToggle.tsx`: texto `"cotação de"` e separador decimal `.replace(".", ",")` hardcoded para pt-BR, exibindo português e formato numérico brasileiro mesmo em UI configurada em inglês ou espanhol.
  3. `CorporateEventModal.tsx`: texto `"shares @"` hardcoded em inglês para a preview de quantidade e preço médio da posição.
- **Alterações**:
  1. `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`:
     - Adicionadas chaves `common.quoteAsOf`, `corporateEvents.sharesAt` e `watchlist.upcomingPayments` nos 3 dicionários.
  2. `src/components/ceiling/watchlist/NextPaymentBanner.tsx`:
     - Substituído o ternário por `t.watchlist.upcomingPayments`.
  3. `src/components/ui/CurrencyToggle.tsx`:
     - Substituído texto fixo e `.replace(".", ",")` por `t.common.quoteAsOf` e `Intl.NumberFormat(toIntlLocale(locale))` para formatação dinâmica de cotação e horário nos 3 idiomas.
  4. `src/components/portfolio/CorporateEventModal.tsx`:
     - Substituído `"shares @"` por `t.corporateEvents.sharesAt` com interpolação de quantidade e preço formatado dinamicamente com a localidade do usuário (`toIntlLocale(locale)`).
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.27s) e SSR (251 módulos em 787ms).

---