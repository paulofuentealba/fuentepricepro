### 20 — Documentar a fragilidade do fallback de classificação ⚪

```
20 — Documentar a fragilidade do fallback de classificação

Contexto: em classify.ts, o fallback pro sufixo "11" usa uma lista de
exceções crescendo à mão (!s.startsWith("TAEE"), "KLBN", "SANB", "TIET",
"ALUP", "SULA", "ENGI", "BIDI", "BPAC"). Funciona porque o apiType da API
cobre a maioria dos casos primeiro, mas qualquer ação nova terminada em
"11" que não esteja na lista cai no bug de classificação errada se a API
não retornar o tipo.

TAREFA: não é pra reescrever a lógica agora — é só documentar isso
claramente com um comentário no código acima da lista de exceções,
explicando a limitação e o porquê dela existir, pra quem mexer nesse código
no futuro entender o risco sem precisar redescobrir.

CRITÉRIO DE SUCESSO: comentário claro no código explicando a limitação
conhecida do fallback.
```

---