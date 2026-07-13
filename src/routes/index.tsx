import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Target,
  TrendingUp,
  Gauge,
  ShieldCheck,
  Sparkles,
  Globe,
  Search,
  Calendar,
  Network,
  Snowflake,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import { useI18n } from "@/lib/i18n-provider";
import type { Locale } from "@/lib/i18n";
import { FeedbackWidget } from "@/components/ceiling/FeedbackWidget";
import { ShowcaseCarousel } from "@/components/landing/ShowcaseCarousel";
import { Header } from "@/components/ceiling/Header";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";


const SITE_URL = "https://fuentepricepro.web.app";
const OG_IMAGE = "https://firebasestorage.googleapis.com/v0/b/fuentepricepro.firebasestorage.app/o/og-image.png?alt=media";
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Fuente Price Pro",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          description:
            "Bazin-based ceiling price calculator with net yield tracking, cash-flow calendar, and goal-based smart allocation for dividend stocks, REITs, FIIs and ETFs.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: LandingRoute,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});


const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

function LandingRoute() {
  return <LandingPage />;
}

// Removing LanguageSelector to use the inline buttons from Header

function LandingPage() {
  const { t } = useI18n();
  const L = t.landing;
  const { openAuthModal } = useAuthModal();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-30">
        <Header variant="landing" />
      </div>

      <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-900/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--success) 18%, transparent) 0%, transparent 60%)",
          }}
        />
        <div className={`${CONTAINER} pt-16 md:pt-24`}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <Sparkles className="h-3.5 w-3.5" />
              {L.badge}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              {L.heroTitleA}{" "}
              <span className="bg-gradient-to-r from-success via-emerald-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
                {L.heroTitleB}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl font-medium">
              {L.heroSubtitle}
            </p>

            <div className="mx-auto mt-8 max-w-xl">
              <HeroSearch />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                {L.trust1}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                {L.trust2}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                {L.trust3}
              </span>
            </div>

            <div className="mt-8 flex justify-center border-t border-border/60 pt-6">
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {L.trustedBy}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Showcase carousel */}
        <div className="relative mt-12 pb-16 md:mt-16 md:pb-24">
          <ShowcaseCarousel />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-card/20">
        <div className={`${CONTAINER} py-16 md:py-24`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {L.featuresTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {L.featuresSubtitle}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard icon={Calculator} title={L.feature1Title} description={L.feature1Body} delay={0.1} />
            <FeatureCard icon={Globe} title={L.feature2Title} description={L.feature2Body} delay={0.2} />
            <FeatureCard icon={Network} title={L.feature3Title} description={L.feature3Body} delay={0.3} />
            <FeatureCard icon={Snowflake} title={L.feature4Title} description={L.feature4Body} delay={0.4} />
            <FeatureCard icon={Calendar} title={L.feature5Title} description={L.feature5Body} delay={0.5} />
            <FeatureCard icon={TrendingUp} title={L.feature6Title} description={L.feature6Body} delay={0.6} />
          </div>

          <div className="mt-16 flex justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 bg-gradient-to-r from-success to-emerald-600 px-8 text-lg font-bold text-success-foreground hover:from-success/90 hover:to-emerald-500 shadow-xl shadow-success/20 active:scale-[0.98] transition-all duration-300"
            >
              <Link to="/app">
                {L.ctaStart}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 bg-background">
        <div className={`${CONTAINER} py-16 md:py-24`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {L.pricingTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {L.pricingSubtitle}
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free Tier */}
            <div className="rounded-3xl border border-border/60 bg-card/40 p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">{L.pricingFreeTitle}</h3>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold tracking-tight text-foreground">
                {L.pricingFreePrice}
              </div>
              <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
                {L.pricingFreeFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={() => openAuthModal()}
                variant="outline"
                className="mt-8 w-full active:scale-[0.98] transition-transform"
              >
                {L.pricingCtaFree}
              </Button>
            </div>

            {/* Pro Tier */}
            <div className="relative rounded-3xl border border-success bg-card/80 p-8 shadow-2xl">
              <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-success px-3 py-1 text-center text-xs font-medium text-success-foreground">
                {L.badge}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{L.pricingProTitle}</h3>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold tracking-tight text-foreground">
                {L.pricingProPrice}
              </div>
              <ul className="mt-8 space-y-4 text-sm text-foreground">
                {L.pricingProFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full bg-success text-success-foreground hover:bg-success/90 active:scale-[0.98] transition-transform"
              >
                <Link to="/app">{L.pricingCtaPro}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background">
        <div className={`${CONTAINER} py-10`}>
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success ring-1 ring-success/30">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Fuente Price Pro</div>
                <div className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} · All rights reserved
                </div>
              </div>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {L.footerDisclaimer}
            </p>
          </div>
        </div>
      </footer>

      <FeedbackWidget />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: typeof Calculator;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group relative rounded-2xl border border-border/60 bg-card/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-success/40 hover:bg-card/80"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30 transition-transform duration-300 group-hover:scale-110 group-hover:bg-success group-hover:text-success-foreground group-hover:shadow-lg group-hover:shadow-success/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </motion.div>
  );
}

function HeroSearch() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const L = t.landing;
  const [ticker, setTicker] = useState("");

  function go(value: string) {
    const v = value.trim().toUpperCase();
    if (!v) {
      navigate({ to: "/app" });
      return;
    }
    navigate({ to: "/app", search: { ticker: v } });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    go(ticker);
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-60 blur-2xl"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--success) 28%, transparent), color-mix(in oklab, #6366f1 18%, transparent))",
        }}
      />
      <form
        onSubmit={submit}
        className="rounded-2xl border border-success/30 bg-card/80 p-3 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="h-12 border-0 bg-transparent pl-9 text-base shadow-none focus-visible:ring-0 focus-within:ring-2 focus-within:ring-success/50"
              aria-label="Ticker"
            />
          </div>
          <Button
            type="submit"
            className="h-12 bg-success px-5 text-base font-semibold text-success-foreground hover:bg-success/90 active:scale-[0.98] transition-transform"
          >
            {L.analyze}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>{L.tryLabel}</span>
        {["SCHD", "O", "BBSE3", "MXRF11"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-medium text-foreground transition-colors hover:border-success/40 hover:text-success"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
