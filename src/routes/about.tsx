import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Shield, TrendingUp, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/about`;
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre o Fuente Price Pro — Nossa História e Missão" },
      {
        name: "description",
        content:
          "Conheça a história de Paulo Fuentealba e a missão do Fuente Price Pro: levar inteligência quantitativa de preço teto e dividendos a investidores pessoa física.",
      },
      { property: "og:title", content: "Sobre o Fuente Price Pro — Nossa História e Missão" },
      {
        property: "og:description",
        content:
          "Conheça a história de Paulo Fuentealba e a missão do Fuente Price Pro: levar inteligência quantitativa de preço teto e dividendos a investidores pessoa física.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sobre o Fuente Price Pro — Nossa História e Missão" },
      {
        name: "twitter:description",
        content:
          "Conheça a história de Paulo Fuentealba e a missão do Fuente Price Pro: levar inteligência quantitativa de preço teto e dividendos a investidores pessoa física.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          mainEntityOfPage: PAGE_URL,
          name: "Sobre o Fuente Price Pro",
          description:
            "Conheça a história de Paulo Fuentealba e a missão do Fuente Price Pro: levar inteligência quantitativa de preço teto e dividendos a investidores pessoa física.",
          publisher: {
            "@type": "Organization",
            name: "Fuente Price Pro",
            url: SITE_URL,
            founder: {
              "@type": "Person",
              name: "Paulo Fuentealba",
              jobTitle: "Founder & Software Engineer",
              url: PAGE_URL,
            },
          },
        }),
      },
    ],
  }),
  component: AboutPage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="13.5" stroke="var(--accent)" strokeWidth="1.4" opacity=".6" />
      <circle cx="20" cy="20" r="8" fill="var(--accent)" />
    </svg>
  );
}

function AboutPage() {
  const { t } = useI18n();
  const A = t.aboutPage;
  const P = t.landing.page;
  const currentYear = new Date().getFullYear();

  return (
    <div className="dark min-h-screen bg-background text-foreground selection:bg-accent/30 overflow-x-hidden flex flex-col relative">
      {/* Nav */}
      <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <div className="font-serif text-lg font-semibold">
              Fuente <span className="text-accent-text">Price Pro</span>
            </div>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link to="/about" className="text-foreground transition-colors font-semibold">
                {A.badge}
              </Link>
              <Link to="/methodology" className="hover:text-foreground transition-colors">
                {t.methodologyPage.badge}
              </Link>
              <Link to="/guides" className="hover:text-foreground transition-colors">
                {P.nav.guides}
              </Link>
            </nav>
            <LanguageSwitcher className="hidden md:inline-flex" />
            <Button asChild size="sm" className="bg-primary text-sidebar-accent hover:opacity-90 rounded-full">
              <Link to="/auth">
                {P.nav.login} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pt-12 pb-16">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-3">
            {A.badge}
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium leading-[1.15] tracking-tight mb-5 text-foreground">
            {A.heroTitle}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
            {A.heroSubtitle}
          </p>

          {/* Story Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-12 space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-accent-text" />
              {A.storyTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {A.storyP1}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {A.storyP2}
            </p>
          </div>

          {/* Founder Section */}
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 sm:p-8 mb-12 flex flex-col sm:flex-row gap-6 items-start">
            <div className="h-16 w-16 rounded-full bg-accent/20 text-accent-text flex items-center justify-center shrink-0 border border-accent/40 font-serif text-xl font-bold">
              PF
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground">Paulo Fuentealba</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  {A.founderRole}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">gutierre.fuentealba@gmail.com</p>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                {A.founderBio}
              </p>
            </div>
          </div>

          {/* Core Values */}
          <div className="mb-14">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground mb-6 flex items-center gap-2.5">
              <Shield className="h-5 w-5 text-accent-text" />
              {A.valuesTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">{A.value1Title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{A.value1Desc}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <Code2 className="h-5 w-5 text-accent-text" />
                <h3 className="font-semibold text-sm text-foreground">{A.value2Title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{A.value2Desc}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">{A.value3Title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{A.value3Desc}</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-accent/10 p-8 text-center sm:text-left sm:flex items-center justify-between gap-6">
            <div className="space-y-1.5 mb-6 sm:mb-0">
              <h3 className="font-serif text-xl font-semibold text-foreground">{A.ctaTitle}</h3>
              <p className="text-sm text-muted-foreground">{A.ctaSubtitle}</p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-3 shrink-0">
              <Button asChild size="default" className="bg-primary text-sidebar-accent hover:opacity-90 rounded-lg font-semibold">
                <Link to="/onboarding">{A.ctaButton}</Link>
              </Button>
              <Button asChild size="default" variant="outline" className="rounded-lg font-semibold">
                <Link to="/demo">{A.ctaDemo}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <RegulatoryDisclaimerBanner forceShow variant="full" />

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1180px] px-6 py-9 flex flex-wrap justify-between gap-6 text-xs text-muted-foreground">
          <div>
            <div className="font-serif font-semibold text-foreground mb-2">{P.footer.brand}</div>
            &copy; {currentYear} &middot; {P.footer.madeIn}
          </div>
          <div className="flex flex-col gap-1">
            <Link to="/about" className="text-foreground transition-colors font-medium">
              {A.badge}
            </Link>
            <Link to="/methodology" className="hover:text-foreground transition-colors">
              {t.methodologyPage.badge}
            </Link>
            <Link to="/guides" className="hover:text-foreground transition-colors">
              {P.footer.col1[0]}
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {P.footer.col2[0]}
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {P.footer.col2[1]}
            </Link>
            <Link to="/subscription-terms" className="hover:text-foreground transition-colors">
              {P.footer.col2[2]}
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            <span>{P.footer.col3[0]}</span>
            <span>{P.footer.col3[1]}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
