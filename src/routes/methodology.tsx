import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Calculator, Database, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";

const SITE_URL = "https://fuentepricepro.com";
const PAGE_URL = `${SITE_URL}/methodology`;
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Metodologia de Valuation — Fuente Price Pro" },
      {
        name: "description",
        content:
          "Conheça em detalhes os modelos quantitativos de Bazin, Graham e Gordon e a ingestão de dados da CVM utilizados pelo Fuente Price Pro.",
      },
      { property: "og:title", content: "Metodologia de Valuation — Fuente Price Pro" },
      {
        property: "og:description",
        content:
          "Conheça em detalhes os modelos quantitativos de Bazin, Graham e Gordon e a ingestão de dados da CVM utilizados pelo Fuente Price Pro.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Metodologia de Valuation — Fuente Price Pro" },
      {
        name: "twitter:description",
        content:
          "Conheça em detalhes os modelos quantitativos de Bazin, Graham e Gordon e a ingestão de dados da CVM utilizados pelo Fuente Price Pro.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          mainEntityOfPage: PAGE_URL,
          headline: "Metodologia de Valuation — Fuente Price Pro",
          description:
            "Conheça em detalhes os modelos quantitativos de Bazin, Graham e Gordon e a ingestão de dados da CVM utilizados pelo Fuente Price Pro.",
          author: {
            "@type": "Person",
            name: "Paulo Fuentealba",
            url: `${SITE_URL}/about`,
          },
          publisher: {
            "@type": "Organization",
            name: "Fuente Price Pro",
            url: SITE_URL,
          },
        }),
      },
    ],
  }),
  component: MethodologyPage,
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

function MethodologyPage() {
  const { t } = useI18n();
  const M = t.methodologyPage;
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
              <Link to="/about" className="hover:text-foreground transition-colors">
                {t.aboutPage.badge}
              </Link>
              <Link to="/methodology" className="text-foreground transition-colors font-semibold">
                {M.badge}
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
            {M.badge}
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium leading-[1.15] tracking-tight mb-5 text-foreground">
            {M.heroTitle}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
            {M.heroSubtitle}
          </p>

          {/* CVM Data Ingestion Card */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-sm mb-10 space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2.5">
              <Database className="h-5 w-5 text-primary" />
              {M.cvmTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {M.cvmText}
            </p>
          </div>

          {/* Model 1: Bazin */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-8 space-y-3.5">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-accent-text" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">{M.bazinTitle}</h2>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs sm:text-sm text-accent-text font-semibold border border-border/70">
              {M.bazinFormula}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {M.bazinDesc}
            </p>
          </div>

          {/* Model 2: Graham */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-8 space-y-3.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">{M.grahamTitle}</h2>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs sm:text-sm text-primary font-semibold border border-border/70">
              {M.grahamFormula}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {M.grahamDesc}
            </p>
          </div>

          {/* Model 3: Gordon */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-8 space-y-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-text" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">{M.gordonTitle}</h2>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs sm:text-sm text-accent-text font-semibold border border-border/70">
              {M.gordonFormula}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {M.gordonDesc}
            </p>
          </div>

          {/* Safety Margin */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-12 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">{M.safetyMarginTitle}</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {M.safetyMarginDesc}
            </p>
          </div>

          {/* Legal Compliance Box */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{M.disclaimerLabel}</strong> {M.disclaimerText}
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
            <Link to="/about" className="hover:text-foreground transition-colors">
              {t.aboutPage.badge}
            </Link>
            <Link to="/methodology" className="text-foreground transition-colors font-medium">
              {M.badge}
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
