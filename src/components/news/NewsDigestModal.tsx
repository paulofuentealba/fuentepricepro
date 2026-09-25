import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { useUserSettings } from "@/lib/useUserSettings";

interface NewsDigestModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewsDigestModal({ open, onClose }: NewsDigestModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();

  const isSubscribed = Boolean(settings.weeklyDigestEmailConsent);

  const handleToggle = () => {
    updateSettings({ weeklyDigestEmailConsent: !isSubscribed });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t.common.close}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
              <Mail className="h-4 w-4" />
            </span>
            <DialogTitle className="font-serif text-lg font-semibold">
              {t.newsScreen.digestModal.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {t.newsScreen.digestModal.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {user?.email ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                {t.newsScreen.digestModal.emailLabel}
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {user.email}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
              <span>{t.newsScreen.digestModal.loginRequired}</span>
            </div>
          )}

          <div
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs ${
              isSubscribed
                ? "border-success/30 bg-success/10 text-success"
                : "border-border/60 bg-muted/20 text-muted-foreground"
            }`}
          >
            {isSubscribed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span>
              {isSubscribed
                ? t.newsScreen.digestModal.subscribedAlert
                : t.newsScreen.digestModal.unsubscribedAlert}
            </span>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent-text mt-0.5" />
            <span>{t.newsScreen.digestModal.lgpdNotice}</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t.newsScreen.digestModal.closeBtn}
          </Button>
          {user?.email && (
            <Button
              size="sm"
              variant={isSubscribed ? "destructive" : "default"}
              onClick={handleToggle}
            >
              {isSubscribed
                ? t.newsScreen.digestModal.disableBtn
                : t.newsScreen.digestModal.enableBtn}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
