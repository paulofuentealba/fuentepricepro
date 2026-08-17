# PROMPT — Correção 2: `any` Implícito em `TickerSearchField.tsx`
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> (Separado do Prompt de imports órfãos por pedido explícito — mas pode
> virar o mesmo commit se preferir, já que os dois saem do mesmo `tsc`.)

```
Atue como Engenheiro Frontend Sênior. Correção pontual de tipo.

CONTEXTO:
npx tsc --noEmit aponta:
src/components/shared/TickerSearchField.tsx(202,24): error TS7053:
Element implicitly has an 'any' type because expression of type 'any'
can't be used to index type 'Record<AssetType, string>'.

ESCOPO:
Investigar a linha 202 (e a variável usada como índice) e corrigir o tipo
de verdade — a variável que indexa Record<AssetType, string> precisa ser
tipada como AssetType (ou estreitada com type guard), não convertida à
força.

PROIBIDO:
- `as any`, `as Record<AssetType, string>[keyof any]`, `@ts-ignore` ou
  qualquer supressão que não resolva o tipo real.
- Mudar o comportamento visível do componente — é correção de tipo, o
  runtime já funciona.

ENTREGA:
Commit atômico. Colar output cru de npx tsc --noEmit (0 erros), npm run
test, npm run build.
```
