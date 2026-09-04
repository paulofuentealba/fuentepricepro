import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/dividend-valuation`;
const PAGE_TITLE = "Dividend Yield Formula & Bazin Ceiling Price Guide";
const PAGE_DESCRIPTION =
  "Learn how to calculate the ceiling price of a dividend stock with the Bazin method. Step-by-step dividend yield formula, worked examples, and edge cases.";

export const Route = createFileRoute("/guides/dividend-valuation")({
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
              name: "What is the dividend yield formula?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Dividend yield = (annual dividend per share ÷ current share price) × 100. It tells you the cash return a stock pays relative to its price.",
              },
            },
            {
              "@type": "Question",
              name: "How do you calculate the ceiling price of a dividend stock?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Using the Bazin method: ceiling price = average annual dividend of the last 5 years ÷ target dividend yield. If a stock paid an average of $2 and you want a 6% yield, the ceiling price is $2 / 0.06 = $33.33.",
              },
            },
            {
              "@type": "Question",
              name: "What is the Bazin method?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "The Bazin method, popularized by Décio Bazin, values a dividend stock by dividing its average dividend by the investor's minimum acceptable yield — producing a ceiling price above which the stock is considered overpriced.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: () => <GuidesPage defaultTab="dividend-valuation" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
