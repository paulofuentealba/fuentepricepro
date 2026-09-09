import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/bazin`;
const PAGE_TITLE = "Metodo Bazin de Preco Teto - Calculo de Dividendos | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Aprenda o metodo Bazin para calcular o preco teto de acoes de dividendos. Formula passo a passo: preco teto = media de proventos dos ultimos 5 anos dividido pelo yield alvo (6%).";

export const Route = createFileRoute("/guides/bazin")({
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
              name: "O que e o metodo Bazin de preco teto?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O metodo Bazin, popularizado por Decio Bazin em 'Faca Fortuna com Acoes', calcula o preco maximo a pagar por uma acao de dividendos dividindo a media de proventos anuais dos ultimos 5 anos pelo yield minimo desejado pelo investidor.",
              },
            },
            {
              "@type": "Question",
              name: "Como calcular o preco teto pelo metodo Bazin?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Preco Teto Bazin = Media de Proventos Anuais (ultimos 5 anos) / Yield Alvo. Exemplo: se a acao pagou em media R$ 2,00 por ano e seu yield alvo e 6%, o preco teto e R$ 2,00 / 0,06 = R$ 33,33.",
              },
            },
            {
              "@type": "Question",
              name: "Por que Decio Bazin usava 6% como yield minimo?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Bazin definia 6% como o retorno minimo em dividendos para que a acao justificasse o risco de renda variavel frente a renda fixa. Acima desse yield, a acao esta abaixo do preco teto e pode ser considerada compra. Abaixo, esta cara.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="bazin" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
