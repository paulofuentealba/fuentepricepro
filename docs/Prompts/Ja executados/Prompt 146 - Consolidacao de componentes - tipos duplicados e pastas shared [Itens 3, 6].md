# Prompt para Antigravity — Consolidação de Componentes (PR2: Itens 3, 6)

## Modo de operação

`[EXECUÇÃO]`. Dois achados de organização de componentes, baixo risco financeiro (nenhum cálculo Bazin/Graham/Gordon é tocado — só contratos de tipo e localização de arquivo).

**Um commit para este prompt inteiro:**
```
refactor(components): consolidar tipos de valuation duplicados e unificar pastas shared [Itens 3,6]
```

## Classificação de severidade (Product Manager)

| Item | Severidade |
|---|---|
| 3 — Tipos duplicados (`ValuationConsensusMatrix` × `ConsensusPyramid`) | 🟡 Média |
| 6 — Duas pastas `shared/` | 🟢 Baixa |

## Contexto

`components/shared/ValuationConsensusMatrix.tsx` e `components/ceiling/watchlist/ConsensusPyramid.tsx` definem, cada um por conta própria, o mesmo `type MethodType` e a mesma `interface ValuationData` — copiados um do outro, não compartilhados. Ambos também importam `MethodDetailSheet` de dentro de `ceiling/watchlist/`, criando dependência cruzada entre domínios.

Separadamente, `components/ceiling/shared/` (4 arquivos: `AssetDataDisplay.tsx`, `chartColors.ts`, `InvestingSinceField.tsx`, `MaskedInput.tsx`) coexiste com `components/shared/` (14 arquivos) sem justificativa técnica para o aninhamento.

## Escopo técnico

### Item 3 — tipo único de valuation

1. Criar (ou usar, se já existir local mais apropriado) `src/lib/valuationTypes.ts` exportando:
   ```ts
   export type MethodType = "gordon" | "bazin" | "graham" | "lynch" | "consensus";

   export interface ValuationData {
     bazin: number | null;
     graham: number | null;
     gordon: number | null;
     lynch?: number | null;
     consensus: number | null;
     margin?: number;
     methodDetails?: {
       gordon?: { formula: string; rate: number; growth: number; source: string; date: string; growthSource?: string };
       bazin?: { formula: string; yieldTarget: number; isNetJcp?: boolean; source: string; date: string };
       graham?: { formula: string; margin: number; source: string; date: string };
       lynch?: { formula: string; growth: number; dividendYield: number; source: string; date: string };
       consensus?: { methods: string[]; excluded: string[] };
     };
   }
   ```
   Usar a versão de `ValuationConsensusMatrix.tsx` como base (tem `margin?` e `methodDetails.gordon.growthSource?` opcional, que `ConsensusPyramid.tsx` trata como obrigatório — **preservar opcional**, é o superset seguro).
2. Em `ValuationConsensusMatrix.tsx` e `ConsensusPyramid.tsx`: remover as definições locais de `MethodType`/`ValuationData`, importar de `@/lib/valuationTypes`.
3. Mover `MethodDetailSheet.tsx` de `components/ceiling/watchlist/` para `components/shared/`. Atualizar os dois imports (`ValuationConsensusMatrix.tsx` já importa de `ceiling/watchlist`; `ConsensusPyramid.tsx` importa relativo `./MethodDetailSheet`).

### Item 6 — unificar pastas `shared/`

