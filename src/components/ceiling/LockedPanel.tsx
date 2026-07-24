import { useAuthModal } from "@/lib/auth-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function LockedPanel() {
  const { openAuthModal } = useAuthModal();
  return (
    <Card className="border-dashed border-border/60 bg-card/30">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sign in to save your portfolio, project dividends, and simulate allocations.
        </p>
        <Button
          type="button"
          onClick={() => openAuthModal()}
          className="mt-1 bg-success text-success-foreground hover:bg-success/90"
        >
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}
