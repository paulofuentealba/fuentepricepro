import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { projectFixedIncomeValueAtMaturity } from "@/lib/calculations";
import { useWatchlist, makeId } from "@/lib/watchlist";
import { useTransactions } from "@/lib/transactions";
import { useQuery } from "@tanstack/react-query";
import { macroRatesQueryOptions } from "@/lib/queryOptions";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getLocalDateISOString } from "@/lib/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type IndexerType = "CDI" | "IPCA" | "PRE";

/**
 * Single-screen "Adicionar Renda Fixa" dialog — same visual/structural
 * pattern as `NewContributionDialog.tsx` (Dialog, not Sheet). Replaces the
 * old 3-step `FixedIncomeWizardSheet.tsx`: Indexador, Nome do Ativo, Valor
 * Investido, Taxa, Data de Início e Data de Vencimento are all visible and
 * editable at once, with a projected-value preview that updates reactively
 * as the fields are filled instead of only appearing on a final step.
 *
 * All calculation/persistence logic (`projectFixedIncomeValueAtMaturity`,
 * `macroRatesQueryOptions`, the watchlist item + initial transaction
 * creation) is reused unchanged from the previous wizard — only the
 * presentation changed from 3 steps to 1.
 */
export function AddFixedIncomeDialog({ open, onOpenChange }: Props) {
  const { t, locale } = useI18n();
  const { upsert } = useWatchlist();
  const { upsert: upsertTransaction } = useTransactions();
  const { data: macroRates } = useQuery(macroRatesQueryOptions());

  const [indexer, setIndexer] = useState<IndexerType>("CDI");
  const [assetName, setAssetName] = useState("");
  const [investedAmount, setInvestedAmount] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");

  const todayStr = getLocalDateISOString();
  const nextYearStr = getLocalDateISOString(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(todayStr);
  const [maturityDate, setMaturityDate] = useState(nextYearStr);

  const resetState = () => {
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

  const isComplete = !!(assetName && investedAmount && rate && startDate && maturityDate);

  const { projectedBalance, projectedProfit } = isComplete
    ? projectFixedIncomeValueAtMaturity(
        Number(investedAmount),
        indexer,
        Number(rate),
        startDate,
        maturityDate,
        macroRates,
      )
    : { projectedBalance: 0, projectedProfit: 0 };

  const handleConfirm = () => {
    if (!isComplete) return;

    const ticker = `FI_${Date.now()}`;
    const amount = Number(investedAmount);
    const startTimestamp = startDate ? new Date(startDate).getTime() : Date.now();

    upsertTransaction({
      id: `tx-${ticker}-${startTimestamp}`,
      ticker,
      type: "buy",
      date: startTimestamp,
      quantity: 1,
      pricePerShare: amount,
      notes: "Aporte Inicial Renda Fixa",
    });

    upsert({
      id: makeId(ticker, "FIXED_INCOME"),
      ticker,
      name: assetName,
      type: "FIXED_INCOME",
      currency: "BRL",
      quantity: 1,
      averagePrice: amount,
      currentPrice: amount,
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
      investingSince: startTimestamp,
    });

    toast.success(t.watchlist.fixedIncomeWizard.success);
    handleOpenChange(false);
  };

  const rateLabel =
    indexer === "CDI"
      ? t.watchlist.fixedIncomeWizard.rateCdi
      : indexer === "IPCA"
        ? t.watchlist.fixedIncomeWizard.rateIpca
        : t.watchlist.fixedIncomeWizard.ratePre;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>{t.watchlist.fixedIncomeWizard.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.watchlist.fixedIncomeWizard.selectIndexer}</Label>
              <Select value={indexer} onValueChange={(v: IndexerType) => setIndexer(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="IPCA">IPCA</SelectItem>
                  <SelectItem value="PRE">PRE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fi-rate">{rateLabel}</Label>
              <Input
                id="fi-rate"
                type="number"
                step="0.01"
                placeholder={indexer === "CDI" ? "110" : "6.5"}
                value={rate}
                onChange={(e) => setRate(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fi-assetName">{t.watchlist.fixedIncomeWizard.assetName}</Label>
            <Input
              id="fi-assetName"
              placeholder={t.watchlist.fixedIncomeWizard.assetNamePlaceholder}
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fi-investedAmount">{t.watchlist.fixedIncomeWizard.investedAmount}</Label>
            <Input
              id="fi-investedAmount"
              type="number"
              step="0.01"
              placeholder="1000.00"
              value={investedAmount}
              onChange={(e) => setInvestedAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fi-startDate">{t.watchlist.fixedIncomeWizard.startDate}</Label>
              <DatePicker
                id="fi-startDate"
                value={startDate}
                onChange={(_d, dateStr) => setStartDate(dateStr)}
                rangeMode="past"
                disabled={(d) => d > new Date()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fi-maturityDate">{t.watchlist.fixedIncomeWizard.maturityDate}</Label>
              <DatePicker
                id="fi-maturityDate"
                value={maturityDate}
                onChange={(_d, dateStr) => setMaturityDate(dateStr)}
                rangeMode="future"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-success/20 bg-success/10 p-5 text-center">
            <span className="block text-xs font-medium text-success/80 mb-1.5 uppercase tracking-wider">
              {t.watchlist.fixedIncomeWizard.projectedValue}
            </span>
            <span className="block text-2xl font-bold text-success">
              {formatCurrency(projectedBalance, "BRL", locale)}
            </span>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                +{formatCurrency(projectedProfit, "BRL", locale)} {t.watchlist.fixedIncomeWizard.profit}
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!isComplete}
            onClick={handleConfirm}
          >
            {t.watchlist.fixedIncomeWizard.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
