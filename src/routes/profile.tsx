import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";
import { InvestorProfileFlow } from "@/components/onboarding/InvestorProfileFlow";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { verifySessionFn } from "@/lib/verifySession.functions";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    returnTo: typeof search.returnTo === "string" && search.returnTo.trim().length > 0 ? search.returnTo : undefined,
  }),
  beforeLoad: async ({ search }) => {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (auth.currentUser) return;

    // See verifySession.functions.ts — a hard navigation/reload has no
    // client-side Firebase session to read, so cross-check the cookie
    // server-side before redirecting.
    const { authenticated } = await verifySessionFn();
    if (authenticated) return;

    throw redirect({ to: "/auth", search: { returnTo: search.returnTo } });
  },
  component: ProfilePage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { returnTo } = useSearch({ from: "/profile" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <InvestorProfileFlow
        isModal={false}
        onComplete={() => {
          navigate({ to: returnTo ?? "/" });
        }}
      />
    </div>
  );
}
