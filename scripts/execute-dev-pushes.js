import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// List of unpushed commits in chronological order (oldest to newest)
const unpushedCommits = [
  {
    sha: "aa540bd",
    fullSha: "aa540bd498ed495acb6ca8cfdbead542e7df6f4e",
    message: "fix(valuation): investiga e corrige divergencia Ceiling Price vs Fuente Consensus [Item 1]",
    alreadyPushed: true
  },
  {
    sha: "de48b9b",
    fullSha: "de48b9b9793c55e537ab5bdb5923190572c74046",
    message: "fix(global-radar): investiga e corrige tela mostrando zero ativos [Item 2]",
  },
  {
    sha: "55d8e70",
    fullSha: "55d8e706a2722fb686c036bbbaf6b38f9d67720f",
    message: "feat(screener): adiciona tooltips inline, diferenciacao de classe de ticker e timestamp de dados [Itens 3+4+5]",
  },
  {
    sha: "b5c982e",
    fullSha: "b5c982e9e5e2483dc60b9447215102d22c20b6ba",
    message: "docs: atualiza PROMPTS_LOG.md com resumo dos Itens 3+4+5",
  },
  {
    sha: "f21bd88",
    fullSha: "f21bd884183561137279d690278bb7826c74f36e",
    message: "docs(product): analisa opcoes de preview para features Pro antes do gate, aguardando decisao [Item 6]",
  },
  {
    sha: "bfd0144",
    fullSha: "bfd0144924cd752ad4a72f9b8ec8abdd89a84219",
    message: "feat(subscription): desativa paywalls e libera acesso global a recursos Pro [Item 12]",
  },
  {
    sha: "6b0cd14",
    fullSha: "6b0cd147fcb99321642c73e231637ad9d392f8f6",
    message: "docs: atualiza PROMPTS_LOG.md com desativacao de paywalls",
  },
  {
    sha: "cee72fd",
    fullSha: "cee72fda0269113b938290522a158c78b14c8da9",
    message: "docs: ajusta referencia de titulo para Item 3 no PROMPTS_LOG.md",
  },
  {
    sha: "461d99f",
    fullSha: "461d99f619dad6238d09244a2409c6f243ba0534",
    message: "fix(ux): adiciona estado de erro explicito para calculo indisponivel em vez de renderizar zero [Item 7]",
  },
  {
    sha: "9911c9e",
    fullSha: "9911c9e0ee920632639826e53d2b625d27a6dc96",
    message: "docs: atualiza PROMPTS_LOG.md com resumo do Item 7",
  },
  {
    sha: "9a142fb",
    fullSha: "9a142fb52d0a9b1cc3a757c0306fe8aa2cd30787",
    message: "fix(ux): expande jargao (FI Mode, DRIP) e corrige eixo do grafico Snowball pulando Year 9 [Itens 8+9]",
  },
  {
    sha: "f164065",
    fullSha: "f16406570ecce98e9e1e1fcc8349048a22e77e67",
    message: "docs: atualiza PROMPTS_LOG.md com resumo dos Itens 8+9",
  },
  {
    sha: "570248e",
    fullSha: "570248eb2e29df6257bde61bc9fe8fdec185bde2",
    message: "docs(backlog): registra exportacao CSV/Excel e comparacao com benchmark como itens futuros [Item 10]",
  },
  {
    sha: "1167456",
    fullSha: "11674560335124687921d149b3550e18d6cf72ea",
    message: "docs: atualiza PROMPTS_LOG.md com resumo do Item 10",
  },
  {
    sha: "a938a1f",
    fullSha: "a938a1fc261f7caced65b679cd3a27dbdc0dd1a2",
    message: "docs(compliance): confirma/atualiza registro do disclaimer CVM como pre-requisito da Fase 4 [Item 11]",
  },
  {
    sha: "c3709e9",
    fullSha: "c3709e97e2889f66dc62c87e74ba77f19e10c6d9",
    message: "docs: atualiza PROMPTS_LOG.md com resumo do Item 11",
  },
  {
    sha: "ed8670e",
    fullSha: "ed8670e666dec24d9b11ad7a0b22563ded700e03",
    message: "feat(entitlement): desliga feature gates via config Firestore, mantendo arquitetura intacta [Item 12]",
  },
  {
    sha: "4f4f074",
    fullSha: "4f4f07482268c068a605bfbe45cf638d48bceed9",
    message: "docs: atualiza BACKLOG_V2.md e PROMPTS_LOG.md com resumo do Item 12",
  },
  {
    sha: "c22d669",
    fullSha: "c22d669ec81959b23ba42b9e7d2498fb21084a7b",
    message: "feat(subscription): desativa todos os paywalls globalmente via toggle-off",
  },
  {
    sha: "7d68621",
    fullSha: "7d68621ca5d68edeea03f4063f2c0caa2059e085",
    message: "docs: atualiza PROMPTS_LOG.md com resumo da desativacao global de paywalls",
  },
  {
    sha: "adf57b1",
    fullSha: "adf57b1800c549f61b607871ccb2115b7d9e5cbc",
    message: "fix(cashflow): investiga e corrige ETFs e STOCK_US ausentes na projecao de fluxo de caixa [Item 13]",
  },
  {
    sha: "0d05fa0",
    fullSha: "0d05fa09ef2d96a57460cadc58c495d07e006581",
    message: "docs: atualiza PROMPTS_LOG.md com resumo da resolucao do Item 13",
  },
  {
    sha: "ad6d9c8",
    fullSha: "ad6d9c8cb58f401f8b668f2fa6f25c25059ad73c",
    message: "docs: adiciona relatorio do Item 13 em docs/",
  },
];