1. **Antes de mover qualquer arquivo**, rodar uma busca real (grep) por todos os consumidores de `AssetDataDisplay`, `chartColors`, `InvestingSinceField`, `MaskedInput` no projeto inteiro e listar os arquivos encontrados no relatório de conclusão — eu (Claude) só consegui confirmar 2 consumidores lendo arquivo por arquivo manualmente (ver item 4), não tenho grep; você tem, use.
2. Mover `components/ceiling/shared/AssetDataDisplay.tsx`, `chartColors.ts`, `InvestingSinceField.tsx` → `components/shared/`.
3. Mover `components/ceiling/shared/MaskedInput.tsx` → `components/ui/` (é primitivo de input genérico, não específico de domínio financeiro — mesmo critério usado para o resto de `components/ui/`).
4. Deletar a pasta `components/ceiling/shared/` vazia, incluindo `__tests__/`. **Atenção**: só existem testes para `AssetDataDisplay.tsx` e `MaskedInput.tsx` hoje (`AssetDataDisplay.test.tsx`, `MaskedInput.test.tsx`) — mover esses dois junto com seus respectivos arquivos. `InvestingSinceField.tsx` e `chartColors.ts` não têm teste — não criar teste novo nesta passada, só confirmar que não há nada para mover.
5. **Consumidores já confirmados** (verificados por leitura direta, não suposição) — atualizar o import nestes dois no mínimo:
   - `src/components/ceiling/watchlist/EditPositionFields.tsx` — `import { MaskedInput } from "../shared/MaskedInput";`
   - `src/components/ceiling/watchlist/AssetDetailSheet.tsx` — `import { InvestingSinceField } from "../shared/InvestingSinceField";`
6. Atualizar **todos os demais** imports que referenciam `ceiling/shared/*` no projeto inteiro (busca por `from "@/components/ceiling/shared`, `from "./shared` dentro de `ceiling/`, e imports relativos `../shared/`) — a lista do passo 1 é a fonte de verdade, não os dois exemplos do passo 5.

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| `chartColors.ts` pode ter nome colidindo com algo já existente em `components/shared/` ou `components/ui/` — verificar antes de mover | Se colisão de nome, renomear preservando semântica (ex: `chartColors.ts` → `valuationChartColors.ts`), nunca sobrescrever silenciosamente |
| `ValuationData.methodDetails.gordon.growthSource` é opcional em um arquivo e obrigatório no outro | Adotar opcional (`?`) no tipo unificado — é o caso mais permissivo, nenhum dos dois componentes quebra |
| Mover `MethodDetailSheet` muda o caminho de import em pelo menos 2 arquivos conhecidos — pode haver mais consumidores não mapeados nesta auditoria | Rodar `tsc --noEmit` é o gate real aqui — qualquer import quebrado aparece como erro de compilação, não como suposição |

## Arquivos afetados

- `src/lib/valuationTypes.ts` (novo)
- `src/components/shared/ValuationConsensusMatrix.tsx`
- `src/components/ceiling/watchlist/ConsensusPyramid.tsx`
- `src/components/shared/MethodDetailSheet.tsx` (movido)
- `src/components/shared/AssetDataDisplay.tsx`, `chartColors.ts`, `InvestingSinceField.tsx` (movidos)
- `src/components/ui/MaskedInput.tsx` (movido)
- Qualquer arquivo consumidor com import quebrado, identificado via `tsc --noEmit`

## Proibido

- Mudar a lógica visual/comportamento de `ValuationConsensusMatrix` ou `ConsensusPyramid` — só o tipo importado muda, os componentes continuam distintos (matriz vs. pirâmide).
- Consolidar os dois componentes em um só nesta passada — não foi pedido, é só o tipo.

## Governança de roles

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-solution-architect` | ✅ | Decisão de camada/local do tipo compartilhado |
| `fuente-ux-designer` | ❌ | Nenhum componente muda visualmente |
| `fuente-business-architect` | ❌ | Sem mudança de capacidade |
| `fuente-product-manager` | ✅ | Classificação de severidade acima |
| `fuente-product-marketing` | ❌ | N/A |
| `fuente-investidor-profissional` | ❌ | Nenhum cálculo é tocado |
| `fuente-investidor-iniciante` | ❌ | N/A |
| `fuente-advogado-lgpd-gdpr` | ❌ | N/A |

## Gates de verificação final (colar output literal)

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Mensagem de commit

```
refactor(components): consolidar tipos de valuation duplicados e unificar pastas shared [Itens 3,6]
```
