import { Calculator, Gauge, LogOut, Settings, User, User as UserIcon } from "lucide-react";
import { useAuthModal } from "@/lib/auth-modal";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { SuccessIconBox } from "@/components/shared/SuccessIconBox";
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
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";

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
  const { data: fx } = useQuery(exchangeRateQueryOptions());

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:px-6">
        <SuccessIconBox icon={Gauge} />

        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            {t.appTitle}
            {variant !== "landing" && <span className="sr-only"> — {t.appTagline}</span>}
          </h1>
          {variant !== "landing" && (
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{t.appTagline}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {variant === "app" && fx?.USDBRL && (
            <div className="hidden items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-tight text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] backdrop-blur-sm sm:flex">
              USD/BRL R$ {fx.USDBRL.toFixed(2)}
            </div>
          )}
          {variant === "landing" && (
            <div className="hidden items-center gap-4 text-sm font-medium text-muted-foreground md:flex mr-2">
              <a href="#features" className="hover:text-foreground transition-colors">
                {L.navFeatures}
              </a>
            </div>
          )}

          <LanguageSwitcher className="hidden sm:inline-flex" />

          {variant === "landing" && !user && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => openAuthModal()}
                className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
              >
                {L.login}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => openAuthModal()}
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
              >
                {L.signUp}
              </Button>
            </div>
          )}

          {variant === "landing" && user && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 sm:inline-flex shadow-[0_0_10px_rgba(16,185,129,0.1)] mr-2 transition-all"
            >
              <Link to="/app">{L.goToTerminal}</Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-full transition-colors"
                  aria-label="Account menu"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-border/60 transition-all hover:ring-success/50"
                    />
                  ) : (
                    <SuccessIconBox 
                      icon={User} 
                      size="md" 
                      rounded="full" 
                      className="h-9 w-9 hover:bg-success/25 transition-colors"
                    />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    {L.settings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {L.signOut}
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
