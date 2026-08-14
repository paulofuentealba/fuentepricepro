import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";

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
  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="space-y-4 max-w-4xl">
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h2 className="text-xl font-semibold mb-2">Feature Gates</h2>
          <p className="text-muted-foreground">Manage feature flags for the application.</p>
        </div>
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h2 className="text-xl font-semibold mb-2">Ingestion Log</h2>
          <p className="text-muted-foreground">View data ingestion history and status.</p>
        </div>
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <p className="text-muted-foreground">Manage user accounts and permissions.</p>
        </div>
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h2 className="text-xl font-semibold mb-2">Cloud Costs (Minimal)</h2>
          <p className="text-muted-foreground">Basic cloud cost overview (placeholder).</p>
        </div>
      </div>
    </div>
  );
}