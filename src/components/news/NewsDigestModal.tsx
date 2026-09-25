import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { NewsDigestSettingsForm } from "./NewsDigestSettingsForm";

interface NewsDigestModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewsDigestModal({ open, onClose }: NewsDigestModalProps) {
  const { t } = useI18n();
  const M = t.newsScreen.digestModal;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" closeLabel={t.common.close}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
              <Mail className="h-4 w-4" />
            </span>
            <DialogTitle className="font-serif text-lg font-semibold text-foreground">
              {M.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5 leading-relaxed">
            {M.description}
          </DialogDescription>
        </DialogHeader>

        <NewsDigestSettingsForm onSaved={onClose} onCancel={onClose} showCancel />
      </DialogContent>
    </Dialog>
  );
}
