import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/glossary`;
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";
const PAGE_TITLE = "Glossario de Investimentos: FII, REIT, LPA, VPA, JCP | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Glossario completo para investidores de dividendos: FII, REIT, LPA (EPS), VPA (Book Value), JCP e mais. Definicoes claras para quem esta comecando a investir na B3.";

export const Route = createFileRoute("/guides/glossary")({
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
            { "@type": "ListItem", position: 3, name: "Glossary", item: PAGE_URL },
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
              name: "O que e um FII (Fundo de Investimento Imobiliario)?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "FII e um fundo que investe em ativos imobiliarios - galpoes logisticos, lajes corporativas, shoppings, CRIs - e distribui os rendimentos mensalmente aos cotistas. Sao negociados na B3 como acoes. Para PF com mais de 50 cotistas e cotas em bolsa, os rendimentos sao isentos de IR.",
              },
            },
            {
              "@type": "Question",
              name: "O que e REIT e qual a diferenca para FII?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "REIT (Real Estate Investment Trust) e o equivalente americano ao FII brasileiro. Ambos investem em imoveis e distribuem renda regularmente. A principal diferenca e que REITs americanos pagam dividendos em dolares e estao sujeitos a tributacao americana.",
              },
            },
            {
              "@type": "Question",
              name: "O que e LPA (Lucro por Acao)?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "LPA (Lucro por Acao) - EPS em ingles - e o lucro liquido da empresa dividido pelo numero de acoes em circulacao. E um dos principais indicadores de rentabilidade e e utilizado na formula de Graham para calculo do valor intrinseco.",
              },
            },
            {
              "@type": "Question",
              name: "O que e VPA (Valor Patrimonial por Acao)?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "VPA (Valor Patrimonial por Acao) - Book Value per Share em ingles - e o patrimonio liquido contabil da empresa dividido pelo numero de acoes. Representa o valor de liquidacao teorico por acao e e utilizado na formula de Graham junto com o LPA.",
              },
            },
            {
              "@type": "Question",
              name: "O que e JCP (Juros sobre Capital Proprio)?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "JCP e uma forma de remuneracao ao acionista brasileira, alternativa ao dividendo, que permite a empresa deduzir o pagamento do lucro tributavel. Para o acionista PF, o JCP sofre retencao na fonte de 15% de IR. E comum em bancos como Itau, Bradesco e BB.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="glossary" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
