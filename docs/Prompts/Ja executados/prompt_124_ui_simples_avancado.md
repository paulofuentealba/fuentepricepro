# PROMPT 124 — Item 1, Fase 2.6: UI Simples/Avançado (Premissas)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo comportamento mobile
(≤375px) explícito — plano sem isso será rejeitado (Regra 5).

CONTEXTO:
Todas as classes de ativo (Fases 2.1-2.5) já implementadas. ValuationResult
já retorna assumptions[] completo, com label/helperText/confidenceBadge já
resolvidos pelo backend para cada classe.

PRINCÍPIO NÃO-NEGOCIÁVEL (já aprovado por Paulo):
O frontend é EXCLUSIVAMENTE camada de exibição. Ele NUNCA calcula default,
NUNCA decide preset, NUNCA nomeia premissa, NUNCA calcula confidenceBadge.
O componente do Modo Avançado deve ser, na prática, um .map() sobre
assumptions[] recebido do backend — zero lógica de negócio no cliente.

ESCOPO:
- Toggle Simples/Avançado (segmented control, mobile: topo do card).
  Preferência do usuário PERSISTIDA no backend (Firestore), lida via hook —
  o frontend não decide o default sozinho na primeira visita (backend
  define o padrão inicial, ex: Simples).
- Modo Simples: preço-teto + helperText de uma linha + badge do preset
  ativo (Conservador/Moderado/Arrojado) sempre visível, mesmo sem
  interação.
- Modo Avançado: bottom sheet (padrão vaul do projeto) com sliders por
  item de assumptions[], badge de confiança (●●●○) renderizado a partir do
  confidenceBadge recebido, tap targets ≥48px.
- Edição de slider: envia { key, newValue } ao backend, backend recalcula
  ValuationResult completo, frontend substitui o DTO em cache (TanStack
  Query) — SEM recalcular localmente para "feedback instantâneo". Usar
  debounce + skeleton durante o round-trip.
- Ícone "por que esse número?" com popover usando token de glass já
  existente.
- Zero string hardcoded — todo texto (incluindo os que vêm como helperText
  do backend) passa pelo sistema i18n corretamente.

PROIBIDO:
- Qualquer cálculo de preço-teto, default, ou score de confiança no
  componente React.
- Modal centralizado cobrindo a tela inteira no mobile — usar bottom sheet.
- Tooltip como única forma de entender o dado principal (preço-teto em si
  deve ser claro sem precisar de tooltip; tooltip é só para a premissa por
  trás, no Modo Avançado).

ENTREGA:
Plano (com comportamento mobile explícito) → aprovação → implementação →
tsc/test/build limpos → capturas de tela mobile E desktop, Modo Simples e
Avançado.
```

---

## ADENDO — Toolkit (tooltip) nos ícones de método do Breakdown de Valuation

> Referência visual: card "Fuente Valuation Model" já existente no produto
> (Gordon/Bazin/Graham + Consensus central, cada um com um ícone no canto
> superior direito). Este adendo estende o ESCOPO acima — incluir no mesmo
> plano e implementação do Prompt 124, não como tarefa separada.

ESCOPO ADICIONAL:
- Cada ícone (Gordon, Bazin, Graham, e o ícone verde do Consensus) é o
  ANCHOR de um popover/tooltip (Radix, tokens do projeto).
- Direção de abertura: cards inferiores (Bazin/Graham) abrem o popover PARA
  CIMA; card superior (Gordon) abre PARA BAIXO; Consensus (central) abre
  centralizado abaixo. Nenhum popover pode cobrir o número dentro do
  próprio card de origem.
- Mobile (≤375px): tap no ícone abre bottom sheet curto (não popover
  flutuante) — mesmo padrão já definido para o restante desta tela.
- CONTEÚDO de cada tooltip vem 100% do backend (assumptions[]/helperText do
  ValuationResult, ADR-002) — o componente apenas renderiza, sem decidir
  texto:
  - Gordon: fórmula (D₁/(r-g)), valores de r e g aplicados, g derivado de
    ROE × (1-Payout), fonte e data do dado.
  - Bazin: fórmula (Provento líquido / Yield-alvo), yield-alvo aplicado,
    indicação se o provento é JCP líquido (retenção 15% já descontada) ou
    dividendo isento, fonte e data.
  - Graham: fórmula (√(22,5 × LPA × VPA)), margem de segurança aplicada,
    fonte CVM e data do LPA/VPA usados.
  - Consensus: quais métodos entraram na mediana (varia por classe de
    ativo, não é sempre Bazin+Graham+Gordon) e o motivo de qualquer método
    excluído (ex: "Graham excluído — VPA não aplicável a esta classe").

PROIBIDO (adicional):
- Hardcode de qualquer texto explicativo no componente — todo conteúdo do
  tooltip vem do assumptions[]/helperText já resolvido pelo backend.
- Popover cobrindo o valor numérico do próprio card de origem.

ENTREGA (adicional):
Capturas de tela mostrando o popover aberto em pelo menos 2 dos 4 ícones
(um card lateral + o Consensus), mobile e desktop.
