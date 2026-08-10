### 39 — Validar/corrigir mobile-first nas abas do AssetDetailSheet (Tarefas 35/37) ✅ CONCLUÍDO (correção verificada no código: text-xs sm:text-sm px-2 sm:px-3 aplicado nos 4 TabsTrigger, tabs.tsx global intocado; validado por análise de código/CSS, NÃO por screenshot real — Antigravity relatou honestamente não ter navegador acoplado nesse ambiente; recomendado teste visual real no celular do usuário como confirmação final)

Pergunta do usuário: as novas abas e mudanças das Tarefas 35-37 foram
pensadas mobile-first? Resposta após revisar o código: parcialmente —
`Sheet` usa `w-full sm:max-w-2xl` (correto) e `TabsList` usa `grid-cols-2
lg:grid-cols-4` (correto), mas `TabsTrigger` (src/components/ui/tabs.tsx)
tem `whitespace-nowrap`, e os rótulos em pt-BR ("Minha Posição",
"Transações") são relativamente longos — risco real de corte/aperto em
tela estreita (320-375px) que nunca foi testado ao vivo.

```
39 — Validar/corrigir mobile-first nas abas do AssetDetailSheet

Contexto: AssetDetailSheet.tsx (Tarefa 37) usa Tabs do shadcn/ui 
(src/components/ui/tabs.tsx) com TabsList em grid-cols-2 lg:grid-cols-4. 
O TabsTrigger tem whitespace-nowrap, e os rótulos em pt-BR incluem 
"Minha Posição" e "Transações" (mais longos que os equivalentes em 
inglês). Isso nunca foi testado numa viewport mobile real.

TAREFA:

1. Testar ao vivo em pelo menos 2 larguras de viewport mobile reais 
   (DevTools do Chrome, modo responsivo): 375px (iPhone SE/padrão 
   pequeno) e 320px (o menor comum ainda em uso). Testar nos 3 idiomas 
   (en, pt-BR, es), já que os rótulos têm tamanhos diferentes por 
   idioma. Testar tanto um ativo normal (4 abas) quanto um FIXED_INCOME 
   (2 abas).

2. Reportar especificamente: os 4 rótulos das abas ficam legíveis por 
   completo, sem cortar texto, sem quebrar o grid, sem overflow 
   horizontal da sheet inteira? Tirar screenshot de cada cenário como 
   evidência no relatório.

3. SE houver corte/aperto real em qualquer um dos cenários acima, 
   corrigir — escolher a abordagem mais simples entre estas (nessa 
   ordem de preferência, parar na primeira que resolver sem quebrar o 
   visual):
   a) Reduzir o font-size do TabsTrigger especificamente dentro do 
      AssetDetailSheet (via className local, não mudar o componente 
      global tabs.tsx e afetar outras telas que possam vir a usá-lo).
   b) Encurtar os rótulos em telas pequenas (ex: "My Position" → 
      "Position" só abaixo de um breakpoint, usando texto diferente 
      condicionalmente ou abreviação) — se fizer isso, adicionar as 
      chaves i18n necessárias pros 3 idiomas, não hardcode.
   c) Trocar pra ícone + tooltip em vez de texto completo em telas 
      muito pequenas (< 375px) — só usar essa opção se as duas 
      anteriores não resolverem bem, já que reduz clareza.

4. Confirmar também, nos mesmos testes de viewport, que a tabela 
   paginada de Dividends History (Tarefa 37) e os cards de resumo 
   pessoal (Last Received / Past 12 Months, grid-cols-2) não têm o 
   mesmo problema de corte em texto/número — reportar mesmo que não 
   precise de correção.

NÃO TOCAR: não mexer no componente tabs.tsx de forma global se a 
correção puder ficar local ao AssetDetailSheet — outras partes do app 
podem vir a usar Tabs no futuro e não devem herdar uma mudança pensada 
só pra essa tela.

CRITÉRIO DE SUCESSO: screenshots em 320px e 375px, nos 3 idiomas, 
mostrando as 4 abas (e as 2 de Renda Fixa) totalmente legíveis, sem 
corte de texto nem overflow horizontal da sheet; tabela e cards de 
resumo confirmados sem problema equivalente.
```