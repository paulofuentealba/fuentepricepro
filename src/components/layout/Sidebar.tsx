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
  Target,
} from "lucide-react";
import { useAuthModal } from "@/lib/auth-modal";
import { useSubscription } from "@/lib/subscription";
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
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { formatCurrency } from "@/lib/formatters";

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

/** Up to 2 initials from a display name, e.g. "Paulo Fuentealba" -> "PF". */
function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export function Sidebar() {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut, loading, isAdmin } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isPro } = useSubscription();
  const { theme, setTheme, isDark } = useTheme();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";
  const { summary } = useRealizedIncomeSummary(currency);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const reinvestBadge =
    summary?.currentMonth && summary.currentMonth > 0
      ? formatCurrency(summary.currentMonth, currency, locale)
      : undefined;

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
          path: "/app/reinvestir",
          icon: RotateCcw,
          disabled: false,
          badge: reinvestBadge,
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
        {
          key: "metas",
          label: t.nav.goals,
          path: "/app/metas",
          icon: Target,
          disabled: false,
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
          "h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-md transition-all duration-300 ease-in-out hidden md:flex flex-col z-20 select-none",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border h-[72px]">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden pl-1">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none" className="shrink-0">
                <circle cx="20" cy="20" r="19" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".35" />
                <circle cx="20" cy="20" r="13.5" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".6" />
                <circle cx="20" cy="20" r="8" fill="var(--sidebar-accent)" />
              </svg>
              <div className="flex flex-col leading-tight overflow-hidden">
                <div className="font-serif font-semibold text-[18px] text-sidebar-accent truncate">
                  Fuente
                </div>
                <div className="text-[9.5px] font-display font-normal uppercase tracking-[0.14em] text-sidebar-foreground/50 truncate">
                  Price Pro
                </div>
              </div>
            </div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" className="mx-auto shrink-0">
              <circle cx="20" cy="20" r="19" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".35" />
              <circle cx="20" cy="20" r="13.5" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".6" />
              <circle cx="20" cy="20" r="8" fill="var(--sidebar-accent)" />
            </svg>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 h-8 w-8",
              isCollapsed && "hidden",
            )}
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
                <div className="px-[11px] pb-1 text-[9.5px] font-display font-normal uppercase tracking-[0.14em] text-sidebar-foreground/40">
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
                        "group relative flex items-center rounded-[9px] px-[11px] py-[8.5px] text-[12.5px] font-display font-medium opacity-50 cursor-not-allowed text-sidebar-foreground/60",
                        isCollapsed ? "justify-center" : "justify-start gap-2.5",
                      )}
                    >
                      <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                      {!isCollapsed && (
                        <>
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-sidebar-foreground/25 text-sidebar-foreground/60"
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
                      "group relative flex items-center rounded-[9px] px-[11px] py-[8.5px] transition-colors text-[12.5px] font-display font-medium",
                      isCollapsed ? "justify-center" : "justify-start gap-2.5",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-accent"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0",
                        isCollapsed ? "h-5 w-5" : "h-4 w-4",
                        isActive ? "text-sidebar-accent" : "",
                      )}
                    />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {!isCollapsed && item.badge !== undefined && (
                      <Badge className="ml-auto rounded-full px-1.5 py-0 text-[9.5px] font-mono font-bold bg-sidebar-accent text-sidebar-accent-foreground border-transparent hover:bg-sidebar-accent">
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
        <div className="mt-auto border-t border-sidebar-border p-2 space-y-1">
          {/* User Profile Chip */}
          {loading ? (
            <div
              className={cn(
                "flex items-center rounded-[10px] p-2 w-full",
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
                    "flex items-center rounded-[10px] p-2 transition-colors hover:bg-sidebar-foreground/[0.06] w-full text-left",
                    isCollapsed ? "justify-center" : "justify-start gap-2.5",
                  )}
                >
                  <div className="shrink-0">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center text-[13px] font-bold">
                        {getInitials(user.displayName)}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-[12.5px] font-display font-semibold text-sidebar-foreground">
                        {user.displayName || "Usuário"}
                      </span>
                      <span className="text-[10px] font-display text-sidebar-accent">
                        {isPro ? "Plano Pro" : "Plano Free"}
                      </span>
                    </div>
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
                "w-full text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/10",
                isCollapsed ? "justify-center px-0" : "justify-start gap-2",
              )}
            >
              <User className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t.landing.login}</span>}
            </Button>
          )}

          {/* Admin Link if authorized */}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center rounded-[9px] px-[11px] py-[7px] text-[11.5px] font-display font-medium text-sidebar-foreground/60 hover:bg-sidebar-foreground/[0.06] hover:text-sidebar-foreground transition-colors",
                isCollapsed ? "justify-center" : "gap-2.5",
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t.nav.admin}</span>}
            </Link>
          )}

          {/* Theme & Language Controls */}
          {!isCollapsed ? (
            <div className="flex flex-col gap-1.5 pt-1">
              {/* Theme switch */}
              <div className="flex items-center gap-1 bg-sidebar-foreground/[0.07] p-1 rounded-[9px]">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex-1 h-7 rounded-md flex items-center justify-center text-[11px] font-display font-semibold transition-colors",
                    !isDark
                      ? "bg-sidebar-primary text-sidebar-accent"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
                  )}
                  title={t.nav.theme.light}
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex-1 h-7 rounded-md flex items-center justify-center text-[11px] font-display font-semibold transition-colors",
                    isDark
                      ? "bg-sidebar-primary text-sidebar-accent"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
                  )}
                  title={t.nav.theme.dark}
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
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
                    className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/10"
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
                    className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/10"
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
