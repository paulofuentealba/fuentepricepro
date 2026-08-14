import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  Map,
  ArrowRight,
  LineChart,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import { useI18n } from "@/lib/i18n-provider";
import { Header } from "@/components/ceiling/Header";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

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

function LandingPage() {
  const { t } = useI18n();
  const L = t.landing;
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const currentYear = new Date().getFullYear();

  return (
    <div className="dark min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-primary/30 overflow-x-hidden flex flex-col relative">
      <div className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-md">
        <Header variant="landing" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-start pt-20 pb-0 px-4 sm:px-6 lg:px-8 z-20 bg-[#030712]">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-primary/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_10%,transparent_100%)]" />
        </div>

        <div className="relative z-20 text-center max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-sm font-medium text-primary backdrop-blur-sm shadow-primary/15"
          >
            {L.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight"
          >
            {L.heroHeadline1}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {L.heroHeadline2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            {L.heroSub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-4 pb-12"
          >
            {user ? (
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-lg font-semibold px-5 py-4 sm:px-8 sm:py-6 rounded-full shadow-primary/30 transition-all hover:shadow-primary/50 hover:scale-105"
              >
                <Link to="/app">
                  {L.ctaTerminal} <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2 sm:h-5 sm:w-5" />
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => openAuthModal()}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-lg font-semibold px-5 py-4 sm:px-8 sm:py-6 rounded-full shadow-primary/30 transition-all hover:shadow-primary/50 hover:scale-105"
              >
                {L.ctaTerminal} <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2 sm:h-5 sm:w-5" />
              </Button>
            )}
          </motion.div>
        </div>

        {/* 3D Dashboard Mockup - The Wow Factor */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full max-w-6xl mx-auto -mt-4 [perspective:1200px]"
        >
          {/* ROOT CAUSE FIX 1: The Transform container is separate from the overflow container */}
          <div className="relative w-full rounded-t-xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] [transform:rotateX(15deg)] [transform-origin:top_center]">
            {/* The Strict Overflow Container */}
            <div
              className="relative w-full h-full overflow-hidden rounded-t-xl border-t border-l border-r border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl isolate"
              style={{
                maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                transform: "translateZ(0)",
              }}
            >
              {/* Fake Browser Header */}
              <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto bg-black/40 rounded px-24 py-1 text-[10px] text-slate-500 font-mono flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> fuentepricepro.com/app
                </div>
              </div>

              {/* Fake Dashboard Content - High Fidelity */}
              <div className="p-8 h-[500px] grid grid-cols-12 gap-8 opacity-80">
                {/* Sidebar */}
                <div className="col-span-2 space-y-6 border-r border-white/5 pr-6">
                  <div className="flex items-center gap-3 text-primary">
                    <Activity className="w-5 h-5 flex-shrink-0" />
                    <div className="h-4 w-full bg-primary/20 rounded" />
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <Map className="w-5 h-5 flex-shrink-0" />
                    <div className="h-4 w-3/4 bg-white/10 rounded" />
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <CalendarDays className="w-5 h-5 flex-shrink-0" />
                    <div className="h-4 w-full bg-white/10 rounded" />
                  </div>
                </div>

                {/* Main Area */}
                <div className="col-span-10 space-y-6">
                  {/* ROOT CAUSE FIX 3: 3-Card Balanced Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Consolidated Equity */}
                    <div className="h-32 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col justify-center">
                      <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                        {t.landing.demo.consolidatedEquity}
                      </p>
                      <p className="text-2xl font-bold text-white tracking-tight">
                        <AnimatedNumber value={1458290} prefix="R$ " decimals={0} delay={300} />
                      </p>
                      <p className="text-xs text-emerald-400 mt-2 font-mono">{t.landing.demo.thisMonthGrowth}</p>
                    </div>

                    {/* ROOT CAUSE FIX 2: Removed Diagonal SVG, added subtle glow */}
                    {/* Card 2: Monthly Yield */}
                    <div className="h-32 bg-white/5 rounded-xl border border-primary/10 p-5 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5" />
                      <p className="text-xs text-primary/80 mb-2 uppercase tracking-wider relative z-10">
                        {t.landing.demo.monthlyYield}
                      </p>
                      <p className="text-2xl font-bold text-white relative z-10">
                        <AnimatedNumber value={1240.5} prefix="R$ " decimals={2} delay={450} />
                      </p>
                    </div>

                    {/* Card 3: Total Dividends */}
                    <div className="h-32 bg-white/5 rounded-xl border border-blue-500/10 p-5 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-500/5" />
                      <p className="text-xs text-blue-400/80 mb-2 uppercase tracking-wider relative z-10">
                        {t.landing.demo.totalDividends}
                      </p>
                      <p className="text-2xl font-bold text-white relative z-10">
                        <AnimatedNumber value={84200} prefix="R$ " decimals={0} delay={600} />
                      </p>
                    </div>
                  </div>

                  {/* Table Area */}
                  <div className="bg-white/5 rounded-xl border border-white/5 p-5 mt-4">
                    <div className="grid grid-cols-4 gap-4 text-xs text-slate-500 border-b border-white/10 pb-3 mb-4">
                      <div>{t.landing.demo.tableAsset}</div>
                      <div>{t.landing.demo.tablePrice}</div>
                      <div>{t.landing.demo.tableYield}</div>
                      <div className="text-right">{t.landing.demo.tableConsensus}</div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4 text-sm text-slate-200">
                        <div className="font-bold">ITUB3</div>
                        <div>R$ 34.50</div>
                        <div className="text-emerald-400">7.2%</div>
                        <div className="text-right font-mono text-emerald-400">R$ 41.20</div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-slate-200">
                        <div className="font-bold">WEGE3</div>
                        <div>R$ 42.10</div>
                        <div className="text-emerald-400">2.4%</div>
                        <div className="text-right font-mono text-emerald-400">R$ 45.00</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Panels - 6-Card Bento Grid */}
      <section
        id="features"
        className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full bg-[#030712]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Consenso Fuente (Full Width Hero Card) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 group relative rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-md p-8 overflow-hidden hover:border-primary/50 transition-all duration-500 flex flex-col md:flex-row gap-8 items-center shadow-primary/5">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex-1">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 leading-tight">{L.panel1Title}</h3>
              <p className="text-base text-slate-300 leading-relaxed max-w-lg">{L.panel1Sub}</p>
            </div>

            {/* High-Fidelity Mockup: Valuation Card */}
            <div className="relative z-10 rounded-xl border border-white/10 bg-[#0a0a0a]/90 p-6 shadow-2xl w-full md:w-[400px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-xl font-bold text-white">BBAS3</h4>
                  <p className="text-xs text-slate-500">Banco do Brasil</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-primary font-mono border border-primary/30 bg-primary/10 px-2 py-1 rounded tracking-wide">
                    {L.mockupBuySignal}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs text-slate-300 border-b border-white/5 pb-2">
                  <span>Bazin</span>
                  <span className="font-mono">
                    <AnimatedNumber value={32.4} prefix="R$ " decimals={2} delay={0} />
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300 border-b border-white/5 pb-2">
                  <span>Graham</span>
                  <span className="font-mono">
                    <AnimatedNumber value={41.1} prefix="R$ " decimals={2} delay={150} />
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300 border-b border-white/5 pb-2">
                  <span>Gordon</span>
                  <span className="font-mono">
                    <AnimatedNumber value={35.8} prefix="R$ " decimals={2} delay={300} />
                  </span>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
                className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 blur animate-pulse" />
                <p className="relative z-10 text-[10px] text-primary uppercase tracking-widest font-bold mb-1">
                  {L.mockupConsensus}
                </p>
                <p className="relative z-10 text-3xl font-bold text-white tracking-tight">
                  <AnimatedNumber value={36.43} prefix="R$ " decimals={2} delay={800} />
                </p>
              </motion.div>
            </div>
          </div>

          {/* Card 2: Radar Global */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 overflow-hidden hover:border-yellow-500/30 transition-all duration-500 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 mb-6">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
                <Activity className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                {L.panel2Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{L.panel2Sub}</p>
            </div>

            <div className="relative z-10 rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-4 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded w-max">
                <Activity className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400 font-mono">{L.mockupRadarFilter}</span>
              </div>
              <div className="space-y-3">
                <div className="bg-white/5 rounded border border-white/5 p-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">
                      US
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{L.mockupRadarAsset1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Yield</p>
                    <p className="text-xs text-yellow-400 font-bold">6.2%</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded border border-white/5 p-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">
                      BR
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{L.mockupRadarAsset2}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Yield</p>
                    <p className="text-xs text-yellow-400 font-bold">11.4%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Fluxo de Caixa */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 overflow-hidden hover:border-pink-500/30 transition-all duration-500 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 mb-6">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
                <CalendarDays className="h-5 w-5 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                {L.panel3Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{L.panel3Sub}</p>
            </div>

            <div className="relative z-10 rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4 shadow-xl">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                {L.mockupUpcomingDividends}
              </p>

              <div className="flex items-end gap-2 h-20 mb-2 border-b border-white/10 pb-2">
                <div className="flex-1 bg-white/5 rounded-t-sm relative group/bar">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[8px] text-slate-500 mb-1">
                    Jul
                  </div>
                </div>
                <div
                  className="flex-1 bg-pink-500/40 rounded-t-sm relative border-t border-pink-500"
                  style={{ height: "80%" }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[8px] text-pink-400 mb-1">
                    {L.mockupMonth}
                  </div>
                </div>
                <div className="flex-1 bg-white/5 rounded-t-sm relative" style={{ height: "40%" }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[8px] text-slate-500 mb-1">
                    Sep
                  </div>
                </div>
                <div className="flex-1 bg-white/5 rounded-t-sm relative" style={{ height: "60%" }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 text-[8px] text-slate-500 mb-1">
                    Oct
                  </div>
                </div>
              </div>
              <div className="text-center pt-1">
                <p className="text-lg font-bold text-white">
                  R$ 1.240<span className="text-xs text-slate-500">,50</span>
                </p>
                <p className="text-[9px] text-pink-400 font-mono">Projected for {L.mockupMonth}</p>
              </div>
            </div>
          </div>

          {/* Card 4: Global Wallet */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 overflow-hidden hover:border-cyan-500/30 transition-all duration-500 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 mb-6">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <Map className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                {L.panel4Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{L.panel4Sub}</p>
            </div>

            <div className="relative z-10 rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold border border-blue-500/30">
                    US$
                  </div>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/30 -ml-2">
                    R$
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 px-2 py-1 rounded flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-cyan-400">USD/BRL 5.08</span>
                </div>
              </div>

              <div className="text-center py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                  {L.mockupNetWorth}
                </p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  <AnimatedNumber value={142850} prefix="R$ " decimals={2} delay={200} />
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Fixed Income */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 overflow-hidden hover:border-blue-500/30 transition-all duration-500 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 mb-6">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                {L.panel5Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{L.panel5Sub}</p>
            </div>

            <div className="relative z-10 rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white">CDB BTG Pactual</h4>
                  <p className="text-[10px] text-slate-500">Banco BTG Pactual</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-400 font-semibold">
                  110% CDI
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-white/5 rounded p-2">
                  <p className="text-[8px] text-slate-500 uppercase">Principal</p>
                  <p className="text-xs font-medium text-slate-200 mt-0.5">R$ 10k</p>
                </div>
                <div className="flex-1 bg-white/5 rounded p-2">
                  <p className="text-[8px] text-slate-500 uppercase">Maturity</p>
                  <p className="text-xs font-medium text-slate-200 mt-0.5">12/05/2028</p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                <p className="text-[10px] text-slate-400">Daily Compound</p>
                <p className="text-xs font-mono font-bold text-emerald-400">+ R$ 150.40</p>
              </div>
            </div>
          </div>

          {/* Card 6: Simulator & Export */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 overflow-hidden hover:border-purple-500/30 transition-all duration-500 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 mb-6">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <LineChart className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                {L.panel6Title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{L.panel6Sub}</p>
            </div>

            <div className="relative z-10 rounded-xl border border-white/10 bg-[#0a0a0a]/80 p-4 shadow-xl flex flex-col justify-between h-[156px]">
              <div className="absolute inset-0 p-4 opacity-40 pointer-events-none">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M0,100 C40,95 70,70 100,0"
                    fill="none"
                    stroke="url(#purpleGradient2)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                  <defs>
                    <linearGradient id="purpleGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="relative z-10">
                <p className="text-2xl font-bold text-white tracking-tight">
                  <AnimatedNumber value={2035} decimals={0} delay={200} />
                </p>
                <p className="text-[10px] text-purple-400 font-mono mt-0.5">
                  Crossover Point reached
                </p>
              </div>

              <div className="relative z-10 mt-auto">
                <button className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  {L.mockupExportCsv}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal & Compliance Section */}
      <section className="border-t border-white/5 bg-[#030712] py-8 px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-4xl mx-auto">
            {t.disclaimer2 || t.disclaimer}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#030712]/40 backdrop-blur relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center gap-4 text-sm text-slate-500">
          <p>Fuente Price Pro &copy; {currentYear}</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">
              {L.footerLegal1}
            </Link>
            <span>|</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">
              {L.footerLegal4}
            </Link>
            <span>|</span>
            <a href="#" className="hover:text-slate-300 transition-colors">
              {L.footerLegal2}
            </a>
            <span>|</span>
            <a href="#" className="hover:text-slate-300 transition-colors">
              {L.footerLegal3}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
