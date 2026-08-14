# 74 — Disclaimer Regulatório CVM (Banner Persistente)

## Contexto

`docs/SSOT.md` já registra que o disclaimer CVM é pré-requisito
bloqueante antes de qualquer trabalho na Fase 4 (Módulo de IRPF). A
cláusula "3. Isto NÃO é aconselhamento de investimento" já existe nos
Termos de Uso (`/terms`) — mas um disclaimer enterrado nos Termos não
cumpre o mesmo papel que uma exibição persistente e visível na própria
ferramenta, que é o padrão esperado pra plataformas de análise financeira
(ex: `anthropics/financial-services`, já usado como referência nesta
sessão).

## Conteúdo aprovado (mesmo teor da cláusula já existente em `/terms`,
adaptado pra formato compacto de banner)

**PT-BR**: "Fuente Price Pro é uma ferramenta educacional e de análise
quantitativa. Nenhum cálculo, projeção ou consenso de valuation
constitui recomendação de investimento, análise de valores mobiliários
ou parecer fiscal formal. Consulte um profissional certificado antes de
decidir."

**EN**: "Fuente Price Pro is an educational and quantitative analysis
tool. No calculation, projection, or valuation consensus constitutes
investment advice, securities analysis, or formal tax opinion. Consult a
certified professional before deciding."

**ES**: "Fuente Price Pro es una herramienta educativa y de análisis
cuantitativo. Ningún cálculo, proyección o consenso de valuation
constituye recomendación de inversión, análisis de valores mobiliarios
u opinión fiscal formal. Consulte a un profesional certificado antes de
decidir."

## Escopo técnico

1. Componente `RegulatoryDisclaimerBanner.tsx` (ou nome equivalente) —
   texto compacto, discreto (não é alerta de erro, é rodapé
   informativo), visível de forma persistente nas telas que fazem
   cálculo/projeção (Screener, Watchlist, Comparador, Cash Flow, Smart
   Allocation, Snowball) — não precisa em telas puramente
   administrativas (Configurações, `/privacy`, `/terms`, onde a
   cláusula completa já vive).
2. Decidir o posicionamento: rodapé fixo de cada tela relevante, ou um
   único lugar centralizado (ex: dentro do layout `app.tsx`, aparecendo
   em todas as rotas de uma vez) — a segunda opção é mais barata de
   manter (1 lugar só) e mais consistente, avaliar antes de espalhar em
   6 telas manualmente. Reportar a decisão.
3. i18n nos 3 idiomas, usando o texto já aprovado acima — não reescrever
   a substância.
4. Não precisa ser dispensável/fechável — isso é uma cláusula
   regulatória, diferente do banner de cookies (item 73), que precisa
   ser opt-in. Este é só informativo e permanente.

## Regras obrigatórias

- Não alterar o teor jurídico do texto aprovado acima — só ajustar
  formatação/posicionamento visual.
- Não remover a cláusula equivalente já existente em `/terms` — os dois
  convivem (um é o documento completo, outro é o lembrete persistente).

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot mostrando o banner visível numa tela de cálculo (ex:
   Screener) nos 3 idiomas

## Ao terminar

Atualizar `docs/SSOT.md`, item 4 da tabela de pendências — marcar como
resolvido, o que **desbloqueia** o início de qualquer trabalho futuro na
Fase 4 (IRPF). Trabalhar em `dev`.
