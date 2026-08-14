import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Calculator,
  Gauge,
  LogOut,
  Settings,
  User,
  User as UserIcon,
  Menu,
  BookOpen,
  FolderOpen,
  Scale,
  ShieldAlert,
  Sparkles,
  BarChart3,
  TrendingUp,
  Compass,
  Lock,
} from "lucide-react";
import { useAuthModal } from "@/lib/auth-modal";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { SuccessIconBox } from "@/components/shared/SuccessIconBox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { useSubscription } from "@/lib/subscription";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasUSDAssets } from "@/lib/useHasUSDAssets";

interface HeaderProps {
  variant?: "app" | "landing";
}

export function Header({ variant = "app" }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();
  const { user, signOut, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isPro } = useSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  const appTabs = [
    { key: "home", path: "/app/", label: t.tabs.financialIndependence, icon: Compass },
    { key: "myportfolio", path: "/app/myportfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "screener", path: "/app/screener", label: t.tabs.screener, icon: Calculator },
    { key: "comparator", path: "/app/comparator", label: t.tabs.comparator, icon: Scale },
    { key: "riskradar", path: "/app/riskradar", label: t.tabs.riskRadar, icon: ShieldAlert },
    { key: "globalradar", path: "/app/globalradar", label: t.tabs.radar, icon: Sparkles },
    {
      key: "cashflow",
      path: "/app/cashflow",
      label: t.tabs.cashFlow,
      icon: BarChart3,
      locked: !user,
    },
    {
      key: "smartallocation",
      path: "/app/smartallocation",
      label: t.tabs.smartAllocation,
      icon: Sparkles,
      locked: !user,
    },
    {
      key: "snowballeffectsimulator",
      path: "/app/snowballeffectsimulator",
      label: t.snowball?.title,
      icon: TrendingUp,
    },
    { key: "wiki", path: "/app/docs", label: t.docs.navLink, icon: BookOpen },
  ];

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";
  const L = t.landing;
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { hasUSDAssets, loading: usdAssetsLoading } = useHasUSDAssets();

  const userAvatar = (
    <button
      type="button"
      className="flex items-center justify-center rounded-full transition-colors"
      aria-label={t.header.accountMenu}
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
          </h1>
          {variant === "landing" && (
            <p className="truncate text-xs text-muted-foreground sm:text-sm ml-2 hidden md:block">
              {t.appTagline}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Only Exchange Rate — only shown to users holding USD-denominated assets */}
          {variant === "app" && usdAssetsLoading && (
            <Skeleton className="hidden h-6 w-28 rounded-md md:block" />
          )}
          {variant === "app" && !usdAssetsLoading && hasUSDAssets && fx?.USDBRL && (
            <div className="hidden items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium tracking-tight text-primary shadow-primary/10 backdrop-blur-sm md:flex">
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

            {user && variant === "landing" && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
              >
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
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-primary/20 hover:shadow-primary/30 transition-all"
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
                className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary inline-flex shadow-primary/10 mr-2 transition-all"
              >
                <Link to="/app">{L.goToTerminal}</Link>
              </Button>
            )}

            {user ? (
              variant === "landing" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>{userAvatar}</DropdownMenuTrigger>
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
              ) : null
            ) : (
              variant === "app" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openAuthModal()}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  {t.header.signIn}
                </Button>
              )
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t.header.openMenu}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col gap-4 pt-8 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">{t.appTitle}</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-3 flex-1">
                  {variant === "landing" && (
                    <a
                      href="#features"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium hover:text-primary transition-colors py-1"
                    >
                      {L.navFeatures}
                    </a>
                  )}

                  {variant === "landing" && user && (
                    <Link
                      to="/app"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium hover:text-primary transition-colors py-1"
                    >
                      {L.goToTerminal}
                    </Link>
                  )}

                  {variant === "app" && (
                    <nav className="flex flex-col gap-1">
                      {appTabs.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          item.path === "/app/"
                            ? pathname === "/app" || pathname === "/app/"
                            : pathname.startsWith(item.path);

                        return (
                          <Link
                            key={item.key}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            )}
                            aria-label={item.label}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-primary" : "",
                              )}
                            />
                            <span className="truncate flex-1 text-left">{item.label}</span>
                            {item.locked && (
                              <Lock
                                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 ml-auto"
                                aria-hidden
                              />
                            )}
                          </Link>
                        );
                      })}
                    </nav>
                  )}

                  {loading ? (
                    <div className="flex flex-col gap-4 py-2">
                      <div className="flex items-center gap-3 py-2 border-b border-border/30">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ) : user ? (
                    <div className="pt-2 border-t border-border/30 flex flex-col gap-2">
                      <div className="flex items-center gap-3 py-1">
                        {userAvatar}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                        </div>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        {L.settings}
                      </Link>
                    </div>
                  ) : null}

                  {!user && !loading && (
                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/30">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openAuthModal();
                        }}
                        className="w-full justify-center text-xs"
                      >
                        {variant === "app" ? t.header.signIn : L.login}
                      </Button>
                      {variant === "landing" && (
                        <Button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            openAuthModal();
                          }}
                          className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                        >
                          {L.signUp}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-muted-foreground">{t.header.language}</span>
                      <LanguageSwitcher className="inline-flex" />
                    </div>
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          signOut();
                        }}
                        className="w-full justify-start text-xs text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
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
