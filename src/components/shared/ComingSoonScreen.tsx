import type { ComponentType } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";

export interface ComingSoonScreenProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

/** Shared placeholder for routes whose page exists but whose engine/data model doesn't yet
 * (as opposed to BlurredPreviewOverlay, which gates an already-built feature behind a plan). */
export function ComingSoonScreen({ icon: Icon, title, description }: ComingSoonScreenProps) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-xl p-6 mt-12">
      <Card className="border-border/60 text-center p-6">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <p className="text-xs font-display uppercase tracking-wider text-muted-foreground/70">
            {t.nav.comingSoon}
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
