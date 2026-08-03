import { useState } from "react";
import { FileType2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { toast } from "sonner";
import { DEV_MOCK_DATA } from "@/lib/__mocks__/devMockData";

export function DataManagement() {
  const { t } = useI18n();
  const { items, remove, upsertManyAsync } = useWatchlist();

  return (
    <div className="flex items-center gap-2">
      {" "}
      {import.meta.env.DEV && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => {
            if (
              !window.confirm(
                "Isso vai apagar TODOS os ativos da sua conta e restaurar a massa de dados DEV. Continuar?",
              )
            )
              return;

            // Wipe existing data iteratively
            items.forEach((item) => remove(item.id));

            // Wait briefly to allow deletions to process, then insert mock data
            setTimeout(() => {
              upsertManyAsync(DEV_MOCK_DATA).then(() => {
                toast.success(t.toasts.mockDataRestored);
              });
            }, 300);
          }}
          title="Restore Mock Data (DEV ONLY)"
        >
          <Database className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
