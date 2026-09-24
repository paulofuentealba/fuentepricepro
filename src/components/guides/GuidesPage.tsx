import { useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  LineChart,
  Building,
  Lightbulb,
  Search,
  Sparkles,
  Percent,
  Coins,
  RefreshCw,
  Target,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  Globe,
  LayoutDashboard,
  FileText,
  HelpCircle,
  Flame,
  Gauge,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-provider";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { ValuationTab } from "./tabs/ValuationTab";
import { DecisionEnginesTab } from "./tabs/DecisionEnginesTab";
import { TaxGuideTab } from "./tabs/TaxGuideTab";
import { MetricsRiskTab } from "./tabs/MetricsRiskTab";
import { AppDirectoryTab } from "./tabs/AppDirectoryTab";

export type GuideTabId =
  | "consensus"
  | "bazin"
  | "graham"
  | "gordon"
  | "peter-lynch"
  | "dividend-valuation"
  | "reinvestir"
  | "contribution-plan"
  | "withdraw"
  | "snowball"
  | "tax-brazil"
  | "tax-usa"
  | "fi-infra"
  | "metrics"
  | "risk-radar"
  | "currency-decomposition"
  | "app-directory"
  | "brokers"
  | "glossary"
  | "concepts";

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="13.5" stroke="var(--accent)" strokeWidth="1.4" opacity=".6" />
      <circle cx="20" cy="20" r="8" fill="var(--accent)" />
    </svg>
  );
}

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

export const TAB_PATHS: Record<GuideTabId, string> = {
  consensus: "/guides",
  bazin: "/guides/bazin",
  graham: "/guides/graham",
  gordon: "/guides/gordon",
  "peter-lynch": "/guides/peter-lynch",
  "dividend-valuation": "/guides/dividend-valuation",
  reinvestir: "/guides/reinvestir",
  "contribution-plan": "/guides/contribution-plan",
  withdraw: "/guides/withdraw",
  snowball: "/guides/snowball",
  "tax-brazil": "/guides/tax-brazil",
  "tax-usa": "/guides/tax-usa",
  "fi-infra": "/guides/fi-infra",
  metrics: "/guides/metrics",
  "risk-radar": "/guides/risk-radar",
  "currency-decomposition": "/guides/currency-decomposition",
  "app-directory": "/guides/app-directory",
  brokers: "/guides/brokers",
  glossary: "/guides/glossary",
  concepts: "/guides/concepts",
};

interface GuideTabItem {
  id: GuideTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface GuideSection {
  title: string;
  tabs: GuideTabItem[];
}

interface GuidesPageProps {
  defaultTab?: GuideTabId;
}

export function GuidesPage({ defaultTab = "consensus" }: GuidesPageProps) {
  const { t } = useI18n();
  const D = t.docs;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<GuideTabId>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

  const sections: GuideSection[] = useMemo(
    () => [
      {
        title: D.sections.valuation,
        tabs: [
          { id: "consensus", label: D.consensus.title, icon: Lightbulb },
          { id: "bazin", label: D.bazin.title, icon: LineChart },
          { id: "graham", label: D.graham.title, icon: Calculator },
          { id: "gordon", label: D.gordon.title, icon: Building },
          { id: "peter-lynch", label: D.peterLynch.title, icon: Sparkles },
          { id: "dividend-valuation", label: D.dividendValuation.title, icon: Gauge },
        ],
      },
      {
        title: D.sections.decisionEngines,
        tabs: [
          { id: "reinvestir", label: D.reinvestir.title, icon: RefreshCw },
          { id: "contribution-plan", label: D.contributionPlan.title, icon: Target },
          { id: "withdraw", label: D.withdraw.title, icon: Coins },
          { id: "snowball", label: D.snowball.title, icon: Flame },
        ],
      },
      {
        title: D.sections.tax,
        tabs: [
          { id: "tax-brazil", label: D.taxBrazil.title, icon: Landmark },
          { id: "tax-usa", label: D.taxUsa.title, icon: Globe },
          { id: "fi-infra", label: D.fiInfra.title, icon: ShieldCheck },
        ],
      },
      {
        title: D.sections.analysis,
        tabs: [
          { id: "metrics", label: D.metrics.title, icon: Percent },
          { id: "risk-radar", label: D.riskRadar.title, icon: AlertTriangle },
          { id: "currency-decomposition", label: D.currencyDecomposition.title, icon: Globe },
        ],
      },
      {
        title: D.sections.appGuide,
        tabs: [
          { id: "app-directory", label: D.appDirectory.title, icon: LayoutDashboard },
          { id: "brokers", label: D.supportedBrokers.title, icon: FileText },
          { id: "glossary", label: D.glossary.title, icon: HelpCircle },
        ],
      },
    ],
    [D],
  );

  const filteredSections = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return sections;
    const needle = normalize(term);

    return sections
      .map((section) => ({
        ...section,
        tabs: section.tabs.filter((tab) => normalize(tab.label).includes(needle)),
      }))
      .filter((section) => section.tabs.length > 0);
  }, [sections, searchTerm]);

  const allVisibleTabs = useMemo(
    () => filteredSections.flatMap((s) => s.tabs),
    [filteredSections],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className={`${CONTAINER} flex items-center justify-between py-4`}>
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Fuente Price Pro
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden md:inline-flex" />
            <Button asChild size="sm" className="bg-success text-success-foreground hover:bg-success/90">
              <Link to="/app">{t.landing.openApp}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className={`${CONTAINER} py-10 md:py-14`}>
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-success">
            {t.docs.navLink}
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            <BookOpen className="h-8 w-8 text-primary" />
            {D.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {D.description}
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={D.searchPlaceholder}
            className="bg-card pl-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as GuideTabId)}
          className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-[250px_1fr] md:items-start"
        >
          {/* Mobile: scroll horizontal com todas as abas filtradas */}
          <nav className="relative -mx-4 px-4 md:hidden">
            <div className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              {allVisibleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    to={TAB_PATHS[tab.id]}
                    className={cn(
                      "flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      activeTab === tab.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
          </nav>

          {/* Desktop: barra lateral fixa categorizada por seção */}
          <nav className="hidden md:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-5">
              {filteredSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {section.title}
                  </h3>
                  <div className="space-y-0.5">
                    {section.tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <Link
                          key={tab.id}
                          to={TAB_PATHS[tab.id]}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                            activeTab === tab.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Área Principal de Conteúdo */}
          <div className="min-w-0">
            <ValuationTab />
            <DecisionEnginesTab />
            <TaxGuideTab />
            <MetricsRiskTab />
            <AppDirectoryTab />
          </div>
        </Tabs>
      </main>
    </div>
  );
}
