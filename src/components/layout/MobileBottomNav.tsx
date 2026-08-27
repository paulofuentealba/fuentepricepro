import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Compass,
  RotateCcw,
  Sparkles,
  FolderOpen,
  BarChart3,
  Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { t } = useI18n();
  const location = useLocation();

  const slots = [
    {
      key: "home",
      path: "/app/",
      label: t.nav.home,
      icon: Compass,
      exact: true,
    },
    {
      key: "reinvestir",
      path: "/app/reinvestir",
      label: t.nav.reinvest,
      icon: RotateCcw,
      exact: false,
    },
    {
      key: "smartallocation",
      path: "/app/smartallocation",
      label: t.nav.contributionPlan,
      icon: Sparkles,
      exact: false,
    },
    {
      key: "myportfolio",
      path: "/app/myportfolio",
      label: t.nav.myPortfolio,
      icon: FolderOpen,
      exact: false,
    },
    {
      key: "cashflow",
      path: "/app/cashflow",
      label: t.tabs.cashFlow,
      icon: BarChart3,
      exact: false,
    },
    {
      key: "explorar",
      path: "/app/explorar",
      label: t.nav.exploreAssets,
      icon: Search,
      exact: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background/95 backdrop-blur-lg border-t border-border/60 min-h-[64px] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-6 w-full items-center h-[64px] px-1">
        {slots.map(({ key, path, label, icon: Icon, exact }) => {
          const isActive = exact
            ? location.pathname === "/app" || location.pathname === "/app/"
            : location.pathname.startsWith(path);

          return (
            <Link
              key={key}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-colors min-h-[48px]",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full transition-all",
                  isActive && "bg-primary/15 scale-110",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate max-w-[60px] text-center leading-tight">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
