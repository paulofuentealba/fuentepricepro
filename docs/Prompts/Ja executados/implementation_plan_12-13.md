# Plano Consolidado — Prompts 12 e 13 (Revisão 2)

## 1. Prompt 12, Parte A — Implementação da Collection `/assets` (Firestore)

**Resposta à pergunta de concorrência (stampede):**
*(a) O projeto **não possui** proteção de in-flight promise em `fetchAssetFn` atualmente.*
Se 50 usuários pedirem `PETR4` com cache frio no exato mesmo segundo, a server function iniciará 50 requisições paralelas à Brapi. Devido ao design serverless (as requisições batendo em instâncias diferentes), um Map de promises em memória não seria 100% à prova de balas sem a ajuda de Redis, mas amenizaria colisões de uma mesma instância. **Decisão:** Registrarei a "Falta de Request Coalescing" no `BACKLOG_V2.md` para ser tratada depois, isolando assim o escopo de colocar o Firestore no ar.

**Plano:**
- **TTL e Fluxo:** Manter 5 min. Leitura `Memory -> Firestore -> API Externa`. Escrita via `set()` no Firestore e `memoryCache.set()`.
- **Segurança (`firestore.rules`):** `allow read: if true; allow write: if false;`.

## 2. Prompt 12, Parte B — Diagnóstico do Invested vs. Received

*(Nota: O achado de inconsistência de casing foi adicionado ao `BACKLOG_V2.md` como item de débito técnico).*

> [!WARNING] Ação Necessária (Rodar Diagnóstico Corrigido)
> Eis o script corrigido resolvendo os 3 Bugs (Busca por e-mail, casing minúsculo tolerante, contagem de corporate_action). Por favor, rode este script e cole a saída aqui.

```typescript
import { adminDb } from "./src/lib/firebase-admin.server.ts";

const suspiciousTickers = ["TGAR11", "GGRC11", "BRAP4", "CPTI11", "AFHI11", "JURO11", "PMLL11", "HGCR11", "HGRU11", "RZTR11"];

async function investigate() {
  const usersSnapshot = await adminDb.collection("users").where("email", "==", "paulo@fuentepricepro.com").limit(1).get();
  if (usersSnapshot.empty) {
    console.error("Usuário paulo@fuentepricepro.com não encontrado!");
    return;
  }
  const uid = usersSnapshot.docs[0].id;
  console.log("Investigando UID do Paulo:", uid);

  for (const ticker of suspiciousTickers) {
    const posSnap = await adminDb.collection(`users/${uid}/positions`).doc(ticker).get();
    if (posSnap.exists) {
      const data = posSnap.data();
      console.log(`\n[${ticker}] Posição Atual no banco: Quantity = ${data?.quantity}`);
      
      const txSnap = await adminDb.collection(`users/${uid}/transactions`).where("ticker", "==", ticker).get();
      let netQuantity = 0;
      let corporateActionsCount = 0;

      txSnap.forEach(doc => {
        const tx = doc.data();
        const tType = String(tx.type).toLowerCase();
        
        if (tType === "buy") netQuantity += tx.quantity;
        else if (tType === "sell") netQuantity -= tx.quantity;
        else if (tType === "corporate_action") corporateActionsCount++;
      });
      console.log(`[${ticker}] Saldo líquido calculado via Histórico (Buy/Sell) = ${netQuantity}`);
      if (corporateActionsCount > 0) {
         console.log(`[${ticker}] ATENÇÃO: Possui ${corporateActionsCount} eventos de 'corporate_action' (Desdobramentos/Bonificações). O saldo líquido puro de Buy/Sell pode não bater perfeitamente com a Quantity.`);
      }
    }
  }
}
investigate().catch(console.error);
```

## 3. Prompt 13 — Scraping da Dados de Mercado

Refiz a Fase 1 integralmente, extraindo e testando os seletores do HTML real nas URLs separadas. A estrutura mapeada no `curl` real foi a seguinte:

1. **Indicadores** em `id="marketratios"` (na página principal):
   ```html
   <div class="table-container high bordered slide" id="marketratios">
       <table class="normal-table">
           <thead>
               <tr><th>Conta</th> ... </tr>
   ```
2. **Dados Pessoais (LGPD)** confirmados sob `id="admins"` (na página principal):
   ```html
   <div class="admin-list" id="admins">
       <div class="admin-item">...<strong>Rafael Augusto Sperendio</strong>...
   ```
3. **Dividendos** na URL dedicada (`/acoes/{ticker}/dividendos`):
   ```html
   <table class="normal-table">
        <thead>
            <tr>
                <th>Tipo</th><th class="right">Valor</th><th class="right">Registro</th>...
   ```
   
*(O CSV de fato está em um botão JS `<button>` injetado do lado cliente, tornando impossível o download via curl simples. Iremos com o Scraping de HTML).*

**Plano de Execução:**
- Criarei o parser `dadosDeMercadoScraper.server.ts` isolando as requests HTML.
- **Evitando Regex frágil:** Usarei manipulação baseada em substrings seguras garantindo que a área `id="admins"` nunca chegue ao parser final.
- Dividendos caem em fallback, como antes.
- Market Ratios são passados pelo backend, mas NÃO engatados no `getAssetValuation`.

## User Review Required

1. Aprove a implementação da Parte A (Firestore) sabendo que o request coalescing fica no backlog.
2. Rode o script de diagnóstico da Parte B (agora corrigido) e envie a saída.
3. Aprove a implementação do scraper da Dados de Mercado baseado na verificação exata do HTML reportada.
