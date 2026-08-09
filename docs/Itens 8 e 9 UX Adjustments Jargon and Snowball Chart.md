# Itens 8 + 9: Ajustes de UX (Expansão de Jargões e Eixo do Gráfico Snowball)

> [!NOTE]
> Relatório detalhado dos ajustes de usabilidade: expansão de termos técnicos (FI Mode, DRIP) nos 3 idiomas e correção de exibição contínua no eixo X do gráfico de Simulação Bola de Neve (Snowball Simulator).

---

## 1. Item 8: Expansão de Jargão na Primeira Menção

### A. Diagnóstico e Causa Raiz
- **FI Mode**: O botão de ativação na home do portfólio exibia `"Ativar Modo IF para ver progresso"` / `"Activate FI Mode to see progress"`, sem explicitar a sigla IF/FI para investidores iniciantes.
- **DRIP**: A chave da opção de reinvestimento de proventos no Snowball Simulator exibia apenas `"Reinvestir Dividendos (DRIP)"`, omitindo o significado do plano de reinvestimento automático.

### B. Correção Aplicada (Suporte Multilíngue em `dict.*.ts`)
1. **`fiMode.activate`**:
   - **PT-BR**: `"Ativar Modo IF (Independência Financeira) para ver progresso"`
   - **EN**: `"Activate FI Mode (Financial Independence) to see progress"`
   - **ES**: `"Activar el Modo IF (Independencia Financiera) para ver el progreso"`
2. **`snowball.reinvestDrip`**:
   - **PT-BR**: `"Reinvestir Dividendos (DRIP — Reinvestimento Automático de Dividendos)"`
   - **EN**: `"Reinvest Dividends (DRIP — Dividend Reinvestment Plan)"`
   - **ES**: `"Reinvertir Dividendos (DRIP — Plan de Reinversión de Dividendos)"`

---

## 2. Item 9: Correção do Eixo do Gráfico Snowball (Year 9 / Ano 9)

### A. Diagnóstico da Causa Raiz
- **Local do Bug**: [`src/components/ceiling/SnowballSimulator.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/SnowballSimulator.tsx) (linha 205).
- **Mecanismo da Falha**: O Recharts no componente `<XAxis dataKey="year">` utilizava o algoritmo padrão de detecção de colisão de rótulos com `preserveEnd`. Ao renderizar 10 pontos de dados com rótulos como `"Ano 1"` a `"Ano 10"`, a largura total excedia ligeiramente a área útil e o Recharts omitia automaticamente o último rótulo intermediário antes do final (que é precisamente o **Ano 9** / **Year 9**).

### B. Correção Aplicada
- Adicionada a propriedade `interval={0}` e ajustado o tamanho da fonte para `fontSize={10}` em `<XAxis>` em `SnowballSimulator.tsx`.
- Forçada a renderização determinística e sequencial de todos os anos da série temporal (Ano 1 a Ano 10) sem supressão de rótulos.

---

## 3. Evidências Literais de Validação

> [!TIP]
> Executados e aprovados com sucesso todos os 3 gates de qualidade.

1. **Gate 1 — TypeScript Check**:
   - Comando: `npx tsc --noEmit`
   - Resultado: **0 erros** (Exit Code 0).

2. **Gate 2 — Testes Unitários (Vitest)**:
   - Comando: `npm run test`
   - Resultado: **146 passed** | 4 skipped (25 arquivos de teste aprovados).

3. **Gate 3 — Production Build**:
   - Comando: `npm run build`
   - Resultado: Client (4097 módulos em 1.37s) e SSR (251 módulos em 765ms) compilados sem erros.

---

## 4. Registros de Git e Logs

- **Commit de Código**: `fix(ux): expande jargao (FI Mode, DRIP) e corrige eixo do grafico Snowball pulando Year 9 [Itens 8+9]`
- **PROMPTS_LOG.md**: Atualizado em `docs/PROMPTS_LOG.md`.
