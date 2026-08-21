import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import { db } from "@/integrations/firebase/client";
import { doc, setDoc } from "firebase/firestore";

const MAX_FEEDBACK_LENGTH = 2000;

export function FeedbackWidget() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const labels = t.feedback;

  function handleOpen() {
    if (!user) {
      openAuthModal();
      return;
    }
    setOpen(true);
  }

  async function handleSend() {
    if (!user) {
      openAuthModal();
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error(labels.empty);
      return;
    }
    if (message.length > MAX_FEEDBACK_LENGTH) {
      toast.error(labels.tooLong);
      return;
    }

    setSubmitting(true);
    try {
      const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ref = doc(db, "users", user.uid, "feedbacks", feedbackId);
      await setDoc(ref, {
        id: feedbackId,
        uid: user.uid,
        message: trimmed,
        locale,
        createdAt: Date.now(),
      });
      setMessage("");
      setOpen(false);
      toast.success(labels.success);
    } catch (err) {
      console.error("[feedback] submission failed", err);
      toast.error(labels.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid="feedback-widget-trigger"
        onClick={handleOpen}
        aria-label={labels.buttonText}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-medium text-success shadow-lg backdrop-blur transition-colors hover:bg-success/20 hover:text-success sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">{labels.buttonText}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t.common.close} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.description}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={labels.placeholder}
              rows={5}
              maxLength={MAX_FEEDBACK_LENGTH}
              autoFocus
              className="resize-none"
            />
            <div className="text-[11px] text-muted-foreground text-right">
              {message.length}/{MAX_FEEDBACK_LENGTH}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              {labels.cancel}
            </Button>
            <Button
              onClick={handleSend}
              disabled={submitting}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {labels.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
