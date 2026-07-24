import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card p-1",
        className,
      )}
      role="group"
      aria-label={t.languageLabel}
    >
      <Globe className="mx-1 h-4 w-4 text-muted-foreground" aria-hidden />
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "default" : "ghost"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "ptBR" ? "default" : "ghost"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => setLocale("ptBR")}
      >
        PT-BR
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "es" ? "default" : "ghost"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => setLocale("es")}
      >
        ES
      </Button>
    </div>
  );
}
