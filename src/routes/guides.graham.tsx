import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/graham`;
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";
const PAGE_TITLE = "Formula de Graham para Valor Intrinseco de Acoes | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Entenda a formula de Benjamin Graham para calcular o valor intrinseco de uma acao: VI = raiz(22,5 x LPA x VPA). Aprenda quando aplicar e quais setores sao excecao.";

export const Route = createFileRoute("/guides/graham")({
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
            { "@type": "ListItem", position: 3, name: "Graham", item: PAGE_URL },
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
              name: "Qual e a formula de Graham para valor intrinseco?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A formula de Graham e: Valor Intrinseco = raiz(22,5 x LPA x VPA), onde LPA e o Lucro por Acao e VPA e o Valor Patrimonial por Acao. O numero 22,5 representa um P/L maximo de 15 multiplicado por um P/VPA maximo de 1,5, conforme definido por Benjamin Graham em 'O Investidor Inteligente'.",
              },
            },
            {
              "@type": "Question",
              name: "A formula de Graham funciona para bancos e FIIs?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Nao. A formula de Graham nao e aplicavel a instituicoes financeiras (bancos, seguradoras) nem a Fundos de Investimento Imobiliario (FIIs), pois suas estruturas de capital e contabilidade sao fundamentalmente diferentes das empresas industriais para as quais Graham a desenvolveu.",
              },
            },
            {
              "@type": "Question",
              name: "O que significa quando uma acao esta abaixo do valor de Graham?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Quando o preco de mercado de uma acao esta abaixo do Valor Intrinseco calculado pela formula de Graham, a acao e considerada subavaliada - ha uma margem de seguranca. Graham recomendava comprar com margem de seguranca de pelo menos 33% abaixo do valor intrinseco.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="graham" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
