import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "default" | "sidebar";
}

export function LanguageSwitcher({ className, variant = "default" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-0.5 rounded-lg border border-sidebar-border/30 bg-sidebar-foreground/[0.07] p-0.5 w-full justify-between",
          className,
        )}
        role="group"
        aria-label={t.languageLabel}
      >
        <button
          type="button"
          className={cn(
            "h-7 flex-1 rounded-md px-1 text-xs font-display font-semibold transition-colors flex items-center justify-center",
            locale === "ptBR"
              ? "bg-sidebar-primary text-sidebar-accent shadow-sm border border-sidebar-accent/20"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/[0.05]",
          )}
          onClick={() => setLocale("ptBR")}
        >
          PT
        </button>
        <button
          type="button"
          className={cn(
            "h-7 flex-1 rounded-md px-1 text-xs font-display font-semibold transition-colors flex items-center justify-center",
            locale === "en"
              ? "bg-sidebar-primary text-sidebar-accent shadow-sm border border-sidebar-accent/20"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/[0.05]",
          )}
          onClick={() => setLocale("en")}
        >
          EN
        </button>
        <button
          type="button"
          className={cn(
            "h-7 flex-1 rounded-md px-1 text-xs font-display font-semibold transition-colors flex items-center justify-center",
            locale === "es"
              ? "bg-sidebar-primary text-sidebar-accent shadow-sm border border-sidebar-accent/20"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/[0.05]",
          )}
          onClick={() => setLocale("es")}
        >
          ES
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card p-1",
        className,
      )}
      role="group"
      aria-label={t.languageLabel}
    >
      <Button
        type="button"
        size="sm"
        variant={locale === "ptBR" ? "default" : "ghost"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => setLocale("ptBR")}
      >
        PT
      </Button>
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
        variant={locale === "es" ? "default" : "ghost"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => setLocale("es")}
      >
        ES
      </Button>
    </div>
  );
}
