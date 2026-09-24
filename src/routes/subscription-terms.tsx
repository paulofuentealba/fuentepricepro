import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";
import { legalContent, LEGAL_LAST_UPDATED } from "@/lib/legal-content";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/subscription-terms`;
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";

function isValidLocale(v: unknown): v is Locale {
  return v === "en" || v === "ptBR" || v === "es";
}

const HREFLANG: Record<Locale, string> = { ptBR: "pt-BR", en: "en", es: "es" };
const ALL_LOCALES: Locale[] = ["ptBR", "en", "es"];

function urlFor(locale: Locale): string {
  return locale === "ptBR" ? PAGE_URL : `${PAGE_URL}?lang=${locale}`;
}

const DESCRIPTION: Record<Locale, string> = {
  ptBR: "Termos de Assinatura do Fuente Price Pro — planos, cobrança e cancelamento.",
  en: "The terms governing your subscription to the Fuente Price Pro paid plan.",
  es: "Términos de Suscripción de Fuente Price Pro — planes, facturación y cancelación.",
};

export const Route = createFileRoute("/subscription-terms")({
  validateSearch: (search: Record<string, unknown>): { lang?: Locale } => ({
    lang: isValidLocale(search.lang) ? search.lang : undefined,
  }),
  loaderDeps: ({ search }) => ({ lang: search.lang }),
  loader: ({ deps }) => ({ locale: (deps.lang ?? "ptBR") as Locale }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? "ptBR";
    const title = `${legalContent[locale].subscriptionTerms.title} — Fuente Price Pro`;
    const description = DESCRIPTION[locale];

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: urlFor(locale) },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [
        { rel: "canonical", href: urlFor(locale) },
        ...ALL_LOCALES.map((l) => ({ rel: "alternate", hrefLang: HREFLANG[l], href: urlFor(l) })),
        { rel: "alternate", hrefLang: "x-default", href: PAGE_URL },
      ],
    };
  },
  component: SubscriptionTermsPage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

const CONTAINER = "mx-auto max-w-3xl px-4 sm:px-6 lg:px-8";
/** Marker in legal-content.ts §1 text, replaced with a real <Link> to /privacy. */
const PRIVACY_LINK_TOKEN = "{{privacyLink}}";

function SubscriptionTermsPage() {
  const { t, locale } = useI18n();
  const doc = legalContent[locale].subscriptionTerms;
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
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden md:inline-flex" />
            <Button asChild size="sm" variant="outline">
              <Link to="/">{t.legal.backToHome}</Link>
            </Button>
          </div>
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
