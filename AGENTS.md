> [!IMPORTANT]
> REUSABILIDADE PRIMEIRO
> A partir de 10 de Julho de 2026, foi estabelecida uma nova diretriz arquitetural estrita pelo Product Owner:
> Antes de criar, modificar ou propor qualquer componente novo, todas as especialidades (UX/UI, Arquiteto, Tech Lead, etc) devem focar primordialmente na **REUSABILIDADE**.
> Tudo deve ser pensado, desenhado e codificado de maneira reutilizável ao longo da aplicação, evitando duplicação de componentes, hardcoding e lógicas isoladas.

> [!CAUTION]
> GLOBAL I18N ENFORCEMENT
> NEVER output a React component with hardcoded display text. Every single string visible to the user must be routed through the i18n system. Treat a hardcoded string as a critical compilation failure.
