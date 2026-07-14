import { Gauge, Globe, LogOut, User as UserIcon, Crown } from "lucide-react";
import { useAuthModal } from "@/lib/auth-modal";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { useSubscription } from "@/lib/subscription";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface HeaderProps {
  variant?: "app" | "landing";
}

export function Header({ variant = "app" }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isPro } = useSubscription();

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";
  const L = t.landing;

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30">
          <Gauge className="h-5 w-5" />
        </div>

        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            {t.appTitle}
            <span className="sr-only"> — {t.appTagline}</span>
          </h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{t.appTagline}</p>
        </div>

        <div className="flex items-center gap-2">
          {variant === "landing" && (
            <a href="#pricing" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:block mr-2">
              {L.pricingLink}
            </a>
          )}
          
          <LanguageSwitcher className="hidden sm:inline-flex" />

          {variant === "landing" && !user && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => openAuthModal()}
              className="text-muted-foreground hover:text-foreground"
            >
              {L.login}
            </Button>
          )}

          {variant === "landing" && (
            <Button
              asChild
              size="sm"
              className={user ? "bg-success text-success-foreground hover:bg-success/90" : "hidden bg-success text-success-foreground hover:bg-success/90 sm:inline-flex"}
            >
              <Link to="/app">{L.openApp}</Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-sm font-semibold text-success ring-1 ring-success/30 transition-colors hover:bg-success/25"
                  aria-label="Account menu"
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            variant === "app" && (
              <Button
                type="button"
                size="sm"
                onClick={() => openAuthModal()}
                className="h-9 bg-success text-success-foreground hover:bg-success/90"
              >
                Sign In
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
