import { useState } from "react";
import { FileType2, Database } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { toast } from "sonner";
import { DEV_MOCK_DATA, DEV_MOCK_TRANSACTIONS } from "@/__fixtures__/devMockData";
import { WatchlistIO } from "./WatchlistIO";

export function DataManagement() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { items, remove, upsertManyAsync } = useWatchlist();

  return (
    <div className="flex items-center gap-2">
      <WatchlistIO items={items} />
      {import.meta.env.DEV && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => {
            if (
              !window.confirm(t.toasts.confirmRestoreMockData)
            )
              return;

            // 1. Wipe existing watchlist items
            items.forEach((item) => remove(item.id));

            // 2. Wipe and restore transactions in localStorage
            window.localStorage.setItem(
              "ceilingPricePro.transactions.v1",
              JSON.stringify(DEV_MOCK_TRANSACTIONS),
            );

            // 3. Wait briefly, then insert mock watchlist data and invalidate all queries
            setTimeout(() => {
              upsertManyAsync(DEV_MOCK_DATA).then(() => {
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                queryClient.invalidateQueries({ queryKey: ["watchlist"] });
                queryClient.invalidateQueries({ queryKey: ["valuedPortfolio"] });
                toast.success(t.toasts.mockDataRestored);
              });
            }, 300);
          }}
          title="Restore Mock Data & Transactions (DEV ONLY)"
        >
          <Database className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

