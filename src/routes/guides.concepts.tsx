import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/concepts`;
const PAGE_TITLE = "Efeito Bola de Neve e Impostos em Dividendos | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Entenda o efeito bola de neve no reinvestimento de dividendos e como os impostos afetam seus proventos no Brasil. Guia pratico para investidores de longo prazo.";

export const Route = createFileRoute("/guides/concepts")({
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
              name: "O que e o efeito bola de neve nos investimentos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O efeito bola de neve ocorre quando os dividendos recebidos sao reinvestidos na compra de mais acoes, que por sua vez geram mais dividendos. Com o tempo, o crescimento se torna exponencial - quanto mais tempo o dinheiro fica investido e reinvestido, maior a bola de neve de renda passiva.",
              },
            },
            {
              "@type": "Question",
              name: "Dividendos de acoes brasileiras pagam imposto de renda?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Atualmente, dividendos de acoes brasileiras (ON e PN) sao isentos de Imposto de Renda para pessoa fisica. Juros sobre Capital Proprio (JCP) sofrem retencao na fonte de 15%. Proventos de FIIs sao isentos para PF quando a cota e negociada em bolsa e o fundo tem mais de 50 cotistas. Sempre consulte um contador para sua situacao especifica.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="concepts" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
