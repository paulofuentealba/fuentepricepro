import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function PaywallDialog({ open, onOpenChange, title, description }: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {title || t.paywall.title}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description || t.paywall.description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 space-y-3 px-2">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {t.paywall.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full bg-gradient-to-r from-primary to-primary/80">
            <a href="/pricing">{t.paywall.button}</a>
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            {t.paywall.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
