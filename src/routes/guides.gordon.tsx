import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/components/guides/GuidesPage";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { dict, type Locale } from "@/lib/i18n";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/guides/gordon`;
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

export const Route = createFileRoute("/guides/gordon")({
  validateSearch: (search: Record<string, unknown>): { lang?: Locale } => ({
    lang: isValidLocale(search.lang) ? search.lang : undefined,
  }),
  loaderDeps: ({ search }) => ({ lang: search.lang }),
  loader: ({ deps }) => ({ locale: (deps.lang ?? "ptBR") as Locale }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? "ptBR";
    const S = dict[locale].seoGuides.gordon;

    return {
      meta: [
        { title: S.title },
        { name: "description", content: S.description },
        { property: "og:title", content: S.title },
        { property: "og:description", content: S.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: urlFor(locale) },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: S.title },
        { name: "twitter:description", content: S.description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [
        { rel: "canonical", href: urlFor(locale) },
        ...ALL_LOCALES.map((l) => ({ rel: "alternate", hrefLang: HREFLANG[l], href: urlFor(l) })),
        { rel: "alternate", hrefLang: "x-default", href: PAGE_URL },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: S.title,
            description: S.description,
            mainEntityOfPage: urlFor(locale),
            inLanguage: HREFLANG[locale],
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
              { "@type": "ListItem", position: 3, name: "Gordon", item: urlFor(locale) },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: S.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        },
      ],
    };
  },
  component: () => <GuidesPage defaultTab="gordon" />,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});
