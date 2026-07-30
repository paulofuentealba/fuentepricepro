import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import {
  BookOpen,
  Calculator,
  LineChart,
  Building,
  Lightbulb,
  Search,
  AlertCircle,
  Percent,
  ShieldCheck,
  Scale,
  Banknote,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/app/docs")({
  component: DocsPage,
});

function DocsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const id = window.location.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // Initial check
    setTimeout(handleHashChange, 100);

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filterCard = (title: string, desc: string) => {
    if (!searchTerm) return true;
    const term = normalize(searchTerm);
    return normalize(title).includes(term) || normalize(desc).includes(term);
  };

  const menuItems = [
    { id: "consensus", label: t.docs.consensus.title },
    { id: "bazin", label: t.docs.bazin.title },
    { id: "graham", label: t.docs.graham.title },
    { id: "gordon", label: t.docs.gordon.title },
    { id: "safety-margin", label: t.docs.metrics.safetyMargin.title },
    { id: "yield-on-cost", label: t.docs.metrics.yieldOnCost.title },
    { id: "payout", label: t.docs.metrics.payout.title },
    { id: "cagr", label: t.docs.metrics.cagr.title },
    { id: "dy-vs-yoc", label: t.docs.metrics.dyVsYoc.title },
    { id: "snowball", label: t.docs.concepts.snowball.title },
    { id: "taxes", label: t.docs.concepts.taxes.title },
    { id: "sector-concentration", label: t.docs.riskRadar.sectorConcentration.title },
    { id: "asset-concentration", label: t.docs.riskRadar.assetConcentration.title },
    { id: "payout-risk", label: t.docs.riskRadar.payoutRisk.title },
    { id: "yield-trap", label: t.docs.riskRadar.yieldTrap.title },
    { id: "supported-brokers", label: t.docs.supportedBrokers.title },
    { id: "glossary", label: t.docs.glossary.title },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-emerald-500" />
          {t.docs.title}
        </h1>
        <p className="text-muted-foreground">{t.docs.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 hidden md:block">
          <div className="sticky top-20 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Índice
            </h3>
            <ul className="space-y-2 text-sm">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.docs.searchPlaceholder}
              className="pl-9 bg-background/60 backdrop-blur-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid gap-6">
            {filterCard(t.docs.consensus.title, t.docs.consensus.description) && (
              <Card
                id="consensus"
                className="bg-background/60 backdrop-blur-md border-emerald-500/20 scroll-m-20"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <Lightbulb className="h-5 w-5" />
                    {t.docs.consensus.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.consensus.description}
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.bazin.title, t.docs.bazin.description) && (
              <Card id="bazin" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-indigo-400" />
                    {t.docs.bazin.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.docs.bazin.description}
                  </p>
                  <div className="bg-muted/30 p-4 rounded-md font-mono text-sm overflow-x-auto text-foreground/80 border border-muted/50">
                    Preço Teto = Dividendo Médio (Últimos Anos) / 0.06
                  </div>
                  <div className="bg-indigo-500/10 p-3 rounded-md text-xs text-indigo-200/80 border border-indigo-500/20">
                    {t.docs.bazin.example}
                  </div>
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.graham.title, t.docs.graham.description) && (
              <Card id="graham" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-orange-400" />
                    {t.docs.graham.title}
                  </CardTitle>
                  <Badge
                    variant="destructive"
                    className="ml-2 font-medium bg-red-900/40 text-red-400 border-red-500/30"
                  >
                    {t.docs.graham.notApplicableBadge}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.docs.graham.description}
                  </p>
                  <p className="text-xs text-red-400/80">* {t.docs.graham.notApplicableReason}</p>
                  <div className="bg-muted/30 p-4 rounded-md font-mono text-sm overflow-x-auto text-foreground/80 flex items-center gap-2 border border-muted/50">
                    <span className="text-muted-foreground">VI = </span>
                    <span>
                      &radic;
                      <span className="border-t border-foreground/80 px-1">
                        (22.5 &times; LPA &times; VPA)
                      </span>
                    </span>
                  </div>
                  <div className="bg-orange-500/10 p-3 rounded-md text-xs text-orange-200/80 border border-orange-500/20">
                    {t.docs.graham.example}
                  </div>
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.gordon.title, t.docs.gordon.description) && (
              <Card id="gordon" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-400" />
                    {t.docs.gordon.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.docs.gordon.description}
                  </p>
                  <div className="bg-muted/30 p-4 rounded-md font-mono text-sm overflow-x-auto text-foreground/80 border border-muted/50">
                    Preço Justo = (Dividendo Atual &times; (1 + Crescimento)) / (Taxa de Desconto -
                    Crescimento)
                  </div>
                  <div className="bg-blue-500/10 p-3 rounded-md text-xs text-blue-200/80 border border-blue-500/20">
                    {t.docs.gordon.example}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics */}
            <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b border-border pb-2">
              {t.docs.metrics.title}
            </h2>

            {filterCard(
              t.docs.metrics.safetyMargin.title,
              t.docs.metrics.safetyMargin.description,
            ) && (
              <Card id="safety-margin" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    {t.docs.metrics.safetyMargin.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.metrics.safetyMargin.description}
                </CardContent>
              </Card>
            )}

            {filterCard(
              t.docs.metrics.yieldOnCost.title,
              t.docs.metrics.yieldOnCost.description,
            ) && (
              <Card id="yield-on-cost" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Percent className="h-5 w-5 text-emerald-400" />
                    {t.docs.metrics.yieldOnCost.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.metrics.yieldOnCost.description}
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.metrics.payout.title, t.docs.metrics.payout.description) && (
              <Card id="payout" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="h-5 w-5 text-orange-400" />
                    {t.docs.metrics.payout.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.metrics.payout.description}
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.metrics.cagr.title, t.docs.metrics.cagr.description) && (
              <Card id="cagr" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    {t.docs.metrics.cagr.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.metrics.cagr.description}
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.metrics.dyVsYoc.title, t.docs.metrics.dyVsYoc.description) && (
              <Card id="dy-vs-yoc" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-5 w-5 text-indigo-400" />
                    {t.docs.metrics.dyVsYoc.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.metrics.dyVsYoc.description}
                </CardContent>
              </Card>
            )}

            {/* Concepts */}
            <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b border-border pb-2">
              {t.docs.concepts.title}
            </h2>

            {filterCard(t.docs.concepts.snowball.title, t.docs.concepts.snowball.description) && (
              <Card id="snowball" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChart className="h-5 w-5 text-emerald-400" />
                    {t.docs.concepts.snowball.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.concepts.snowball.description}
                </CardContent>
              </Card>
            )}

            {filterCard(t.docs.concepts.taxes.title, t.docs.concepts.taxes.description) && (
              <Card id="taxes" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Banknote className="h-5 w-5 text-red-400" />
                    {t.docs.concepts.taxes.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.concepts.taxes.description}
                </CardContent>
              </Card>
            )}

            {/* Risk Radar */}
            <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b border-border pb-2">
              {t.docs.riskRadar.title}
            </h2>

            {filterCard(
              t.docs.riskRadar.sectorConcentration.title,
              t.docs.riskRadar.sectorConcentration.description,
            ) && (
              <Card
                id="sector-concentration"
                className="bg-background/40 backdrop-blur-md scroll-m-20 border-orange-500/20"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    {t.docs.riskRadar.sectorConcentration.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.riskRadar.sectorConcentration.description}
                </CardContent>
              </Card>
            )}

            {filterCard(
              t.docs.riskRadar.assetConcentration.title,
              t.docs.riskRadar.assetConcentration.description,
            ) && (
              <Card
                id="asset-concentration"
                className="bg-background/40 backdrop-blur-md scroll-m-20 border-orange-500/20"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    {t.docs.riskRadar.assetConcentration.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.riskRadar.assetConcentration.description}
                </CardContent>
              </Card>
            )}

            {filterCard(
              t.docs.riskRadar.payoutRisk.title,
              t.docs.riskRadar.payoutRisk.description,
            ) && (
              <Card
                id="payout-risk"
                className="bg-background/40 backdrop-blur-md scroll-m-20 border-red-500/20"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    {t.docs.riskRadar.payoutRisk.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.riskRadar.payoutRisk.description}
                </CardContent>
              </Card>
            )}

            {filterCard(
              t.docs.riskRadar.yieldTrap.title,
              t.docs.riskRadar.yieldTrap.description,
            ) && (
              <Card
                id="yield-trap"
                className="bg-background/40 backdrop-blur-md scroll-m-20 border-red-500/20"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    {t.docs.riskRadar.yieldTrap.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {t.docs.riskRadar.yieldTrap.description}
                </CardContent>
              </Card>
            )}

            {/* Supported Brokers */}
            <h2
              id="supported-brokers"
              className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b border-border pb-2 scroll-m-20"
            >
              {t.docs.supportedBrokers.title}
            </h2>
            <p className="text-muted-foreground mb-6">{t.docs.supportedBrokers.description}</p>

            {filterCard(
              t.docs.supportedBrokers.title,
              Object.values(t.docs.supportedBrokers).join(" "),
            ) && (
              <div className="grid gap-6">
                <Card className="bg-background/40 backdrop-blur-md border-emerald-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-emerald-400">
                      <FileText className="h-5 w-5" />
                      {t.docs.supportedBrokers.sinacorTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t.docs.supportedBrokers.sinacorDesc}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">XP</span>
                        <span className="text-muted-foreground text-[10px]">
                          02.332.886/0001-04
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">Clear</span>
                        <span className="text-muted-foreground text-[10px]">
                          02.332.886/0011-78
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">Rico</span>
                        <span className="text-muted-foreground text-[10px]">
                          02.332.886/0016-82
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">Modal</span>
                        <span className="text-muted-foreground text-[10px]">
                          05.389.174/0001-01
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">BTG Pactual</span>
                        <span className="text-muted-foreground text-[10px]">
                          43.815.158/0001-22
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">Banco Inter</span>
                        <span className="text-muted-foreground text-[10px]">
                          18.945.670/0001-46
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">NuInvest</span>
                        <span className="text-muted-foreground text-[10px]">
                          62.169.875/0001-79
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">Órama</span>
                        <span className="text-muted-foreground text-[10px]">
                          13.293.225/0001-25
                        </span>
                      </Badge>
                      <Badge variant="outline" className="justify-between p-2 font-normal">
                        <span className="font-semibold">Genial</span>
                        <span className="text-muted-foreground text-[10px]">
                          27.652.684/0001-62
                        </span>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background/40 backdrop-blur-md border-amber-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-amber-400">
                      <AlertCircle className="h-5 w-5" />
                      {t.docs.supportedBrokers.fallbackTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t.docs.supportedBrokers.fallbackDesc}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      <Badge
                        variant="outline"
                        className="justify-between p-2 font-normal border-amber-500/30 text-amber-500/80"
                      >
                        <span className="font-semibold text-amber-500">Itaú</span>
                        <span className="text-[10px]">61.194.353/0001-64</span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className="justify-between p-2 font-normal border-amber-500/30 text-amber-500/80"
                      >
                        <span className="font-semibold text-amber-500">Bradesco/Ágora</span>
                        <span className="text-[10px]">74.014.747/0001-35</span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className="justify-between p-2 font-normal border-amber-500/30 text-amber-500/80"
                      >
                        <span className="font-semibold text-amber-500">Santander/Toro</span>
                        <span className="text-[10px]">51.014.223/0001-49</span>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background/40 backdrop-blur-md border-slate-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-400">
                      <HelpCircle className="h-5 w-5" />
                      {t.docs.supportedBrokers.howToAddTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground leading-relaxed space-y-2 whitespace-pre-line bg-muted/20 p-4 rounded-md border border-border">
                      {t.docs.supportedBrokers.howToAddDesc}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Glossary */}
            <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b border-border pb-2">
              {t.docs.glossary.title}
            </h2>

            {filterCard(t.docs.glossary.title, Object.values(t.docs.glossary).join(" ")) && (
              <Card id="glossary" className="bg-background/40 backdrop-blur-md scroll-m-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HelpCircle className="h-5 w-5 text-slate-400" />
                    {t.docs.glossary.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">FII</p>
                      <p className="text-xs text-muted-foreground">{t.docs.glossary.fii}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">REIT</p>
                      <p className="text-xs text-muted-foreground">{t.docs.glossary.reit}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">LPA / EPS</p>
                      <p className="text-xs text-muted-foreground">{t.docs.glossary.lpa}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">VPA / Book Value</p>
                      <p className="text-xs text-muted-foreground">{t.docs.glossary.vpa}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">JCP</p>
                      <p className="text-xs text-muted-foreground">{t.docs.glossary.jcp}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
