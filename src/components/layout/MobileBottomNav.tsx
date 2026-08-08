import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  FolderOpen,
  Calculator as CalculatorIcon,
  Sparkles,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { t } = useI18n();
  const location = useLocation();

  const tabs = [
    { key: "screener", path: "/app/screener", label: t.tabs.calculator, icon: CalculatorIcon },
    { key: "myportfolio", path: "/app/myportfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "globalradar", path: "/app/globalradar", label: t.tabs.radar, icon: Sparkles },
    { key: "cashflow", path: "/app/cashflow", label: t.tabs.cashFlow, icon: BarChart3 },
    {
      key: "smartallocation",
      path: "/app/smartallocation",
      label: t.tabs.smartAllocation,
      icon: Sparkles,
    },
    {
      key: "snowballeffectsimulator",
      path: "/app/snowballeffectsimulator",
      label: t.snowball?.title,
      icon: TrendingUp,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background/90 backdrop-blur border-t border-border/60 min-h-[72px] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide px-3 items-center h-[72px] gap-2">
        {tabs.map(({ key, path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);

          return (
            <Link
              key={key}
              to={path}
              className={cn(
                "flex flex-row items-center gap-2 px-4 py-2 min-h-[44px] rounded-full snap-start whitespace-nowrap transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-500 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-emerald-500")} />
              <span className="text-sm font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Fade Effect na direita para indicar scroll */}
      <div className="absolute right-0 top-0 bottom-[env(safe-area-inset-bottom,0px)] w-16 pointer-events-none bg-gradient-to-l from-background to-transparent" />
    </nav>
  );
}
