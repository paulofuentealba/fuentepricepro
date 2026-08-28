import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/onboarding/")({
  beforeLoad: async () => {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (!auth.currentUser) {
      throw redirect({ to: "/auth", search: { mode: "signup", returnTo: "/onboarding/metas" } });
    }

    throw redirect({ to: "/profile", search: { returnTo: "/onboarding/metas" } });
  },
});
