import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/gordon`;
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";
const PAGE_TITLE = "Modelo de Gordon de Crescimento de Dividendos | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Aprenda o Modelo de Crescimento de Gordon (DDM): P0 = D1 / (k - g). Calcule o preco justo de acoes com crescimento constante de dividendos e taxa de desconto.";

export const Route = createFileRoute("/guides/gordon")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
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
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
            { "@type": "ListItem", position: 3, name: "Gordon", item: PAGE_URL },
          ],
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
              name: "O que e o Modelo de Crescimento de Gordon?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O Modelo de Gordon (DDM - Dividend Discount Model) calcula o preco justo de uma acao com dividendos crescentes: P0 = D1 / (k - g), onde D1 e o proximo dividendo esperado, k e a taxa de desconto do investidor e g e a taxa de crescimento perpetuo dos dividendos. E valido apenas quando k > g.",
              },
            },
            {
              "@type": "Question",
              name: "Qual e a diferenca entre o Modelo de Gordon e o metodo Bazin?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O metodo Bazin usa a media historica de proventos dividida por um yield alvo fixo (6%) - e simples e backward-looking. O Modelo de Gordon usa o dividendo futuro esperado e uma taxa de crescimento - e forward-looking e mais sensivel a premissas de longo prazo. O Fuente Price Pro calcula ambos e exibe o consenso.",
              },
            },
            {
              "@type": "Question",
              name: "Quando o Modelo de Gordon nao funciona?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O Modelo de Gordon nao e valido quando: (1) a empresa nao paga dividendos, (2) a taxa de crescimento g e maior ou igual a taxa de desconto k, ou (3) os dividendos sao instaveis (ex: ciclicos ou em declinio). Nestes casos, o preco calculado nao tem significado economico.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="gordon" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
