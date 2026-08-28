import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/i18n";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";

const SITE_URL = "https://fuentepricepro.com";
const OG_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";
const PAGE_TITLE = "Fuente Price Pro — Dividend Ceiling Price Calculator";
const PAGE_DESCRIPTION =
  "Calculate the exact ceiling price for stocks, REITs, FIIs and ETFs, track your true net yield, and reverse-engineer your passive income goals.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: LandingRoute,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function LandingRoute() {
  return <LandingPage />;
}

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="13.5" stroke="var(--accent)" strokeWidth="1.4" opacity=".6" />
      <circle cx="20" cy="20" r="8" fill="var(--accent)" />
    </svg>
  );
}

function LandingPage() {
  const { t, locale } = useI18n();
  const P = t.landing.page;
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const currentYear = new Date().getFullYear();

  const heroCardRows = [
    { name: "BBAS3", tag: P.heroCard.tagStockBR, amount: 850, bar: 78 },
    { name: "SCHD", tag: P.heroCard.tagForeign, amount: 700, bar: 64 },
    { name: "TAEE11", tag: P.heroCard.tagStockBR, amount: 550, bar: 50 },
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground selection:bg-accent/30 overflow-x-hidden flex flex-col relative">
      {/* Nav */}
      <header className="w-full">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div className="font-serif text-lg font-semibold">
              Fuente <span className="text-accent-text">Price Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a href="#perguntas" className="hover:text-foreground transition-colors">
                {P.nav.questions}
              </a>
              <a href="#comparacao" className="hover:text-foreground transition-colors">
                {P.nav.comparison}
              </a>
              <a href="#precos" className="hover:text-foreground transition-colors">
                {P.nav.pricing}
              </a>
              <Link to="/guides/dividend-valuation" className="hover:text-foreground transition-colors">
                {P.nav.guides}
              </Link>
            </nav>
            <LanguageSwitcher className="hidden md:inline-flex" />
            <Button asChild size="sm" className="bg-primary text-sidebar-accent hover:opacity-90 rounded-full">
              <Link to={user ? "/app" : "/auth"}>
                {P.nav.login} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-[1180px] px-6 pt-8 pb-16 grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-11 items-center">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-3">
            {P.hero.eyebrow}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-4xl sm:text-5xl font-medium leading-[1.1] tracking-tight mb-5"
          >
            {P.hero.title1}
            <br />
            <span className="text-accent-text font-semibold">{P.hero.title2}</span>
          </motion.h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-7 max-w-xl">{P.hero.sub}</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              asChild
              size="lg"
              className="bg-primary text-sidebar-accent hover:opacity-90 rounded-lg font-semibold"
            >
              <Link to="/onboarding">{P.hero.ctaPrimary}</Link>
            </Button>
            {user ? (
              <Button asChild size="lg" variant="outline" className="rounded-lg font-semibold">
                <Link to="/app">{P.hero.ctaSecondary}</Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" onClick={() => openAuthModal()} className="rounded-lg font-semibold">
                {P.hero.ctaSecondary}
              </Button>
            )}
          </div>
          <div className="text-[11.5px] text-muted-foreground">{P.hero.fine}</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="rounded-[20px] border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
        >
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">
            {P.heroCard.eyebrow}
          </div>
          <div className="font-serif text-lg font-medium mb-3.5">{P.heroCard.question}</div>
          {heroCardRows.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-center gap-3 py-2.5 ${i < heroCardRows.length - 1 ? "border-b border-dashed border-border/70" : ""}`}
            >
              <div className="h-[25px] w-[25px] shrink-0 rounded-lg bg-accent/15 text-accent-text flex items-center justify-center font-mono text-xs font-semibold">
                {i + 1}
              </div>
              <div className="w-20 shrink-0">
                <div className="text-[13px] font-semibold">{row.name}</div>
                <div className="text-[10px] text-muted-foreground">{row.tag}</div>
              </div>
              <div className="flex-1">
                <div className="h-[18px] rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${row.bar}%` }}
                  />
                </div>
              </div>
              <div className="font-serif text-base font-medium">{formatCurrency(row.amount, "BRL", locale)}</div>
            </div>
          ))}
          <div className="mt-3 rounded-lg bg-accent/15 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
            <b className="text-accent-text">{P.heroCard.noteLabel}</b> {P.heroCard.noteText}
          </div>
        </motion.div>
      </section>

      {/* Perguntas */}
      <section id="perguntas" className="mx-auto w-full max-w-[1180px] px-6 py-14">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-center mb-2">{P.questions.title}</h2>
        <p className="text-center text-muted-foreground text-sm max-w-xl mx-auto mb-9 leading-relaxed">
          {P.questions.subtitle}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {P.questions.items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xl text-accent mb-2.5">&#9670;</div>
              <h4 className="font-serif text-base font-semibold mb-1.5 leading-snug">{item.title}</h4>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparação */}
      <section id="comparacao" className="mx-auto w-full max-w-[1180px] px-6 py-14">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-center mb-2">{P.comparison.title}</h2>
        <p className="text-center text-muted-foreground text-sm max-w-xl mx-auto mb-9 leading-relaxed">
          {P.comparison.subtitle}
        </p>
        <div className="rounded-2xl border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold px-4 py-3">{P.comparison.colFeature}</th>
                <th className="font-serif text-sm font-semibold px-4 py-3 bg-accent/15 text-accent-text">
                  {P.comparison.colFuente}
                </th>
                <th className="text-center font-semibold text-muted-foreground px-4 py-3">
                  {P.comparison.colStatusInvest}
                </th>
                <th className="text-center font-semibold text-muted-foreground px-4 py-3">
                  {P.comparison.colInvestidor10}
                </th>
              </tr>
            </thead>
            <tbody>
              {P.comparison.rows.map((row) => (
                <tr key={row.feature} className="border-b border-dashed border-border/70 last:border-0">
                  <td className="px-4 py-3.5">{row.feature}</td>
                  <td className="px-4 py-3.5 text-center font-semibold bg-accent/[0.06]">
                    <Check className="inline h-4 w-4 text-primary" />
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground">
                    {row.statusInvest === "yes" ? (
                      <Check className="inline h-4 w-4" />
                    ) : row.statusInvest === "partial" ? (
                      P.comparison.partialLabel
                    ) : (
                      <Minus className="inline h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground">
                    {row.investidor10 === "yes" ? (
                      <Check className="inline h-4 w-4" />
                    ) : row.investidor10 === "partial" ? (
                      P.comparison.partialLabel
                    ) : (
                      <Minus className="inline h-4 w-4" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 rounded-xl bg-muted px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
          <b className="text-foreground">{P.comparison.legalNoteLabel}</b> {P.comparison.legalNoteText}
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="mx-auto w-full max-w-[1180px] px-6 py-14">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-center mb-2">{P.pricing.title}</h2>
        <p className="text-center text-muted-foreground text-sm mb-9">{P.pricing.subtitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[760px] mx-auto">
          <div className="rounded-[20px] border border-border bg-card p-7">
            <div className="font-serif text-xl font-semibold mb-1">{P.pricing.free.name}</div>
            <div className="text-xs text-muted-foreground mb-2.5">{P.pricing.free.tagline}</div>
            <div className="font-serif text-4xl font-medium mb-1">
              {formatCurrency(0, "BRL", locale)}
              <span className="text-sm text-muted-foreground font-sans">{P.pricing.priceSuffix}</span>
            </div>
            <ul className="my-4 space-y-1.5">
              {P.pricing.free.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            {user ? (
              <Button asChild variant="outline" className="w-full rounded-lg">
                <Link to="/app">{P.pricing.free.cta}</Link>
              </Button>
            ) : (
              <Button variant="outline" className="w-full rounded-lg" onClick={() => openAuthModal()}>
                {P.pricing.free.cta}
              </Button>
            )}
          </div>

          <div className="relative rounded-[20px] border border-accent bg-card p-7">
            <div
              className="absolute -top-2.5 right-6 z-10 rounded-full text-accent-text text-[10px] font-bold leading-none px-2.5 py-1.5 shadow-sm"
              style={{ backgroundColor: "color-mix(in srgb, var(--accent) 22%, var(--card))" }}
            >
              {P.pricing.pro.badge}
            </div>
            <div className="font-serif text-xl font-semibold mb-1">{P.pricing.pro.name}</div>
            <div className="text-xs text-muted-foreground mb-2.5">{P.pricing.pro.tagline}</div>
            <div className="font-serif text-4xl font-medium mb-1">
              {formatCurrency(9.9, "BRL", locale)}
              <span className="text-sm text-muted-foreground font-sans">{P.pricing.priceSuffix}</span>
            </div>
            <ul className="my-4 space-y-1.5">
              {P.pricing.pro.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            {user ? (
              <Button asChild className="w-full rounded-lg bg-primary text-sidebar-accent hover:opacity-90">
                <Link to="/app">{P.pricing.pro.cta}</Link>
              </Button>
            ) : (
              <Button
                className="w-full rounded-lg bg-primary text-sidebar-accent hover:opacity-90"
                onClick={() => openAuthModal()}
              >
                {P.pricing.pro.cta}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-6 rounded-xl bg-muted px-5 py-4 text-[11px] leading-relaxed text-muted-foreground max-w-[760px] mx-auto">
          <b className="text-foreground">{P.pricing.legalNoteLabel}</b> {P.pricing.legalNoteText}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1180px] px-6 py-9 flex flex-wrap justify-between gap-6 text-xs text-muted-foreground">
          <div>
            <div className="font-serif font-semibold text-foreground mb-2">{P.footer.brand}</div>
            &copy; {currentYear} &middot; {P.footer.madeIn}
          </div>
          <div className="flex flex-col gap-1">
            <Link to="/guides/dividend-valuation" className="hover:text-foreground transition-colors">
              {P.footer.col1[0]}
            </Link>
            <Link to="/guides/dividend-valuation" className="hover:text-foreground transition-colors">
              {P.footer.col1[1]}
            </Link>
            <Link to="/app/docs" className="hover:text-foreground transition-colors">
              {P.footer.col1[2]}
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
