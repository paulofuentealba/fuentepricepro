# 72 — Unificar Cor de CTA Inconsistente (F3: `--primary` vs. `emerald` hardcoded)

## Contexto

Achado F3 da auditoria anterior: ~22 arquivos usam classes Tailwind de
paleta padrão (`emerald-400`, `emerald-500`, etc.) hardcoded em vez do
token semântico `--primary` já estabelecido no catálogo de design
(mesmo padrão de bug já corrigido uma vez em `TargetAllocationPanel.tsx`
durante a varredura de design tokens desta sessão — esse achado é o
resto que ficou de fora daquela varredura).

## Escopo técnico

1. Buscar em todo `src/components/` e `src/routes/` por classes
   `emerald-*` hardcoded (`text-emerald-*`, `bg-emerald-*`,
   `border-emerald-*`, `ring-emerald-*`) em contexto que representa
   marca/ação primária (não confundir com `--success`, que já é
   corretamente emerald por design — a distinção importa: se o emerald
   ali representa "resultado positivo/ganho", está correto e não deve
   virar `--primary`; se representa "elemento de marca/CTA/ação", deve
   virar `--primary`).
2. Para cada ocorrência, classificar antes de trocar — reportar a lista
   completa com a classificação (marca vs. resultado) antes de aplicar
   qualquer mudança em massa, já que essa distinção é fácil de errar em
   lote.
3. Trocar as classificadas como "marca/CTA" pro token real
   (`text-primary`, `bg-primary`, etc.).
4. Rodar `design-tokens.test.ts` (já tem a 5ª regra que bloqueia classe
   de paleta Tailwind crua) — usar como validação final de que nada
   ficou pra trás.

## Regras obrigatórias

- Não trocar nenhuma ocorrência que representa resultado/ganho
  positivo — essas devem continuar usando `--success` (que já é
  emerald), não virar `--primary`.
- Reportar a lista completa classificada antes de aplicar em massa —
  não decidir sozinho em casos ambíguos, perguntar.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test` (incluindo `design-tokens.test.ts`),
   `npm run build` — limpos
2. Lista final: quantos arquivos alterados, quantos casos ficaram como
   `--success` (não mudados) por serem resultado, não marca

## Ao terminar

Atualizar `docs/SSOT.md`, item 5 da tabela de pendências. Trabalhar em
`dev`.
