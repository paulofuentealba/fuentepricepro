# Prompt para Antigravity — Bundle Splitting `recharts`/`xlsx` (PR3: Item 7)

## Modo de operação

`[EXECUÇÃO]`. Mudança isolada de configuração de build. Zero risco de lógica de negócio ou UI.

**Um commit:**
```
build(vite): adicionar recharts e xlsx ao manualChunks [Item 7]
```

## Classificação de severidade (Product Manager)

🟢 Baixa — performance/bundle, sem risco funcional.

## Contexto

`vite.config.ts` já faz `manualChunks` para `firebase`, `framer-motion` e `react-dom` (com comentário explicando a razão: evitar redownload de vendor libs em deploys que só tocam código de app). `recharts` (usado em múltiplos componentes de gráfico espalhados por `dashboard/`, `ceiling/cashflow/`, `ceiling/result/`) e `xlsx` (usado em `useImportParser.ts` para import de nota de corretagem) não têm chunk próprio hoje.

## Escopo técnico

Em `vite.config.ts`, estender a função `manualChunks`:

```ts
manualChunks(id) {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("firebase")) return "vendor-firebase";
  if (id.includes("framer-motion")) return "vendor-motion";
  if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
  if (id.includes("recharts")) return "vendor-charts";
  if (id.includes("xlsx")) return "vendor-xlsx";
  return undefined;
},
```

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| Isolar `xlsx` em chunk próprio só ajuda se esse chunk for lazy-carregado (isto é, se `useImportParser.ts` só é importado dentro da rota/modal de import, não no bundle inicial de `/app`) | **Antes de reportar concluído, confirmar isso**: rodar `npm run build` e comparar o relatório de chunks — `vendor-xlsx` deve aparecer como chunk separado E não deve estar referenciado no `<script>` inicial do HTML gerado para rotas fora do fluxo de import. Se `xlsx` aparecer carregado eager em `/app` mesmo isolado em chunk próprio, o problema não é `manualChunks` — é o ponto de import em `DynamicImportModal.tsx`/`BrokerNoteImportPage.tsx` não estar de fato atrás de `React.lazy()`. Reportar qual dos dois casos ocorreu, não assumir que isolar em chunk resolveu sozinho. |
| `recharts` isolado em chunk próprio é sempre um ganho líquido (é usado em várias rotas de `/app`, então compartilhar o chunk entre elas evita duplicação, independente de lazy-loading) | Nenhuma decisão pendente — aplicar direto |

## Arquivos afetados

- `vite.config.ts` (único arquivo alterado)

## Proibido

- Adicionar `React.lazy()` em componentes que hoje importam `xlsx`/`recharts` estaticamente — isso é uma mudança de código de app, fora do escopo deste prompt. Se a investigação do ponto de atenção acima revelar que é necessário, **reportar e aguardar novo prompt**, não implementar aqui.

## Governança de roles

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-solution-architect` | ✅ | Estratégia de bundling é decisão de infraestrutura |
| `fuente-product-manager` | ✅ | Classificação de severidade acima |
| Demais 6 roles | ❌ | Mudança de build config não toca negócio, UX, cálculo, ou dado pessoal |

## Gates de verificação final (colar output literal, incluir o relatório de tamanho de chunk do build)

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Mensagem de commit

```
build(vite): adicionar recharts e xlsx ao manualChunks [Item 7]
```
