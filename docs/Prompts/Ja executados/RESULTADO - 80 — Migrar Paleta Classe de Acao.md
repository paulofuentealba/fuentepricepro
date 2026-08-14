# RESULTADO - 80 — Migrar Paleta Classe de Ação

## 1. Mapeamento final de cores

`getShareClassBadge()` em `src/lib/classify.ts` (linha ~61) já estava com uma migração para tokens `--chart-1`..`--chart-5` presente no working tree (não commitada) quando esta tarefa começou; a migração foi conferida, validada e é a que segue para commit:

| Classe | Token | Motivo |
|---|---|---|
| BDR | `--chart-1` | Cor "neutra" (laranja/marrom no claro, azul/roxo no escuro) — sem associação com ganho/perda em nenhum tema. |
| UNIT | `--chart-2` | Verde no tema escuro (hue~160), mas atribuído a UNIT — uma categoria estrutural (certificado de depósito), não um resultado. Evita a armadilha de preservar a antiga cor `emerald` (que era usada em ON, categoria que soa mais "positiva" para o usuário) no token que também lê como verde. |
| Fracionário | `--chart-3` | Azul/roxo no claro, amarelo/laranja no escuro — neutro em ambos os temas. |
| ON | `--chart-4` | Amarelo/verde no claro, roxo/rosa no escuro — deliberadamente NÃO usa `--chart-2` (verde no escuro), removendo a ambiguidade visual que a cor `emerald` antiga carregava (ON não é "resultado positivo"). |
| PN | `--chart-5` | Vermelho no tema escuro (hue~15), mas atribuído a PN (não a uma categoria que já carrega conotação negativa). PN é apenas uma classe de ação (preferencial), não uma perda; o rótulo textual "PN" já deixa isso claro, e nenhuma outra categoria seria menos ambígua nesse slot. |

Decisão chave: `--chart-2` (verde no escuro) e `--chart-5` (vermelho no escuro) foram deliberadamente NÃO atribuídos a ON (que antes usava `emerald`, associado a "ganho"). Isso quebra a herança visual perigosa do mapeamento antigo. Não existe uma 6ª opção neutra, então christ-2/chart-5 foram distribuídos para UNIT e PN, que não têm conotação de resultado positivo/negativo na cabeça do usuário (são apenas tipos estruturais de ação).

A lógica de classificação de ticker (regex de BDR/UNIT/Fracionário/ON/PN) não foi alterada — apenas o `className` retornado.

## 2. Duplicação de lógica de cor

Busquei por `bg-blue-500|bg-purple-500|bg-amber-500|bg-emerald-500|bg-indigo-500` e por consumidores de `getShareClassBadge` em todo `src/`. Resultado:

- `AssetComparator.tsx` (`src/components/ceiling/AssetComparator.tsx:126`) e `TickerSearchField.tsx` (`src/components/shared/TickerSearchField.tsx:174`) já consomem `getShareClassBadge()` diretamente e usam o `className` retornado — não duplicam cores.
- `AssetForm.tsx` não referencia `getShareClassBadge` nem as 5 cores da paleta de badge — não havia duplicação a resolver ali.
- As únicas ocorrências de `bg-blue-500`, `bg-purple-500`, `bg-indigo-500` remanescentes em `src/` estão em `src/routes/index.tsx` e `src/routes/app/docs.tsx`, que são páginas de marketing/documentação decorativas já excluídas do gate `design-tokens.test.ts` — fora do escopo desta tarefa (não relacionadas a badges de classe de ação).

Conclusão: `getShareClassBadge()` já era (e continua sendo) a única fonte de verdade para essas 5 cores. Nenhuma unificação adicional foi necessária.

## 3. Expansão do `design-tokens.test.ts`

O teste `src/lib/__tests__/design-tokens.test.ts` (Regra 5 — "should enforce no default Tailwind color scale classes") varria apenas `src/components/` e `src/routes/` (arquivos `.tsx`). `src/lib/classify.ts` é `.ts`, não `.tsx`, e ficava fora do gate — foi exatamente essa lacuna que permitiu a paleta crua sobreviver ali sem ser pega.

**Decisão: expandir o gate.** Adicionei um scanner separado (`getAllTsFiles`) que varre `src/lib/**/*.ts` (excluindo `*.test.ts`) e incluí esses arquivos apenas na Regra 5 (checagem de classes Tailwind cruas), sem afetar as demais regras (oklch, hsl(var()), Recharts), que são específicas de componentes React.

Verifiquei antes de expandir que não havia falsos positivos: nenhuma ocorrência do padrão Tailwind cru em `src/lib/**/*.ts` fora do próprio arquivo de teste (que contém o regex como string, não como classe real). A suíte de testes roda limpa após a expansão.

## 4. Teste automatizado

Adicionado em `src/lib/__tests__/classify.test.ts`, novo `it` dentro de `describe("getShareClassBadge")`:

- Chama `getShareClassBadge()` para BDR, UNIT, Fracionário, ON e PN.
- Verifica que cada `className` contém o token `chart-N` esperado (1 a 5, na ordem do mapeamento acima).
- Verifica que nenhum `className` contém uma classe de paleta Tailwind crua (mesmo regex do gate, negado).
- Verifica que os 5 tokens usados são todos distintos (`chart-1`..`chart-5`, sem repetição).

**Nota sobre limitação de ambiente:** não é possível fazer verificação visual real (captura de tela/renderização em browser) neste ambiente de execução. O teste automatizado cobre a correção lógica (token certo, sem cor crua, 5 tokens distintos), mas a confirmação visual de que os 5 badges ficam claramente distinguíveis lado a lado — em ambos os temas (claro/escuro) — fica **pendente de confirmação manual do usuário** rodando a aplicação localmente.

## 5. Resultado dos comandos de verificação

- `npx tsc --noEmit` → limpo, sem erros.
- `npm run test` (vitest) → **42 arquivos de teste passaram (1 skip), 294 testes passaram (4 skips)**. Nenhuma falha.
- `npm run build` → build de produção concluído com sucesso (`✓ built`), sem erros.

## 6. SSOT.md

Item da tabela de pendências relacionado a `src/lib/classify.ts` (linha da entrada "F3 — cor de CTA inconsistente", que já mencionava `classify.ts` como pendência remanescente do achado do Prompt 72) atualizado para registrar a resolução via Prompt 80, com referência a este relatório.

## 7. Pendência para o usuário

Confirmar visualmente (rodando `npm run dev` e abrindo uma tela com múltiplos badges de classe de ação, ex: comparador ou busca de ticker) que os 5 badges (BDR, UNIT, Fracionário, ON, PN) são claramente distinguíveis entre si nos temas claro e escuro.
