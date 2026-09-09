import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/risk-radar`;
const PAGE_TITLE = "Risk Radar: Concentracao, Payout e Yield Trap em Dividendos | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Identifique os principais riscos em carteiras de dividendos: concentracao setorial, concentracao por ativo, risco de payout e a armadilha do alto yield (yield trap).";

export const Route = createFileRoute("/guides/risk-radar")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          mainEntityOfPage: PAGE_URL,
          author: { "@type": "Organization", name: "Fuente Price Pro" },
          publisher: { "@type": "Organization", name: "Fuente Price Pro" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "O que e yield trap (armadilha de dividendos)?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yield trap ocorre quando uma acao apresenta dividend yield muito alto - aparentemente atraente - mas que e resultado de uma queda acentuada no preco da acao, e nao de um aumento real nos proventos. Investir nessa situacao pode significar comprar uma empresa em deterioracao que logo cortara os dividendos.",
              },
            },
            {
              "@type": "Question",
              name: "Como identificar risco de payout insustentavel?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Um payout ratio acima de 90-100% do lucro liquido e sinal de alerta em empresas nao-FII: a empresa esta distribuindo mais do que lucra, comprometendo a sustentabilidade dos dividendos. Verifique tambem a tendencia: payout crescente com lucros estagnados e mais perigoso do que payout alto com lucros crescentes.",
              },
            },
            {
              "@type": "Question",
              name: "Qual e a concentracao setorial maxima recomendada para uma carteira de dividendos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Nao existe regra unica, mas investidores conservadores costumam limitar cada setor a 20-30% da carteira. Alta concentracao em um setor (ex: mais de 40% em bancos ou energia eletrica) expoe o portfolio a riscos regulatorios e macroeconomicos setoriais que podem impactar todos os ativos ao mesmo tempo.",
              },
            },
            {
              "@type": "Question",
              name: "Como o Fuente Price Pro ajuda a identificar riscos na carteira?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O Risk Radar do Fuente Price Pro analisa automaticamente sua carteira e sinaliza: concentracao excessiva por setor ou por ativo, payout ratio elevado, yield muito acima da media do setor (possivel yield trap) e acoes acima do preco teto - exibindo alertas visuais com cores semanticas.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="risk-radar" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
