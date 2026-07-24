import { Calculator, Gauge, LogOut, Settings, User, User as UserIcon, Menu, BookOpen } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

  const userAvatar = (
    <button
      type="button"
      className="flex items-center justify-center rounded-full transition-colors"
      aria-label="Account menu"
    >
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt="Avatar"
          className="h-11 w-11 md:h-9 md:w-9 rounded-full object-cover ring-1 ring-border/60 transition-all hover:ring-success/50"
        />
      ) : (
        <SuccessIconBox 
          icon={User} 
          size="md" 
          rounded="full" 
          className="h-11 w-11 md:h-9 md:w-9 hover:bg-success/25 transition-colors"
        />
      )}
    </button>
  );

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:px-6">
        <SuccessIconBox icon={Gauge} />

        <div className="min-w-0 text-center md:text-left flex items-center justify-center md:justify-start">
          <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            {t.appTitle}
            {variant !== "landing" && <span className="sr-only"> — {t.appTagline}</span>}
          </h1>
          {variant !== "landing" && (
            <p className="truncate text-xs text-muted-foreground sm:text-sm ml-2 hidden md:block">{t.appTagline}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Only Exchange Rate */}
          {variant === "app" && fx?.USDBRL && (
            <div className="hidden items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-tight text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] backdrop-blur-sm md:flex">
              USD/BRL R$ {fx.USDBRL.toFixed(2)}
            </div>
          )}
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {variant === "landing" && (
              <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mr-2">
                <a href="#features" className="hover:text-foreground transition-colors">
                  {L.navFeatures}
                </a>
              </div>
            )}

            {user && (
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
                <Link to="/app/docs">
                  <BookOpen className="h-4 w-4" />
                  {t.docs.navLink}
                </Link>
              </Button>
            )}

            <LanguageSwitcher className="inline-flex" />

            {variant === "landing" && !user && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => openAuthModal()}
                  className="text-muted-foreground hover:text-foreground inline-flex"
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
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 inline-flex shadow-[0_0_10px_rgba(16,185,129,0.1)] mr-2 transition-all"
              >
                <Link to="/app">{L.goToTerminal}</Link>
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {userAvatar}
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
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  Sign In
                </Button>
              )
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col gap-6 pt-12">
                <SheetHeader>
                  <SheetTitle className="text-left">{t.appTitle}</SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col gap-4 flex-1">
                  {variant === "landing" && (
                    <a href="#features" className="text-lg font-medium hover:text-emerald-400 transition-colors">
                      {L.navFeatures}
                    </a>
                  )}
                  {user && (
                    <>
                      <div className="flex items-center gap-3 py-2 border-b border-white/10">
                        {userAvatar}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{user.email}</span>
                        </div>
                      </div>
                      <Link to="/app" className="text-lg font-medium hover:text-emerald-400 transition-colors">
                        {L.goToTerminal}
                      </Link>
                      <Link to="/app/docs" className="text-lg font-medium flex items-center gap-2 hover:text-emerald-400 transition-colors">
                        <BookOpen className="h-5 w-5" />
                        {t.docs.navLink}
                      </Link>
                      <Link to="/settings" className="text-lg font-medium flex items-center gap-2 hover:text-emerald-400 transition-colors">
                        <Settings className="h-5 w-5" />
                        {L.settings}
                      </Link>
                    </>
                  )}
                  
                  {!user && (
                    <div className="flex flex-col gap-3 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openAuthModal()}
                        className="w-full justify-center"
                      >
                        {variant === "app" ? "Sign In" : L.login}
                      </Button>
                      {variant === "landing" && (
                        <Button
                          type="button"
                          onClick={() => openAuthModal()}
                          className="w-full justify-center bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        >
                          {L.signUp}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-col gap-4 pb-8">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Language</span>
                      <LanguageSwitcher className="inline-flex" />
                    </div>
                    {user && (
                      <Button variant="ghost" onClick={() => signOut()} className="w-full justify-start text-danger hover:text-danger hover:bg-danger/10">
                        <LogOut className="mr-2 h-5 w-5" />
                        {L.signOut}
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </header>
  );
}
