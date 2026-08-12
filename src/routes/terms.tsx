import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";
import { legalContent, LEGAL_LAST_UPDATED } from "@/lib/legal-content";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/terms`;
const PAGE_TITLE = "Terms of Use — Fuente Price Pro";
const PAGE_DESCRIPTION =
  "The terms governing your use of Fuente Price Pro — read before you invest based on anything the platform shows you.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: TermsPage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

const CONTAINER = "mx-auto max-w-3xl px-4 sm:px-6 lg:px-8";
/** Marker in legal-content.ts §1 text, replaced with a real <Link> to /privacy. */
const PRIVACY_LINK_TOKEN = "{{privacyLink}}";

function TermsPage() {
  const { t, locale } = useI18n();
  const doc = legalContent[locale].terms;
  const privacyTitle = legalContent[locale].privacy.title;
  const lastUpdatedLabel = new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "long",
  }).format(new Date(LEGAL_LAST_UPDATED));

  function renderParagraph(text: string, key: number) {
    if (!text.includes(PRIVACY_LINK_TOKEN)) {
      return (
        <p key={key} className="leading-relaxed text-muted-foreground">
          {text}
        </p>
      );
    }
    const [before, after] = text.split(PRIVACY_LINK_TOKEN);
    return (
      <p key={key} className="leading-relaxed text-muted-foreground">
        {before}
        <Link to="/privacy" className="text-primary hover:underline">
          {privacyTitle}
        </Link>
        {after}
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className={`${CONTAINER} flex items-center justify-between py-4`}>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Gauge className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Fuente Price Pro
            </span>
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/">{t.legal.backToHome}</Link>
          </Button>
        </div>
      </header>

      <main className={`${CONTAINER} py-12 md:py-16`}>
        <article className="max-w-none">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.legal.lastUpdated}: {lastUpdatedLabel}
          </p>

          <div className="mt-10 space-y-10">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-m-24">
                <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
                <div className="mt-3 space-y-3">
                  {section.blocks.map((block, idx) =>
                    block.type === "p" ? (
                      renderParagraph(block.text, idx)
                    ) : (
                      <ul key={idx} className="list-disc space-y-2 pl-6 text-muted-foreground">
                        {block.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
            {t.legal.lastUpdated}: {lastUpdatedLabel} —{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              {privacyTitle}
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
