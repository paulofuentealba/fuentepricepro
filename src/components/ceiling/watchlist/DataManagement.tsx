import { useState } from "react";
import { FileType2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { toast } from "sonner";
import { BrokerNoteUploader } from "./BrokerNoteUploader";

export function DataManagement() {
  const { upsertManyAsync } = useWatchlist();
  const { t } = useI18n();
  const [openUploader, setOpenUploader] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 border-border/50 text-success hover:text-success/90 hover:bg-success/10 gap-2"
        onClick={() => setOpenUploader(true)}
      >
        <FileType2 className="h-4 w-4" />
        <span className="hidden sm:inline-block">{t.brokerNote.importTitle}</span>
      </Button>

      {import.meta.env.DEV && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => {
            const TEMP_DATA = [
              {
                id: "brazilian_stock:PETR4",
                ticker: "PETR4",
                name: "Petrobras",
                type: "STOCK_BR",
                currency: "BRL",
                currentPrice: 38.5,
                annualDividend: 6.5,
                targetYield: 10,
                ceilingPrice: 65,
                safetyMargin: 68.8,
                quantity: 1000,
                averagePrice: 30,
                paymentMonths: [5, 8, 11, 12],
                payoutRatio: 45,
                targetMonthlyIncome: 500,
                addedAt: 1783665287715,
                customTaxRate: null,
              },
              {
                id: "fii:MXRF11",
                ticker: "MXRF11",
                name: "Maxi Renda FII",
                type: "FII",
                currency: "BRL",
                currentPrice: 10.2,
                annualDividend: 1.2,
                targetYield: 10,
                ceilingPrice: 12,
                safetyMargin: 17.6,
                quantity: 2000,
                averagePrice: 10.5,
                paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                payoutRatio: null,
                targetMonthlyIncome: 500,
                addedAt: 1783665287715,
                customTaxRate: null,
              },
              {
                id: "us_stock:AAPL",
                ticker: "AAPL",
                name: "Apple Inc.",
                type: "STOCK_US",
                currency: "USD",
                currentPrice: 185,
                annualDividend: 1,
                targetYield: 2,
                ceilingPrice: 50,
                safetyMargin: -72.9,
                quantity: 25,
                averagePrice: 170,
                paymentMonths: [2, 5, 8, 11],
                payoutRatio: 15,
                targetMonthlyIncome: 50,
                addedAt: 1783665287715,
                customTaxRate: null,
              },
            ];
            upsertManyAsync(TEMP_DATA as any).then(() => {
              toast.success("Massa de dados restaurada com sucesso!");
            });
          }}
          title="Restore Mock Data (DEV ONLY)"
        >
          <Database className="h-4 w-4" />
        </Button>
      )}

      <BrokerNoteUploader open={openUploader} onOpenChange={setOpenUploader} />
    </div>
  );
}