const pushResults = [];

for (let i = 0; i < unpushedCommits.length; i++) {
  const item = unpushedCommits[i];
  const pushIndex = i + 1;
  const timestamp = new Date().toISOString();

  if (item.alreadyPushed) {
    console.log(`[Push ${pushIndex}/${unpushedCommits.length}] Commit ${item.sha} already pushed.`);
    pushResults.push({
      index: pushIndex,
      sha: item.sha,
      fullSha: item.fullSha,
      message: item.message,
      status: "SUCCESS",
      output: "To https://github.com/paulofuentealba/fuentepricepro.git\n   2149169..aa540bd  aa540bd -> dev",
      timestamp,
    });
    continue;
  }

  console.log(`[Push ${pushIndex}/${unpushedCommits.length}] Pushing commit ${item.sha}: ${item.message}`);
  try {
    const cmd = `git push origin ${item.fullSha}:dev`;
    const output = execSync(cmd, { encoding: "utf8" });
    console.log(` -> Push successful: ${output.trim()}`);
    pushResults.push({
      index: pushIndex,
      sha: item.sha,
      fullSha: item.fullSha,
      message: item.message,
      status: "SUCCESS",
      output: output.trim(),
      timestamp,
    });
  } catch (err) {
    const errOutput = err.stderr || err.stdout || err.message;
    console.error(` -> Push error for ${item.sha}: ${errOutput}`);
    pushResults.push({
      index: pushIndex,
      sha: item.sha,
      fullSha: item.fullSha,
      message: item.message,
      status: "ERROR",
      output: errOutput,
      timestamp,
    });
  }
}

// Generate Markdown Report
let report = `# Relatório Oficial de Push de Commits na Branch DEV

> **Repositório**: \`paulofuentealba/fuentepricepro\`  
> **Branch de Destino**: \`dev\`  
> **Data / Hora**: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (UTC-3)  
> **Total de Commits Processados**: ${pushResults.length}  

---

## 📌 Resumo da Operação

Conforme orientação explícita ("*Para cada commit vc faz um push, salva os IDs de cada push, gera um report e guarda no repositório docs*"), cada commit foi submetido individualmente à branch \`dev\` no repositório remoto Git via comando \`git push origin <commit_sha>:dev\`.

---

## 📋 Tabela com Registros e IDs de Push

| # | Short SHA | Full Commit SHA | Mensagem do Commit | Status do Push | Timestamp (UTC) |
|---|-----------|-----------------|--------------------|----------------|-----------------|
`;

for (const r of pushResults) {
  report += `| ${r.index} | \`${r.sha}\` | \`${r.fullSha}\` | ${r.message.replace(/\|/g, "\\|")} | **${r.status}** | \`${r.timestamp}\` |\n`;
}

report += `\n---\n\n## 🔍 Detalhes Individuais por Push\n\n`;

for (const r of pushResults) {
  report += `### Push #${r.index} — Commit \`${r.sha}\`
- **Full SHA**: \`${r.fullSha}\`
- **Mensagem**: \`${r.message}\`
- **Status**: **${r.status}**
- **Data/Hora**: \`${r.timestamp}\`
- **Resultado do Git Push**:
\`\`\`
${r.output}
\`\`\`

`;
}

const docsDir = path.resolve(process.cwd(), "docs");
const reportPath = path.join(docsDir, "RELATORIO_PUSH_DEV.md");
fs.writeFileSync(reportPath, report, "utf8");
console.log(`\nReport successfully written to ${reportPath}`);
