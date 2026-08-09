# Item 6 (Opção B): Preview Pro com Dados Reais Borrados

> [!NOTE]
> Implementação do modelo de exibição do **Preview Pro com Dados Reais Borrados** (Opção B do Item 6) nas rotas bloqueadas por paywall (`/app/cashflow` e `/app/smartallocation`).

---

## 1. O que Foi Implementado

### Componente `BlurredPreviewOverlay` (`src/components/ceiling/BlurredPreviewOverlay.tsx`)
- **Camada de Dados do Usuário ao Fundo**: Renderiza a interface real com a carteira e dados do próprio usuário sob um efeito de desfoque responsivo (`filter blur-[6px] sm:blur-[8px] opacity-40 pointer-events-none select-none`).
- **Bloqueio de Interatividade**: Garante via CSS (`pointer-events-none`) que o usuário não consiga clicar nem interagir com os dados borrados ao fundo.
- **Card de Conversão em Glassmorphism**: Renderiza sobreposto em posição central um card com efeito glassmorphism (`bg-background/90 backdrop-blur-xl border border-primary/20 shadow-2xl`), contendo:
  - Ícone de destaque com animação sutil.
  - Título e descrição do recurso Pro.
  - 3 bullet points de valor com ícones de verificação.
  - Botão de CTA ("Desbloquear Acesso Pro") que aciona o modal de autenticação ou assinatura.
  - Legenda de garantia e acesso imediato.
- **Responsividade Mobile**: Layout responsivo (`max-w-md w-[94%]`), adaptado para viewports estreitas (a partir de 375px) com área de toque confortável.

---

## 2. Pontos de Integração

1. **Rota de Cash Flow (`src/routes/app/cashflow.tsx`)**:
   - Substituída a renderização estática do `LockedPanel` pelo `<BlurredPreviewOverlay feature="cashflow">`.
2. **Rota de Smart Allocation (`src/routes/app/smartallocation.tsx`)**:
   - Substituída a renderização estática do `LockedPanel` pelo `<BlurredPreviewOverlay feature="smartallocation">`.
3. **i18n Multi-Idioma (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`)**:
   - Adicionadas chaves `previewOverlay.*` para PT-BR, EN e ES sem strings soltas em hardcode.

---

## 3. Estado de Produção (`DISABLE_PAYWALLS = true`)

> [!IMPORTANT]
> **Status com Paywalls Desativados em Produção**: Como `DISABLE_PAYWALLS = true` permanece ativo no documento de configuração em produção, `isPro` avalia como `true` para todos os usuários e os dados continuam totalmente acessíveis sem nenhum desfoque visual.
> O desfoque e o card de conversão serão exibidos **automaticamente** assim que a flag de paywalls for revertida no futuro, sem necessidade de alterações no código.

---

## 4. Evidências de Validação

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **150 passed** | 4 skipped (25 arquivos de teste aprovados).
3. **`npm run build`**: Client e SSR compilados sem erros.

---

## 5. Registro de Commit

- **Título do Commit**: `Prompt para Antigravity — Item 6, Opção B: Preview Pro com Dados Reais Borrados`
- **Mensagem no Git**: `feat(preview): implementa preview Pro com dados reais borrados (Opcao B do Item 6)`
- **Commit Short SHA**: `2e1acdd`
- **Commit Full SHA**: `2e1acdd4c8fcf586dd80a84511cd88c0cd4bfeef`
