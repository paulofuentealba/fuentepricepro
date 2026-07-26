import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  FolderOpen,
  Calculator as CalculatorIcon,
  Scale,
  Sparkles,
  Menu,
  ShieldAlert,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { t } = useI18n();
  const location = useLocation();

  const tabs = [
    { key: "myportfolio", path: "/app/myportfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "screener", path: "/app/screener", label: t.tabs.calculator, icon: CalculatorIcon },
    { key: "comparator", path: "/app/comparator", label: t.tabs.comparator, icon: Scale },
    { key: "riskradar", path: "/app/riskradar", label: t.tabs.riskRadar, icon: ShieldAlert },
    { key: "globalradar", path: "/app/globalradar", label: t.tabs.radar, icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background/80 backdrop-blur border-t border-border/60 h-16 pb-safe">
      <div className="flex w-full justify-around items-center h-full px-2">
        {tabs.map(({ key, path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          
          return (
            <Link
              key={key}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-emerald-500")} />
              <span className="text-[10px] font-medium tracking-tight">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
