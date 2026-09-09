import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/brokers`;
const PAGE_TITLE = "Corretoras Suportadas: XP, BTG, Inter, Schwab | Fuente Price Pro";
const PAGE_DESCRIPTION =
  "Confira todas as corretoras suportadas pelo Fuente Price Pro para importacao de notas de corretagem: XP, Clear, Rico, BTG Pactual, Banco Inter, NuInvest, Schwab e mais.";

export const Route = createFileRoute("/guides/brokers")({
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
              name: "Quais corretoras brasileiras sao suportadas pelo Fuente Price Pro?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O Fuente Price Pro suporta importacao nativa de notas de corretagem SINACOR das seguintes corretoras: XP Investimentos, Clear, Rico, Modal, BTG Pactual, Banco Inter, NuInvest, Orama e Genial Investimentos. A importacao e feita via PDF da nota de corretagem.",
              },
            },
            {
              "@type": "Question",
              name: "O Fuente Price Pro suporta corretoras internacionais?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim. O Fuente Price Pro suporta importacao do extrato CSV da Charles Schwab International Account, permitindo o acompanhamento de acoes americanas (NYSE, NASDAQ) e ETFs internacionais na mesma carteira que seus ativos brasileiros.",
              },
            },
            {
              "@type": "Question",
              name: "O que e o padrao SINACOR para notas de corretagem?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "SINACOR e o Sistema Integrado de Compensacao e Liquidacao da B3. As notas de corretagem no padrao SINACOR seguem um layout padronizado que permite ao Fuente Price Pro identificar automaticamente as operacoes de compra e venda, taxas e ativos negociados.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="brokers" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
