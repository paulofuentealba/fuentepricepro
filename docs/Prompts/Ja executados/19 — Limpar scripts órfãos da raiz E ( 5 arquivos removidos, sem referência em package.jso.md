### 19 — Limpar scripts órfãos da raiz ✅ CONCLUÍDO E CONFIRMADO (verificado: 5 arquivos removidos, sem referência em package.json)

```
19 — Limpar scripts órfãos da raiz

Contexto: clean.cjs, merge.cjs, test-bbas3.ts, test-server.js, test_search.ts
estão soltos na raiz do projeto, fora de src/ e scripts/. Pelo conteúdo,
merge.cjs parece ser o script que gerou a estrutura atual do AssetCard.tsx
a partir de um ResultCard.tsx antigo — já executado, não roda mais.

TAREFA:
1. Confirmar que cada um desses 5 arquivos não é referenciado em nenhum
   script do package.json nem importado por nenhum outro arquivo
2. Se confirmado órfão: remover
3. Se algum ainda for usado (ex: script de teste manual que você roda às
   vezes): reportar antes de remover, não presumir

CRITÉRIO DE SUCESSO: raiz do projeto sem scripts órfãos; qualquer um que
ainda tenha uso real fica documentado no README ou similar.
```

---