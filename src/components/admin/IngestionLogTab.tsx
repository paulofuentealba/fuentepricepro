import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/formatters";
import { useAdminIdToken } from "@/lib/admin/useAdminIdToken";
import { getIngestionLogFn, type IngestionLogEntry } from "@/lib/api/admin";

const STATUS_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  passed: "success",
  failed: "destructive",
  error: "destructive",
  skipped: "secondary",
  invalid: "destructive",
  warning: "warning",
};

const STATUS_LABEL_KEY: Record<string, "statusPassed" | "statusFailed" | "statusError" | "statusSkipped" | "statusInvalid" | "statusWarning"> = {
  passed: "statusPassed",
  failed: "statusFailed",
  error: "statusError",
  skipped: "statusSkipped",
  invalid: "statusInvalid",
  warning: "statusWarning",
};

function formatTimestamp(ms: number | null, locale: ReturnType<typeof useI18n>["locale"]): string {
  if (ms === null) return "—";
  return new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(
    new Date(ms),
  );
}

export function IngestionLogTab() {
  const { t, locale } = useI18n();
  const getIdToken = useAdminIdToken();

  const [entries, setEntries] = useState<IngestionLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const result = await getIngestionLogFn({ data: { idToken } });
        if (!cancelled) setEntries(result);
      } catch (error) {
        console.error("[IngestionLogTab] load failed:", error);
        if (!cancelled) toast.error(t.admin.ingestionLog.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, t]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const rows = entries ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.ingestionLog.title}</CardTitle>
        <CardDescription>{t.admin.ingestionLog.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.admin.ingestionLog.empty}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.ingestionLog.source}</TableHead>
                    <TableHead>{t.admin.ingestionLog.date}</TableHead>
                    <TableHead>{t.admin.ingestionLog.status}</TableHead>
                    <TableHead>{t.admin.ingestionLog.lastUpdated}</TableHead>
                    <TableHead>{t.admin.ingestionLog.lastError}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.source}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(entry.counts)
                            .filter(([, count]) => count > 0)
                            .map(([status, count]) => (
                              <Badge key={status} variant={STATUS_VARIANT[status] ?? "outline"}>
                                {t.admin.ingestionLog[STATUS_LABEL_KEY[status] ?? "statusPassed"]}: {count}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatTimestamp(entry.updatedAtMs, locale)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {entry.lastError ? `${entry.lastError.ticker ?? ""} ${entry.lastError.detail ?? ""}`.trim() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile stacked cards */}
            <div className="space-y-3 md:hidden">
              {rows.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border/50 bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{entry.source}</span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {Object.entries(entry.counts)
                      .filter(([, count]) => count > 0)
                      .map(([status, count]) => (
                        <Badge key={status} variant={STATUS_VARIANT[status] ?? "outline"}>
                          {t.admin.ingestionLog[STATUS_LABEL_KEY[status] ?? "statusPassed"]}: {count}
                        </Badge>
                      ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.admin.ingestionLog.lastUpdated}: {formatTimestamp(entry.updatedAtMs, locale)}
                  </div>
                  {entry.lastError && (
                    <div className="mt-1 text-xs text-destructive">
                      {entry.lastError.ticker ?? ""} {entry.lastError.detail ?? ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
