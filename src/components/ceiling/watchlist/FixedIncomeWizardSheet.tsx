import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { projectFixedIncomeValueAtMaturity } from "@/lib/calculations";
import { useWatchlist, makeId } from "@/lib/watchlist";
import { useQuery } from "@tanstack/react-query";
import { macroRatesQueryOptions } from "@/lib/queryOptions";
import { ArrowRight, CheckCircle2, ChevronLeft, Shield } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type IndexerType = "CDI" | "IPCA" | "PRE";

export function FixedIncomeWizardSheet({ open, onOpenChange }: Props) {
  const { t, locale } = useI18n();
  const { upsert } = useWatchlist();
  const { data: macroRates } = useQuery(macroRatesQueryOptions());

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [indexer, setIndexer] = useState<IndexerType>("CDI");
  const [assetName, setAssetName] = useState("");
  const [investedAmount, setInvestedAmount] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");

  // Default dates
  const todayStr = new Date().toISOString().split("T")[0];
  const nextYearStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(todayStr);
  const [maturityDate, setMaturityDate] = useState(nextYearStr);

  const resetState = () => {
    setStep(1);
    setIndexer("CDI");
    setAssetName("");
    setInvestedAmount("");
    setRate("");
    setStartDate(todayStr);
    setMaturityDate(nextYearStr);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(resetState, 300); // reset after close animation
    }
    onOpenChange(isOpen);
  };

  const handleNextStep1 = (selectedIndexer: IndexerType) => {
    setIndexer(selectedIndexer);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !investedAmount || !rate || !startDate || !maturityDate) {
      toast.error(t.watchlist.fixedIncomeWizard.fillAll);
      return;
    }
    setStep(3);
  };

  const handleConfirm = () => {
    if (!assetName || !investedAmount || !rate || !startDate || !maturityDate) return;

    const ticker = `FI_${Date.now()}`;
    upsert({
      id: makeId(ticker, "FIXED_INCOME"),
      ticker,
      name: assetName,
      type: "FIXED_INCOME",
      currency: "BRL",
      quantity: 1,
      averagePrice: Number(investedAmount),
      currentPrice: Number(investedAmount),
      targetYield: 6,
      annualDividend: 0,
      ceilingPrice: 0,
      safetyMargin: 0,
      paymentMonths: [],
      payoutRatio: null,
      targetMonthlyIncome: null,
      customTaxRate: null,
      sector: "",
      indexer,
      rate: Number(rate),
      startDate: new Date(startDate).toISOString(),
      maturityDate: new Date(maturityDate).toISOString(),
      addedAt: Date.now(),
    });

    toast.success(t.watchlist.fixedIncomeWizard.success);
    handleOpenChange(false);
  };

  // Projections for Step 3
  let projectedBalance = 0;
  let projectedProfit = 0;
  if (step === 3 && investedAmount && rate) {
    const proj = projectFixedIncomeValueAtMaturity(
      Number(investedAmount),
      indexer,
      Number(rate),
      startDate,
      maturityDate,
      macroRates,
    );
    projectedBalance = proj.projectedBalance;
    projectedProfit = proj.projectedProfit;
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        closeLabel={t.common.close}
        side="right"
        className="w-full sm:max-w-md border-l border-border/60 bg-background/80 backdrop-blur-xl text-foreground p-0 flex flex-col shadow-2xl"
      >
        <SheetHeader className="px-6 py-6 border-b border-border/60 relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px]" />

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <Shield className="h-5 w-5 text-emerald-400" />
            <SheetTitle className="text-foreground">
              {t.watchlist.fixedIncomeWizard.title}
            </SheetTitle>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 px-1">
            <div
              className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted"}`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted"}`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted"}`}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="mb-6 text-lg font-medium text-foreground">
                {t.watchlist.fixedIncomeWizard.selectIndexer}
              </h3>
              <div className="flex flex-col gap-4">
                {(["CDI", "IPCA", "PRE"] as const).map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleNextStep1(idx)}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 p-4 transition-all hover:bg-muted/80 hover:border-emerald-500/50 group"
                  >
                    <span className="text-lg font-semibold text-foreground">{idx}</span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <form
              id="fi-details-form"
              onSubmit={handleNextStep2}
              className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="assetName" className="text-muted-foreground">
                  {t.watchlist.fixedIncomeWizard.assetName}
                </Label>
                <Input
                  id="assetName"
                  placeholder={t.watchlist.fixedIncomeWizard.assetNamePlaceholder}
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="investedAmount" className="text-muted-foreground">
                  {t.watchlist.fixedIncomeWizard.investedAmount}
                </Label>
                <Input
                  id="investedAmount"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={investedAmount}
                  onChange={(e) => setInvestedAmount(Number(e.target.value))}
                  className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="rate" className="text-muted-foreground">
                  {indexer === "CDI"
                    ? t.watchlist.fixedIncomeWizard.rateCdi
                    : indexer === "IPCA"
                      ? t.watchlist.fixedIncomeWizard.rateIpca
                      : t.watchlist.fixedIncomeWizard.ratePre}
                </Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  placeholder={indexer === "CDI" ? "110" : "6.5"}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="startDate" className="text-muted-foreground">
                    {t.watchlist.fixedIncomeWizard.startDate}
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-card/50 border-border/50 text-foreground focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="maturityDate" className="text-muted-foreground">
                    {t.watchlist.fixedIncomeWizard.maturityDate}
                  </Label>
                  <Input
                    id="maturityDate"
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="bg-card/50 border-border/50 text-foreground focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    required
                  />
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-5 flex flex-col gap-4">
                <h3 className="font-semibold text-foreground border-b border-border/50 pb-2">
                  {assetName}
                </h3>

                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <span className="block text-muted-foreground">
                      {t.watchlist.fixedIncomeWizard.principal}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(investedAmount), "BRL", locale)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">
                      {t.watchlist.fixedIncomeWizard.rate}
                    </span>
                    <span className="font-medium text-foreground">
                      {indexer === "CDI"
                        ? `${rate}% CDI`
                        : indexer === "IPCA"
                          ? `IPCA + ${rate}%`
                          : `${rate}%`}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">
                      {t.watchlist.fixedIncomeWizard.start}
                    </span>
                    <span className="font-medium text-foreground">{startDate}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">
                      {t.watchlist.fixedIncomeWizard.maturity}
                    </span>
                    <span className="font-medium text-foreground">{maturityDate}</span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-6 text-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-[50px]" />

                <span className="block text-sm font-medium text-emerald-400/80 mb-2">
                  {t.watchlist.fixedIncomeWizard.projectedValue}
                </span>
                <span className="block text-4xl font-bold text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                  {formatCurrency(projectedBalance, "BRL", locale)}
                </span>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    +{formatCurrency(projectedProfit, "BRL", locale)}{" "}
                    {t.watchlist.fixedIncomeWizard.profit}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/60 bg-background/50 backdrop-blur-md">
          {step === 1 && (
            <Button
              variant="outline"
              className="w-full border-border/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={() => handleOpenChange(false)}
            >
              {t.watchlist.fixedIncomeWizard.cancel}
            </Button>
          )}
          {step === 2 && (
            <Button
              type="submit"
              form="fi-details-form"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              {t.watchlist.fixedIncomeWizard.calculate}
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={handleConfirm}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              {t.watchlist.fixedIncomeWizard.confirm}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
