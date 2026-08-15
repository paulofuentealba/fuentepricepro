import { lazy, Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";

const FeatureGatesTab = lazy(() =>
  import("@/components/admin/FeatureGatesTab").then((m) => ({ default: m.FeatureGatesTab }))
);
const IngestionLogTab = lazy(() =>
  import("@/components/admin/IngestionLogTab").then((m) => ({ default: m.IngestionLogTab }))
);
const UsersTab = lazy(() =>
  import("@/components/admin/UsersTab").then((m) => ({ default: m.UsersTab }))
);
const CloudCostsCard = lazy(() =>
  import("@/components/admin/CloudCostsCard").then((m) => ({ default: m.CloudCostsCard }))
);

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    // Wait for auth to be initialized
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve();
      });
    });

    const user = auth.currentUser;
    if (!user) {
      throw redirect({ to: "/" });
    }

    // Check for isAdmin custom claim
    try {
      const idTokenResult = await user.getIdTokenResult(true); // force refresh
      if (idTokenResult.claims.isAdmin !== true) {
        throw redirect({ to: "/app" });
      }
    } catch (error) {
      console.error("[Admin Route] Error checking admin claim:", error);
      throw redirect({ to: "/app" });
    }
  },
  component: AdminPage,
});

function TabFallback() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

function AdminPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-3xl font-bold">{t.admin.title}</h1>
        <p className="mb-8 text-muted-foreground">{t.admin.subtitle}</p>

        <Tabs defaultValue="featureGates">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="featureGates">{t.admin.tabs.featureGates}</TabsTrigger>
            <TabsTrigger value="ingestionLog">{t.admin.tabs.ingestionLog}</TabsTrigger>
            <TabsTrigger value="users">{t.admin.tabs.users}</TabsTrigger>
            <TabsTrigger value="cloudCosts">{t.admin.tabs.cloudCosts}</TabsTrigger>
          </TabsList>

          <TabsContent value="featureGates">
            <Suspense fallback={<TabFallback />}>
              <FeatureGatesTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="ingestionLog">
            <Suspense fallback={<TabFallback />}>
              <IngestionLogTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="users">
            <Suspense fallback={<TabFallback />}>
              <UsersTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="cloudCosts">
            <Suspense fallback={<TabFallback />}>
              <CloudCostsCard />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
