import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Trophy, Target, Info } from "lucide-react";
import { useUserSettings } from "@/lib/useUserSettings";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { useFIProgress } from "@/lib/useFIProgress";

function formatDuration(months: number, t: any): string {
  if (!isFinite(months) || months > 1200) return t.fiMode.moreThan100;
  if (months <= 0) return t.fiMode.achieved;

  const years = Math.floor(months / 12);
  const remainingMonths = Math.ceil(months % 12);

  const parts = [];
  // Hardcoded for now but let's replace with simple translation later or keep simple
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (remainingMonths > 0)
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`);

  return t.fiMode.monthsRemaining.replace("{time}", parts.join(" e "));
}

export function FIProgressCard() {
  const { settings, updateSettings } = useUserSettings();
  const { isAppLoading } = useValuedPortfolio();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const usdRate = fx?.USDBRL ?? 5.5;
  const { locale, t } = useI18n();

  const convertToBRL = useCallback((value: number, curr: string) => {
    if (curr === "USD") return value * usdRate;
    return value;
  }, [usdRate]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempCost, setTempCost] = useState(settings.monthlyLivingCostGoal?.toString() || "");
  const [tempContribution, setTempContribution] = useState(
    settings.estimatedMonthlyContribution?.toString() || "1000",
  );

  const currency = settings.displayCurrency;

  const { coveragePercent, isReached, monthsToFI, monthlyIncomeBRL } = useFIProgress();

  // We need to work in the user's selected currency
  // Inverse convert if needed: BRL to USD
  const toUserCurrency = useCallback((valueBRL: number) => {
    if (currency === "USD") {
      // We can use a simple inverse. Assuming exchangeRate is BRL/USD
      // But wait, convertToBRL(1, "USD") returns 1 * exchangeRate.
      // So we divide by convertToBRL(1, "USD").
      const rate = convertToBRL(1, "USD") || 1;
      return valueBRL / rate;
    }
    return valueBRL;
  }, [currency, convertToBRL]);

  const currentMonthlyIncome = toUserCurrency(monthlyIncomeBRL);
  const monthlyCostGoal = settings.monthlyLivingCostGoal || 0;

  const isSetup = monthlyCostGoal > 0;

  const handleSaveSettings = () => {
    const cost = parseFloat(tempCost);
    const contrib = parseFloat(tempContribution);

    updateSettings({
      monthlyLivingCostGoal: isNaN(cost) ? undefined : cost,
      estimatedMonthlyContribution: isNaN(contrib) ? undefined : contrib,
    });
    toast.success(t.fiMode.settingsSaved);
    setIsSettingsOpen(false);
  };

  if (isAppLoading) {
    return (
      <div className="w-full mb-6">
        <Skeleton className="h-[120px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full mb-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md shadow-sm">
        {/* Glow Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {isReached ? (
            <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-warning/10 blur-[100px] rounded-full animate-pulse" />
          ) : (
            <div className="absolute -top-1/2 -left-1/4 w-[80%] h-[120%] bg-primary/10 blur-[80px] rounded-full" />
          )}
        </div>

        <div className="relative z-10 p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6">
          {/* Left section: Info & Settings */}
          <div className="w-full md:w-1/3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground tracking-widest">
                  Independência financeira
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <CurrencyToggle
                  value={currency === "USD" ? "US" : "BR"}
                  onChange={(v) => updateSettings({ displayCurrency: v === "US" ? "USD" : "BRL" })}
                />
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent closeLabel={t.common.close} className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t.fiMode.configTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>
                          {t.fiMode.monthlyCostGoal} ({currency})
                        </Label>
                        <Input
                          type="number"
                          placeholder={t.fiMode.monthlyCostGoalPlaceholder}
                          value={tempCost}
                          onChange={(e) => setTempCost(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {t.fiMode.monthlyContribution} ({currency})
                        </Label>
                        <Input
                          type="number"
                          placeholder={t.fiMode.monthlyContributionPlaceholder}
                          value={tempContribution}
                          onChange={(e) => setTempContribution(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleSaveSettings}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                      >
                        {t.fiMode.saveGoal}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {!isSetup ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {t.fiMode.subtitle}
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-primary/20 text-primary hover:bg-primary/30 w-full font-medium"
                >
                  {t.fiMode.activate}
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-foreground">
                    <AnimatedNumber
                      value={currentMonthlyIncome}
                      prefix={currency === "BRL" ? "R$ " : "US$ "}
                      decimals={0}
                      delay={100}
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {formatCurrency(monthlyCostGoal, currency, locale)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  {t.fiMode.passiveIncome}
                </p>
                <p className="text-[9px] text-muted-foreground/70 italic mt-1">
                  Valores consolidados com base na cotação atual.
                </p>
              </div>
            )}
          </div>

          {/* Right section: Progress Bar & Countdown */}
          {isSetup && (
            <div className="w-full md:w-2/3 flex flex-col justify-center">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-1.5">
                  {isReached && <Trophy className="w-4 h-4 text-warning" />}
                  <span
                    className={`text-xl font-bold ${isReached ? "text-warning" : "text-success"}`}
                  >
                    <AnimatedNumber value={coveragePercent} suffix="%" decimals={1} delay={300} />
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">{t.fiMode.covered}</span>
                </div>

                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">
                    {isReached
                      ? t.fiMode.achieved
                      : formatDuration(monthsToFI ?? Infinity, t)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full bg-foreground/5 rounded-full overflow-hidden relative border border-border/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${coveragePercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className={`absolute left-0 top-0 h-full rounded-full ${
                    isReached
                      ? "bg-gradient-to-r from-yellow-500 to-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                      : "bg-gradient-to-r from-primary to-primary/80"
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
