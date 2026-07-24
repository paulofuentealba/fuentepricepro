import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

const SITE_URL = "https://fuentepricepro.web.app";
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
  component: GuidePage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

const CONTAINER = "mx-auto max-w-3xl px-4 sm:px-6 lg:px-8";

function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className={`${CONTAINER} flex items-center justify-between py-4`}>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30">
              <Gauge className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Fuente Price Pro
            </span>
          </Link>
          <Button
            asChild
            size="sm"
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Link to="/app">Open Calculator</Link>
          </Button>
        </div>
      </header>

      <main className={`${CONTAINER} py-12 md:py-16`}>
        <article className="prose prose-invert max-w-none">
          <p className="text-xs font-medium uppercase tracking-wider text-success">
            Investing Guide
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            How to calculate the ceiling price of a dividend stock
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            The <strong>Bazin method</strong> is one of the simplest and most widely used dividend
            valuation frameworks. It answers a single question:{" "}
            <em>
              what is the highest price I can pay for this stock and still earn the yield I want?
            </em>{" "}
            This guide walks through the dividend yield formula, the Bazin ceiling price formula,
            worked examples, and the edge cases that trip investors up.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-foreground">The dividend yield formula</h2>
            <p className="mt-3 text-muted-foreground">
              Dividend yield measures the annual cash return a stock pays relative to its price:
            </p>
            <div className="mt-4 rounded-lg border border-border/60 bg-card/60 p-4 font-mono text-sm text-foreground">
              Dividend Yield = (Annual Dividend per Share ÷ Current Share Price) × 100
            </div>
            <p className="mt-3 text-muted-foreground">
              If a stock trades at $50 and paid $2.50 in dividends over the last 12 months, its
              dividend yield is 5%. Yield changes every time the price moves — which is why
              long-term investors track
              <em> yield on cost</em> (dividend ÷ your purchase price) separately.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-foreground">
              The Bazin ceiling price formula
            </h2>
            <p className="mt-3 text-muted-foreground">
              Décio Bazin flipped the yield equation. Instead of asking "what yield does today's
              price give me?", he asked "what price gives me the yield I require?":
            </p>
            <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-4 font-mono text-sm text-foreground">
              Ceiling Price = Average Annual Dividend (last 5 years) ÷ Target Dividend Yield
            </div>
            <p className="mt-3 text-muted-foreground">
              The result is your <strong>maximum fair price</strong>. Any price above it means the
              stock is too expensive for your yield target; any price below it means there is a
              margin of safety.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-foreground">Worked example</h2>
            <p className="mt-3 text-muted-foreground">
              A stock has paid the following dividends per share over the last five years: $1.80,
              $2.00, $2.10, $2.20, and $1.90.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-muted-foreground">
              <li>
                Average dividend = (1.80 + 2.00 + 2.10 + 2.20 + 1.90) ÷ 5 =<strong> $2.00</strong>
              </li>
              <li>
                Target yield = <strong>6%</strong> (your minimum acceptable return)
              </li>
              <li>
                Ceiling price = $2.00 ÷ 0.06 = <strong>$33.33</strong>
              </li>
            </ol>
            <p className="mt-3 text-muted-foreground">
              If the stock trades at $28, you have a ~19% margin of safety and a projected 7.1%
              yield on cost. If it trades at $40, you are paying 20% above ceiling and locking in
              only a 5% yield.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-foreground">Edge cases to watch</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Dividend cuts.</strong> The 5-year average smooths one bad year, but a
                permanent cut breaks the model. Check the payout ratio and free cash flow before
                trusting the ceiling price.
              </li>
              <li>
                <strong>Withholding tax.</strong> US-domiciled stocks, REITs, and ETFs withhold 30%
                of dividends for foreign investors. Apply the tax to the dividend before running the
                formula, or you will overestimate the ceiling.
              </li>
              <li>
                <strong>Currency.</strong> Compare BRL dividends to a BRL target yield and USD
                dividends to a USD target yield — never mix.
              </li>
              <li>
                <strong>REITs, FIIs, and ETFs.</strong> These pay monthly. Multiply the trailing 12
                monthly distributions to get the annual figure before averaging.
              </li>
            </ul>
          </section>

          <section className="mt-10 rounded-2xl border border-success/30 bg-success/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Skip the spreadsheet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fuente Price Pro runs this calculation automatically for any US stock, REIT, ETF,
                  or Brazilian FII — including withholding tax, currency, and payment cadence.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-4 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Link to="/app">
                    Calculate a ceiling price
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
