import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  RefreshCw,
  Target,
  Coins,
  Calendar,
  Landmark,
  Flame,
  Newspaper,
  GitCompare,
  Filter,
  Search,
  AlertTriangle,
  FileUp,
  FileText,
  HelpCircle,
  ShieldCheck,
  Building,
  AlertCircle,
  ArrowRight,
  Shield,
  Banknote,
  LineChart,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-provider";

export function AppDirectoryTab() {
  const { t } = useI18n();
  const D = t.docs;
  const AD = D.appDirectory;
  const SB = D.supportedBrokers;
  const G = D.glossary;
  const C = D.concepts;

  const appScreens = [
    {
      title: AD.cockpitTitle,
      desc: AD.cockpitDesc,
      icon: LayoutDashboard,
      to: "/app",
      badge: "Dashboard",
    },
    {
      title: AD.myportfolioTitle,
      desc: AD.myportfolioDesc,
      icon: Briefcase,
      to: "/app/myportfolio",
      badge: "Portfólio",
    },
    {
      title: AD.reinvestirTitle,
      desc: AD.reinvestirDesc,
      icon: RefreshCw,
      to: "/app/reinvestir",
      badge: "Decidir",
    },
    {
      title: AD.contributionPlanTitle,
      desc: AD.contributionPlanDesc,
      icon: Target,
      to: "/app/contributionplan",
      badge: "Decidir",
    },
    {
      title: AD.withdrawTitle,
      desc: AD.withdrawDesc,
      icon: Coins,
      to: "/app/withdraw",
      badge: "Fiscal",
    },
    {
      title: AD.incomeTitle,
      desc: AD.incomeDesc,
      icon: Calendar,
      to: "/app/income",
      badge: "Proventos",
    },
    {
      title: AD.taxTitle,
      desc: AD.taxDesc,
      icon: Landmark,
      to: "/app/tax",
      badge: "Fiscal",
    },
    {
      title: AD.goalsTitle,
      desc: AD.goalsDesc,
      icon: Flame,
      to: "/app/goals",
      badge: "FIRE",
    },
    {
      title: AD.newsTitle,
      desc: AD.newsDesc,
      icon: Newspaper,
      to: "/app/news",
      badge: "Eventos",
    },
    {
      title: AD.comparatorTitle,
      desc: AD.comparatorDesc,
      icon: GitCompare,
      to: "/app/comparator",
      badge: "Analisar",
    },
    {
      title: AD.screenerTitle,
      desc: AD.screenerDesc,
      icon: Filter,
      to: "/app/screener",
      badge: "Analisar",
    },
    {
      title: AD.exploreTitle,
      desc: AD.exploreDesc,
      icon: Search,
      to: "/app/explore",
      badge: "Analisar",
    },
    {
      title: AD.riskRadarTitle,
      desc: AD.riskRadarDesc,
      icon: AlertTriangle,
      to: "/app/riskradar",
      badge: "Riscos",
    },
    {
      title: AD.importBrokerNoteTitle,
      desc: AD.importBrokerNoteDesc,
      icon: FileUp,
      to: "/app/import-broker-note",
      badge: "Operar",
    },
  ];

  return (
    <>
      {/* DIRETÓRIO DO APLICATIVO */}
      <TabsContent value="app-directory" className="mt-0 space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{AD.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{AD.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {appScreens.map((screen) => {
            const Icon = screen.icon;
            return (
              <Card key={screen.to} className="flex flex-col justify-between border-border/60 bg-card transition-colors hover:border-primary/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm font-semibold">{screen.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {screen.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs leading-relaxed text-muted-foreground">{screen.desc}</p>
                  <div>
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary hover:text-primary">
                      <Link to={screen.to}>
                        {D.openInApp}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* CORRETORAS SUPORTADAS */}
      <TabsContent value="brokers" className="mt-0 space-y-6">
        <p className="text-sm text-muted-foreground">{SB.description}</p>

        {/* Banner Privacy by Design */}
        <div className="rounded-xl border border-success/30 bg-success/10 p-4">
          <div className="flex items-center gap-2 font-semibold text-success">
            <Shield className="h-5 w-5" />
            {SB.privacyByDesignTitle}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {SB.privacyByDesignDesc}
          </p>
        </div>

        {/* Padrão SINACOR */}
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <FileText className="h-5 w-5" />
              {SB.sinacorTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{SB.sinacorDesc}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {[
                ["XP Investimentos", "02.332.886/0001-04"],
                ["Clear Corretora", "02.332.886/0011-78"],
                ["Rico Investimentos", "02.332.886/0016-82"],
                ["ModalMais", "05.389.174/0001-01"],
                ["BTG Pactual", "43.815.158/0001-22"],
                ["Banco Inter", "18.945.670/0001-46"],
                ["NuInvest", "62.169.875/0001-79"],
                ["Órama", "13.293.225/0001-25"],
                ["Genial Investimentos", "27.652.684/0001-62"],
                ["Banco do Brasil (BB)", "00.000.000/0001-91"],
                ["Caixa Econômica Federal", "00.360.305/0001-04"],
              ].map(([name, cnpj]) => (
                <Badge key={name} variant="outline" className="justify-between p-2 font-normal">
                  <span className="font-semibold">{name}</span>
                  <span className="text-[10px] text-muted-foreground">{cnpj}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Corretoras Internacionais */}
        <Card className="border-accent/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-accent-text">
              <Building className="h-5 w-5" />
              {SB.internationalTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {SB.internationalDesc}
            </p>
            <Badge variant="outline" className="justify-between p-2 font-normal">
              <span className="font-semibold">Charles Schwab</span>
              <span className="text-[10px] text-muted-foreground">International Account (PDF & CSV)</span>
            </Badge>
          </CardContent>
        </Card>

        {/* Bancos Tradicionais */}
        <Card className="border-warning/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertCircle className="h-5 w-5" />
              {SB.fallbackTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{SB.fallbackDesc}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {[
                ["Itaú Corretora", "61.194.353/0001-64"],
                ["Bradesco / Ágora", "74.014.747/0001-35"],
                ["Santander / Toro", "51.014.223/0001-49"],
              ].map(([name, cnpj]) => (
                <Badge
                  key={name}
                  variant="outline"
                  className="justify-between border-warning/30 p-2 font-normal text-warning/90"
                >
                  <span className="font-semibold text-warning">{name}</span>
                  <span className="text-[10px]">{cnpj}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Solicitar Suporte */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {SB.requestBrokerTitle}
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {SB.requestBrokerDesc}
          </p>
        </div>
      </TabsContent>

      {/* GLOSSÁRIO */}
      <TabsContent value="glossary" className="mt-0 space-y-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              {G.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["FII", G.fii],
              ["REIT", G.reit],
              ["LPA / EPS", G.lpa],
              ["VPA / Book Value", G.vpa],
              ["JCP", G.jcp],
              ["FI-Infra", G.fiInfra],
              ["WHT (Withholding Tax)", G.wht],
              ["Hare-Niemeyer", G.hareNiemeyer],
              ["Crossover Point", G.crossoverPoint],
              ["Margem de Segurança", G.safetyMargin],
            ].map(([term, desc]) => (
              <div key={term} className="space-y-1 rounded-lg border border-border/40 bg-muted/10 p-3">
                <p className="text-sm font-semibold text-foreground">{term}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* CONCEITOS (LEGACY COMPATIBILITY) */}
      <TabsContent value="concepts" className="mt-0 grid gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-5 w-5 text-primary" />
              {C.snowball.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {C.snowball.description}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-5 w-5 text-destructive" />
              {C.taxes.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {C.taxes.description}
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
