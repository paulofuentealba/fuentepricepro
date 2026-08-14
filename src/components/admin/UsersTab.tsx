import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/formatters";
import { useAdminIdToken } from "@/lib/admin/useAdminIdToken";
import { listUsersFn, type AdminUserRow } from "@/lib/api/admin";

function formatDate(iso: string | null, locale: ReturnType<typeof useI18n>["locale"]): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(d);
}

export function UsersTab() {
  const { t, locale } = useI18n();
  const getIdToken = useAdminIdToken();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");

  async function loadPage(pageToken?: string) {
    const idToken = await getIdToken();
    const result = await listUsersFn({ data: { idToken, pageToken } });
    setUsers((prev) => (pageToken ? [...prev, ...result.users] : result.users));
    setNextPageToken(result.nextPageToken);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadPage();
      } catch (error) {
        console.error("[UsersTab] load failed:", error);
        if (!cancelled) toast.error(t.admin.users.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadMore() {
    if (!nextPageToken) return;
    setLoadingMore(true);
    try {
      await loadPage(nextPageToken);
    } catch (error) {
      console.error("[UsersTab] load more failed:", error);
      toast.error(t.admin.users.loadFailed);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [users, query]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.users.title}</CardTitle>
        <CardDescription>{t.admin.users.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.admin.users.searchPlaceholder}
          className="mb-4"
        />

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.admin.users.empty}</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.users.name}</TableHead>
                    <TableHead>{t.admin.users.email}</TableHead>
                    <TableHead>{t.admin.users.plan}</TableHead>
                    <TableHead>{t.admin.users.createdAt}</TableHead>
                    <TableHead>{t.admin.users.lastLoginAt}</TableHead>
                    <TableHead>{t.admin.users.provider}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u, i) => (
                    <TableRow key={u.email ?? i}>
                      <TableCell className="font-medium">{u.displayName ?? t.admin.users.noName}</TableCell>
                      <TableCell>{u.email ?? t.admin.users.noName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.subscriptionStatus ?? "free"}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.createdAt, locale)}</TableCell>
                      <TableCell>{formatDate(u.lastLoginAt, locale)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.providerId ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filtered.map((u, i) => (
                <div key={u.email ?? i} className="rounded-lg border border-border/50 bg-card p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold">{u.displayName ?? t.admin.users.noName}</span>
                    <Badge variant="outline">{u.subscriptionStatus ?? "free"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{u.email ?? t.admin.users.noName}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>{t.admin.users.createdAt}: {formatDate(u.createdAt, locale)}</span>
                    <span>{t.admin.users.lastLoginAt}: {formatDate(u.lastLoginAt, locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {nextPageToken && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? t.common.loading : t.admin.users.loadMore}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
