### 24 — Firebase inicializando sem proteção contra re-execução (causa raiz de "preciso reiniciar toda vez") ✅ CONCLUÍDO E CONFIRMADO AO VIVO

Teste de fogo real feito por mim: dupliquei o import do toast em
DataManagement.tsx de propósito, confirmei o erro de parse disparando no
console do navegador, corrigi, e a aplicação voltou sozinha — grade de 23
ativos renderizada completa, zero erro de Firebase, sem precisar reiniciar
o processo manualmente.

```
Contexto: em src/integrations/firebase/client.ts, initializeApp() e
initializeFirestore() rodam incondicionalmente no escopo do módulo, sem
nenhuma checagem se já existe uma instância. Quando o Vite faz um "program
reload" da SSR (o que acontece sempre que há um erro de parse em qualquer
arquivo, ou certos tipos de HMR), esse módulo é reexecutado dentro do MESMO
processo Node que já tinha o Firebase inicializado antes, e a segunda
chamada de initializeFirestore() lança: "initializeFirestore() has already
been called with different options". Isso trava a SSR inteira (erro 500
swallowed), exigindo reiniciar o servidor manualmente — e vai continuar
acontecendo toda vez que qualquer erro de parse disparar um program reload,
não só desta vez.

TAREFA:
1. Em client.ts, trocar `export const app = initializeApp(firebaseConfig)`
   por uma versão que verifica se já existe um app antes de inicializar:
   usar getApps() (de "firebase/app") — se getApps().length > 0, usar
   getApp() em vez de chamar initializeApp() de novo
2. Para o Firestore, envolver initializeFirestore() em try/catch: se
   lançar erro de "already been called", usar getFirestore(app) (de
   "firebase/firestore") como fallback em vez de propagar o erro
3. Confirmar que isso não muda o comportamento em produção (onde o módulo
   só carrega uma vez por processo normalmente) — é uma proteção que só
   deveria mudar comportamento no cenário de HMR/reload do dev server
4. Depois de aplicar, testar especificamente o cenário que causou o bug:
   provocar um erro de parse de propósito (ex: duplicar um import), ver o
   Vite fazer o program reload, e confirmar que o Firebase NÃO quebra mais
   depois disso — sem precisar reiniciar o servidor manualmente

NÃO TOCAR: a configuração do Firebase em si (firebaseConfig) não muda, só
a forma como app/db são inicializados.

CRITÉRIO DE SUCESSO: provocar um erro de parse de propósito, deixar o Vite
fazer o program reload, e confirmar que a aplicação volta a funcionar
sozinha sem reiniciar o processo manualmente. Esse é o teste que realmente
prova que funcionou — não só tsc limpo.
```

---