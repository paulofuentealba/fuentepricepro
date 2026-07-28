import React, { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  FolderOpen,
  BarChart3,
  Sparkles,
  Lock,
  Calculator as CalculatorIcon,
  TrendingUp,
  Scale,
  Menu,
  ChevronRight,
  ShieldAlert,
  BookOpen,
  User,
  Settings,
  LogOut
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function Sidebar() {
  const { t } = useI18n();
  const { user, signOut, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isPro } = useSubscription();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("fpp_sidebar_collapsed");
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("fpp_sidebar_collapsed", String(newState));
  };

  const tabs = [
    { key: "myportfolio", path: "/app/myportfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "screener", path: "/app/screener", label: t.tabs.calculator, icon: CalculatorIcon },
    { key: "comparator", path: "/app/comparator", label: t.tabs.comparator, icon: Scale },
    { key: "riskradar", path: "/app/riskradar", label: t.tabs.riskRadar, icon: ShieldAlert },
    { key: "globalradar", path: "/app/globalradar", label: t.tabs.radar, icon: Sparkles },
    { key: "cashflow", path: "/app/cashflow", label: t.tabs.cashFlow, icon: BarChart3, locked: !user },
    { key: "smartallocation", path: "/app/smartallocation", label: t.tabs.smartAllocation, icon: Sparkles, locked: !user },
    { key: "snowballeffectsimulator", path: "/app/snowballeffectsimulator", label: t.snowball?.title, icon: TrendingUp },
    { key: "wiki", path: "/app/docs", label: t.docs.navLink, icon: BookOpen },
  ];

  if (!isMounted) return <div className="w-16 md:w-64 border-r border-border/60 bg-background/60 h-full hidden md:block" />;

  return (
    <TooltipProvider delayDuration={100}>
      <aside 
        className={cn(
          "h-full border-r border-border/60 bg-background/60 backdrop-blur transition-all duration-300 ease-in-out hidden md:flex flex-col z-20",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/30 h-[72px]">
          {!isCollapsed && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-2 truncate">
              Menu
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className={cn("text-muted-foreground hover:text-foreground", isCollapsed && "mx-auto")}
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ key, path, label, icon: Icon, locked }) => {
            const isActive = location.pathname.startsWith(path);
            
            const linkContent = (
              <Link
                key={key}
                to={path}
                className={cn(
                  "group relative flex items-center rounded-xl px-3 py-3 transition-colors text-sm font-medium",
                  isCollapsed ? "justify-center" : "justify-start gap-3",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-500 shadow-[inset_4px_0_0_0_rgba(16,185,129,1)]" 
                    : "text-slate-400 hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4", isActive ? "text-emerald-500" : "")} />
                
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{label}</span>
                )}

                {!isCollapsed && locked && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" aria-hidden />
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="flex items-center gap-2">
                    {label}
                    {locked && <Lock className="h-3 w-3 text-muted-foreground ml-1" />}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* User Profile Block */}
        <div className="mt-auto border-t border-border/30 p-2">
          {loading ? (
            <div className={cn("flex items-center rounded-xl p-2 w-full", isCollapsed ? "justify-center" : "justify-start gap-3")}>
              {isCollapsed ? (
                <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <>
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1 gap-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
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
                    "flex items-center rounded-xl p-2 transition-colors hover:bg-white/5 w-full text-left",
                    isCollapsed ? "justify-center" : "justify-start gap-3"
                  )}
                >
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="shrink-0">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Avatar"
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-border/60"
                            />
                          ) : (
                            <SuccessIconBox icon={User} size="sm" rounded="full" className="h-8 w-8" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        {t.settings.tabs.profile}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <>
                        <div className="shrink-0">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Avatar"
                              className="h-9 w-9 rounded-full object-cover ring-1 ring-border/60"
                            />
                          ) : (
                            <SuccessIconBox icon={User} size="md" rounded="full" className="h-9 w-9" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate text-sm font-medium text-foreground">{user.displayName || "Usuário"}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isPro ? (
                              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-500/70">Pro</span>
                            ) : (
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Free</span>
                            )}
                          </div>
                        </div>
                        <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/10" onClick={(e) => e.stopPropagation()}>
                          <Settings className="h-4 w-4" />
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
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      {t.settings.title}
                    </Link>
                  </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.landing.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => openAuthModal()}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                isCollapsed ? "justify-center px-0" : "justify-start"
              )}
            >
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <User className="h-5 w-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    {t.landing.login}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  {t.landing.login}
                </>
              )}
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
