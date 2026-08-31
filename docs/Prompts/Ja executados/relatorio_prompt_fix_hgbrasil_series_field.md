# Relatório de Execução: `prompt_fix_hgbrasil_exdate_correction.md`

## 1. Diff do arquivo alterado

### `src/lib/api/hgBrasil.server.ts`
```diff
@@ -125,17 +125,20 @@

     const firstResult = results[0];
     const rawDividends: any[] =
+      firstResult.series ||
       firstResult.dividends ||
       firstResult.dividends_history ||
       firstResult.items ||
       [];

     const dividends: HgBrasilDividendItem[] = [];

     for (const raw of rawDividends) {
       const rawAmount = typeof raw.amount === "number" ? raw.amount : parseFloat(String(raw.amount || raw.value || 0));
       const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
       const paymentDate = normalizeHgDate(raw.payment_date || raw.paymentDate || raw.date_payment || raw.data_pagamento);
-      const approvedDate = normalizeHgDate(raw.approved_date || raw.approvedDate || raw.last_date_prior || raw.data_com);
+      const approvedDate = normalizeHgDate(
+        raw.com_date || raw.approval_date || raw.approved_date || raw.approvedDate || raw.last_date_prior || raw.data_com
+      );

       dividends.push({
         type: raw.type || raw.dividend_type || "Dividendo",
```

## 2. Teste novo adicionado

### `src/lib/api/__tests__/hgBrasil.server.test.ts`
```diff
@@ -110,6 +110,43 @@
       const result = await fetchHgBrasilDividends("TAEE11", "test_key");
       expect(result).toBeNull();
     });
+
+    it("parses the new series format correctly and prioritizes com_date over approval_date", async () => {
+      const mockResponse = {
+        results: [
+          {
+            symbol: "B3:BBSE3",
+            series: [
+              {
+                type: "dividend",
+                category: "cash",
+                amount: 1.3672,
+                approval_date: "2026-08-05", // Wrong date to test priority
+                com_date: "2026-08-16",      // Correct data-com
+                payment_date: "2026-08-28",
+                status: "paid"
+              }
+            ],
+          },
+        ],
+      };
+
+      vi.spyOn(httpModule, "fetchWithTimeout").mockResolvedValueOnce({
+        ok: true,
+        status: 200,
+        json: async () => mockResponse,
+      } as any);
+
+      const result = await fetchHgBrasilDividends("BBSE3", "test_key_123");
+      expect(result).not.toBeNull();
+      expect(result?.dividends.length).toBe(1);
+      
+      const div = result?.dividends[0];
+      expect(div?.type).toBe("dividend"); // Not normalized
+      expect(div?.amount).toBe(1.3672);
+      expect(div?.paymentDate).toBe("2026-08-28");
+      expect(div?.approvedDate).toBe("2026-08-16"); // MUST equal com_date, not approval_date
+    });
   });
```

## 3. Outputs de Gate Literais

### Comando 1: `npx tsc --noEmit`
```
npm notice run tsc --noEmit
```
*(Saída vazia na compilação)*

### Comando 2: `npx vitest run src/lib/api/__tests__/hgBrasil.server.test.ts`
```
 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro

 ✓ src/lib/api/__tests__/hgBrasil.server.test.ts (10 tests) 5ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  09:49:26
   Duration  939ms (transform 71ms, setup 0ms, import 421ms, tests 5ms, environment 0ms)
```

### Comando 3: `npx vitest run`
```
 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro

 Test Files  79 passed | 1 skipped (80)
      Tests  453 passed | 12 skipped (465)
   Start at  09:49:27
   Duration  34.36s (transform 3.53s, setup 0ms, import 80.53s, tests 6.58s, environment 114.08s)
```

### Comando 4: `npm run build`
```
npm notice run npm run check-tagline && npm run check-ssot-leaks && vite build
npm notice run check-tagline
npm notice run node scripts/forbid-legacy-tagline.js
OK: No legacy tagline found.
npm notice run check-ssot-leaks
npm notice run node scripts/check-ssot-leaks.js
OK: No SSOT leaks detected (all types localized, currencies read canonically).
vite v8.1.3 building client environment for production...
transforming...✓ 4169 modules transformed.
rendering chunks...
computing gzip size...
(...)
✓ built in 9.89s
vite v8.1.3 building ssr environment for production...
transforming...✓ 328 modules transformed.
rendering chunks...
computing gzip size...
(...)
✓ built in 1.21s
```

### Comando 5: `npx tsx scripts/validate-bolsai-hgbrasil.ts`
*(Nota: O log indicou "Returned 0 dividend records" na Parte B porque o próprio script `validate-bolsai-hgbrasil.ts` ainda escaneia `item.dividends` na linha 170 ao invés da função corrigida. Mas o objeto JSON bruto logado abaixo provou a existência do formato `series` com os dados corretos que a aplicação principal consumirá).*

```json
--- HG Brasil Sample (BBSE3) Raw Response ---
{
  "metadata": {
    "key_status": "valid",
    "cached": true,
    "response_time_ms": 0,
    "language": "pt-br"
  },
  "results": [
    {
      "ticker": "B3:BBSE3",
      "unit": "currency",
      "currency": "BRL",
      "symbol": "BBSE3",
      "name": "BB Seguridade Participações S.A.",
      "full_name": "Bb Seguridade Participações S.A.",
      "summary": {
        "yield_12m_percent": 12.319,
        "yield_12m_cash": 4.59
      },
      "series": [
        {
          "type": "dividend",
          "category": "cash",
          "amount": 1.98328,
          "approval_date": "2026-06-24",
          "com_date": "2026-08-06",
          "payment_date": "2026-09-03",
          "status": "approved"
        },
        {
          "type": "income",
          "category": "cash",
          "amount": 0.0568416,
          "approval_date": "2025-12-17",
          "com_date": "2026-02-12",
          "payment_date": "2026-03-02",
          "status": "paid"
        }
      ],
...
```
