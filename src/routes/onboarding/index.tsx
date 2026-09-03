import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";
import { verifySessionFn } from "@/lib/verifySession.functions";

export const Route = createFileRoute("/onboarding/")({
  beforeLoad: async () => {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (!auth.currentUser) {
      const { authenticated } = await verifySessionFn();
      if (!authenticated) {
        throw redirect({ to: "/auth", search: { mode: "signup", returnTo: "/onboarding/metas" } });
      }
    }

    throw redirect({ to: "/profile", search: { returnTo: "/onboarding/metas" } });
  },
});
