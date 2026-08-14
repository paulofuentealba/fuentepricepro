import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureGatesTab } from "@/components/admin/FeatureGatesTab";
import { IngestionLogTab } from "@/components/admin/IngestionLogTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { CloudCostsCard } from "@/components/admin/CloudCostsCard";
import { useI18n } from "@/lib/i18n-provider";

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
            <FeatureGatesTab />
          </TabsContent>
          <TabsContent value="ingestionLog">
            <IngestionLogTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="cloudCosts">
            <CloudCostsCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
