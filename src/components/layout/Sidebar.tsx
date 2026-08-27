import React, { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  RotateCcw,
  Sparkles,
  ArrowDownCircle,
  Bell,
  CalendarCheck,
  FileText,
  FolderOpen,
  Search,
  ShieldCheck,
  Menu,
  Shield,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { useAuthModal } from "@/lib/auth-modal";
import { useSubscription } from "@/lib/subscription";
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
import { useTheme } from "@/lib/theme-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  disabled?: boolean;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut, loading, isAdmin } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isPro } = useSubscription();
  const { theme, setTheme, isDark } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("fpp_sidebar_collapsed");
        if (stored !== null) {
          setIsCollapsed(stored === "true");
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem("fpp_sidebar_collapsed", String(newState));
      }
    } catch {
      // Ignore storage access errors
    }
  };

  const sections: NavSection[] = [
    {
      title: t.nav.sections.decide,
      items: [
        {
          key: "reinvestir",
          label: t.nav.reinvest,
          icon: RotateCcw,
          disabled: true,
        },
        {
          key: "plano-aporte",
          label: t.nav.contributionPlan,
          path: "/app/smartallocation",
          icon: Sparkles,
          disabled: false,
        },
        {
          key: "retirar",
          label: t.nav.withdraw,
          icon: ArrowDownCircle,
          disabled: true,
        },
      ],
    },
    {
      title: t.nav.sections.track,
      items: [
        {
          key: "o-que-mudou",
          label: t.nav.whatChanged,
          icon: Bell,
          disabled: true,
        },
        {
          key: "renda-garantida",
          label: t.nav.guaranteedIncome,
          icon: CalendarCheck,
          disabled: true,
        },
        {
          key: "realidade-fiscal",
          label: t.nav.taxReality,
          icon: FileText,
          path: "/app/realidade-fiscal",
          disabled: false,
        },
      ],
    },
    {
      title: t.nav.sections.analyze,
      items: [
        {
          key: "minha-carteira",
          label: t.nav.myPortfolio,
          path: "/app/myportfolio",
          icon: FolderOpen,
          disabled: false,
        },
        {
          key: "explorar-ativos",
          label: t.nav.exploreAssets,
          path: "/app/explorar",
          icon: Search,
          disabled: false,
        },
        {
          key: "auditoria",
          label: t.nav.audit,
          icon: ShieldCheck,
          disabled: true,
        },
      ],
    },
  ];

  if (!isMounted) {
    return (
      <div className="w-16 md:w-64 border-r border-border/60 bg-background/60 h-full hidden md:block" />
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-full border-r border-border/60 bg-background/80 backdrop-blur-md transition-all duration-300 ease-in-out hidden md:flex flex-col z-20 select-none",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-border/30 h-[72px]">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden pl-1">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none" className="shrink-0">
                <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
                <circle cx="20" cy="20" r="13.5" stroke="var(--accent)" strokeWidth="1.4" opacity=".6" />
                <circle cx="20" cy="20" r="8" fill="var(--accent)" />
              </svg>
              <div className="font-serif font-bold text-sm tracking-tight text-foreground truncate">
                Fuente <span className="text-primary font-sans font-semibold">Pro</span>
              </div>
            </div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" className="mx-auto shrink-0">
              <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
              <circle cx="20" cy="20" r="13.5" stroke="var(--accent)" strokeWidth="1.4" opacity=".6" />
              <circle cx="20" cy="20" r="8" fill="var(--accent)" />
            </svg>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn("text-muted-foreground hover:text-foreground h-8 w-8", isCollapsed && "hidden")}
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-3 flex flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 [&::-webkit-scrollbar]:hidden">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.path ? location.pathname.startsWith(item.path) : false;

                if (item.disabled) {
                  const disabledContent = (
                    <div
                      className={cn(
                        "group relative flex items-center rounded-xl px-3 py-2 text-sm font-medium opacity-50 cursor-not-allowed text-muted-foreground",
                        isCollapsed ? "justify-center" : "justify-start gap-3",
                      )}
                    >
                      <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                      {!isCollapsed && (
                        <>
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground"
                          >
                            {t.nav.comingSoon}
                          </Badge>
                        </>
                      )}
                    </div>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>
                          <div>{disabledContent}</div>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12} className="flex items-center gap-2">
                          <span>{item.label}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">({t.nav.comingSoon})</span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.key}>{disabledContent}</div>;
                }

                const linkContent = (
                  <Link
                    key={item.key}
                    to={item.path!}
                    className={cn(
                      "group relative flex items-center rounded-xl px-3 py-2 transition-colors text-sm font-medium",
                      isCollapsed ? "justify-center" : "justify-start gap-3",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_0_var(--primary)] font-semibold"
                        : "text-muted-foreground hover:bg-card hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0",
                        isCollapsed ? "h-5 w-5" : "h-4 w-4",
                        isActive ? "text-primary" : "",
                      )}
                    />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {!isCollapsed && item.badge !== undefined && (
                      <Badge variant="secondary" className="ml-auto text-[10px] font-semibold">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12} className="flex items-center gap-2">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          ))}
        </nav>

        {/* Footer Block */}
        <div className="mt-auto border-t border-border/30 p-2 space-y-2 bg-card/20">
          {/* Admin Link if authorized */}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center rounded-xl px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors",
                isCollapsed ? "justify-center" : "gap-2.5",
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t.nav.admin}</span>}
            </Link>
          )}

          {/* User Profile Chip */}
          {loading ? (
            <div
              className={cn(
                "flex items-center rounded-xl p-1.5 w-full",
                isCollapsed ? "justify-center" : "justify-start gap-2.5",
              )}
            >
              {isCollapsed ? (
                <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <>
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1 gap-1">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                </>
              )}
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center rounded-xl p-1.5 transition-colors hover:bg-card w-full text-left border border-border/40 bg-card/40",
                    isCollapsed ? "justify-center" : "justify-start gap-2.5",
                  )}
                >
                  <div className="shrink-0">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-border/60"
                      />
                    ) : (
                      <SuccessIconBox
                        icon={User}
                        size="sm"
                        rounded="full"
                        className="h-7 w-7"
                      />
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {user.displayName || "Usuário"}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {isPro ? "Plano Pro" : "Plano Free"}
                        </span>
                      </div>
                      <Link
                        to="/settings"
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56 mb-2">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="truncate">{user.displayName || "Usuário"}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      {t.nav.admin}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    {t.settings.title}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.landing.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openAuthModal()}
              className={cn(
                "w-full text-xs text-muted-foreground hover:text-foreground",
                isCollapsed ? "justify-center px-0" : "justify-start gap-2",
              )}
            >
              <User className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t.landing.login}</span>}
            </Button>
          )}

          {/* Theme & Language Controls */}
          {!isCollapsed ? (
            <div className="flex flex-col gap-1.5 pt-1">
              {/* Theme switch */}
              <div className="flex items-center justify-between bg-card/60 p-1 rounded-lg border border-border/50">
                <span className="text-[11px] text-muted-foreground pl-2">{t.nav.theme.toggle}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "h-6 px-2 rounded flex items-center justify-center text-xs transition-colors",
                      !isDark
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title={t.nav.theme.light}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "h-6 px-2 rounded flex items-center justify-center text-xs transition-colors",
                      isDark
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title={t.nav.theme.dark}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Language switcher */}
              <div className="w-full">
                <LanguageSwitcher className="w-full justify-between h-8 text-xs" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  {isDark ? t.nav.theme.dark : t.nav.theme.light}
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-28">
                  <DropdownMenuItem
                    onClick={() => setLocale("ptBR")}
                    className={cn("text-xs", locale === "ptBR" && "font-bold text-primary")}
                  >
                    Português
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocale("en")}
                    className={cn("text-xs", locale === "en" && "font-bold text-primary")}
                  >
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocale("es")}
                    className={cn("text-xs", locale === "es" && "font-bold text-primary")}
                  >
                    Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
