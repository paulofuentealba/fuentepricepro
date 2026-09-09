import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/metrics`;
const PAGE_TITLE = "Metricas de Dividendos: Margem de Seguranca, YoC, CAGR | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Guia completo das principais metricas de dividendos: margem de seguranca, yield on cost (YoC), payout ratio, CAGR e DY vs YoC. Aprenda a interpretar cada indicador.";

export const Route = createFileRoute("/guides/metrics")({
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
              name: "O que e a margem de seguranca no investimento em dividendos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A margem de seguranca e a diferenca percentual entre o preco teto calculado e o preco atual de mercado. Quanto maior a margem, mais barata esta a acao em relacao ao seu valor justo. Exemplo: preco teto R$ 40,00, preco atual R$ 32,00, margem de seguranca de 20%.",
              },
            },
            {
              "@type": "Question",
              name: "Qual a diferenca entre Dividend Yield (DY) e Yield on Cost (YoC)?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Dividend Yield (DY) e calculado sobre o preco atual de mercado. Yield on Cost (YoC) e calculado sobre o preco medio de compra do investidor. Para quem comprou uma acao ha anos a um preco baixo, o YoC pode ser muito superior ao DY atual - revelando a qualidade real do investimento ao longo do tempo.",
              },
            },
            {
              "@type": "Question",
              name: "O que e um payout ratio saudavel para dividendos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O payout ratio saudavel varia por setor. Para empresas industriais e de consumo, um payout entre 40% e 70% e considerado sustentavel. Acima de 100% significa que a empresa paga mais em dividendos do que lucra - sinal de alerta. FIIs sao obrigados por lei a distribuir no minimo 95% do resultado.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="metrics" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
