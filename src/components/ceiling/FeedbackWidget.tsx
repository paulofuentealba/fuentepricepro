import { useState } from "react";
import { MessageCircle } from "lucide-react";
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

export function FeedbackWidget() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pt = locale === "ptBR";
  const labels = {
    button: pt ? "Enviar Feedback" : "Give Feedback",
    title: pt ? "Ajude-nos a melhorar o Fuente Price Pro" : "Help us improve Fuente Price Pro",
    description: pt
      ? "Sua opinião guia nossos próximos passos. Conte-nos o que você gostaria de ver."
      : "Your input guides what we build next. Tell us what you'd like to see.",
    placeholder: pt
      ? "Compartilhe uma ideia, elogio ou problema..."
      : "Share an idea, kind word, or issue...",
    send: pt ? "Enviar feedback" : "Send Feedback",
    cancel: pt ? "Cancelar" : "Cancel",
    success: pt
      ? "Obrigado! Seu feedback foi registrado."
      : "Thank you! Your feedback has been recorded.",
    empty: pt ? "Escreva uma mensagem antes de enviar." : "Please write a message before sending.",
  };

  function handleSend() {
    if (!message.trim()) {
      toast.error(labels.empty);
      return;
    }
    setSubmitting(true);
    // Backend wiring will come later — simulate a brief send.
    setTimeout(() => {
      setSubmitting(false);
      setMessage("");
      setOpen(false);
      toast.success(labels.success);
    }, 300);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.button}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-medium text-success shadow-lg backdrop-blur transition-colors hover:bg-success/20 hover:text-success sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">{labels.button}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.description}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={labels.placeholder}
              rows={5}
              autoFocus
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button
              onClick={handleSend}
              disabled={submitting}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {labels.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
