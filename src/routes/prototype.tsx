import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/prototype")({
  component: PrototypePage,
});

function PrototypePage() {
  const [isProTerminal, setIsProTerminal] = useState(false);

  return (
    <div className={isProTerminal ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Toggle Theme Banner */}
        <div className="bg-slate-800 text-white p-4 flex flex-col sm:flex-row justify-between items-center z-50 relative gap-4">
          <div>
            <h1 className="text-xl font-bold">Protótipo Fiel de UI (Épico 4)</h1>
            <p className="text-sm text-slate-300">
              Alterne entre a UI Atual (Light) e o Pro Terminal Concept (Dark)
            </p>
          </div>
          <Button
            onClick={() => setIsProTerminal(!isProTerminal)}
            className="bg-white text-slate-900 hover:bg-slate-200 font-semibold"
          >
            {isProTerminal ? "☀️ Ver UI Clean (Atual)" : "🌙 Ver Pro Terminal (Futuro)"}
          </Button>
        </div>

        {/* 1. Sticky Guest Banner (LGPD / Onboarding) */}
        <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 p-3 flex justify-center items-center gap-2 text-sm font-medium">
          <Sparkles className="h-5 w-5 shrink-0" />
          <span>
            <strong>Gostou desta análise?</strong> Crie uma conta gratuita ou faça login com o
            Google para salvar esses ativos na sua Watchlist e acessá-los de qualquer dispositivo.
          </span>
        </div>

        <div className="max-w-5xl mx-auto p-6 sm:p-12 space-y-16">
          {/* 2. LGPD Auth Modal Mock */}
          <section>
            <div className="mb-6 border-l-4 border-primary pl-4">
              <h2 className="text-2xl font-semibold">1. Auth Modal com Consentimento (LGPD)</h2>
              <p className="text-muted-foreground">
                Textos persuasivos e obrigação de aceite dos termos jurídicos.
              </p>
            </div>

            <Card className="max-w-md mx-auto border-border/60 bg-card/60 backdrop-blur shadow-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl tracking-tight">Domine seu portfólio.</CardTitle>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  Acesse inteligência artificial e métricas institucionais. Continue com sua conta
                  para sincronizar seus dados na nuvem.
                </p>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <Button className="w-full py-6 font-medium text-base shadow-sm" variant="outline">
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar com Google
                </Button>

                <div className="flex items-start space-x-3 mt-6 p-4 border border-border/50 rounded-lg bg-muted/20">
                  <Checkbox id="terms" className="mt-0.5" />
                  <label
                    htmlFor="terms"
                    className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
                  >
                    Ao continuar, confirmo que li e concordo com os{" "}
                    <a
                      href="#"
                      className="underline font-medium text-foreground hover:text-primary"
                    >
                      Termos de Uso
                    </a>{" "}
                    e a{" "}
                    <a
                      href="#"
                      className="underline font-medium text-foreground hover:text-primary"
                    >
                      Política de Privacidade
                    </a>{" "}
                    do Fuente Price Pro.
                  </label>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 3. Pro Gate / Blur Effect */}
          <section>
            <div className="mb-6 border-l-4 border-success pl-4">
              <h2 className="text-2xl font-semibold">
                2. Efeito Blur & Gatilho de Conversão (Pro Gate)
              </h2>
              <p className="text-muted-foreground">
                O comportamento quando um usuário tenta acessar uma área Premium (Ex: Snowball
                Effect).
              </p>
            </div>

            <div className="relative rounded-2xl border border-border/80 bg-card/40 overflow-hidden min-h-[400px] flex items-center justify-center shadow-sm">
              {/* Fake Background Content (Simulating a complex chart) */}
              <div className="absolute inset-0 opacity-30 pointer-events-none p-8 flex flex-col justify-between">
                <div className="h-10 bg-muted/60 rounded-md w-1/4 mb-8"></div>
                <div className="flex gap-4 h-48 items-end">
                  <div className="w-full bg-success/20 rounded-t-md h-[40%]"></div>
                  <div className="w-full bg-success/30 rounded-t-md h-[60%]"></div>
                  <div className="w-full bg-success/40 rounded-t-md h-[80%]"></div>
                  <div className="w-full bg-success/50 rounded-t-md h-[100%]"></div>
                </div>
              </div>

              {/* Blur Overlay - This is the actual Pro Gate */}
              <div className="absolute inset-0 backdrop-blur-xl bg-background/50 z-10 flex flex-col items-center justify-center p-6 text-center transition-all duration-500">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30 mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <Lock className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Funcionalidade Exclusiva PRO
                </h3>
                <p className="text-base text-muted-foreground max-w-lg mb-8 leading-relaxed">
                  Eleve o patamar dos seus investimentos. Desbloqueie projeções avançadas de
                  dividendos, inteligência artificial e análises profundas de risco. Pare de
                  investir no escuro.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-sm">
                  <Button className="bg-success text-success-foreground hover:bg-success/90 font-bold py-6 text-base shadow-lg hover:shadow-success/20 transition-all">
                    Conhecer os Planos PRO
                  </Button>
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Comparar Funcionalidades
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
