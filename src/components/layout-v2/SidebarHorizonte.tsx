import { Link, useLocation } from "@tanstack/react-router";
import {
  FolderOpen,
  BarChart3,
  Sparkles,
  Lock,
  Calculator as CalculatorIcon,
  TrendingUp,
  Scale,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";

/**
 * Sidebar da v2 "Horizonte FI" — mesma lista de navegação de
 * `src/components/layout/Sidebar.tsx` (mesmas chaves, hrefs e ícones),
 * estilizada com os tokens `--h-*` (prompt 46/49): marca em Fraunces, itens
 * em Inter, accent petróleo no item ativo.
 *
 * Todos os links continuam apontando para as rotas v1 correspondentes —
 * nenhuma tela foi migrada ainda (Dashboard migra no prompt 51, Carteira no
 * prompt 52; até lá esta sidebar só estiliza a navegação existente).
 */
export function SidebarHorizonte() {
  const { t } = useI18n();
  const { user } = useAuth();
  const location = useLocation();

  const tabs = [
    { key: "myportfolio", path: "/app/myportfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "screener", path: "/app-v2/screener", label: t.tabs.calculator, icon: CalculatorIcon },
    { key: "comparator", path: "/app-v2/comparator", label: t.tabs.comparator, icon: Scale },
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

  return (
    <aside
      className="h-full hidden md:flex flex-col w-64 shrink-0"
      style={{
        backgroundColor: "var(--h-paper-raised)",
        borderRight: "1px solid var(--h-line)",
      }}
    >
      <div
        className="flex items-center h-[72px] px-5"
        style={{ borderBottom: "1px solid var(--h-line)" }}
      >
        <span
          className="text-lg tracking-tight"
          style={{ fontFamily: "var(--h-font-display)", color: "var(--h-ink)" }}
        >
          Horizonte FI
        </span>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {tabs.map(({ key, path, label, icon: Icon, locked }) => {
          const isActive = location.pathname.startsWith(path);

          return (
            <Link
              key={key}
              to={path}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              )}
              style={{
                fontFamily: "var(--h-font-body)",
                color: isActive ? "var(--h-accent-strong)" : "var(--h-ink-soft)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--h-accent) 12%, transparent)"
                  : "transparent",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate flex-1 text-left">{label}</span>
              {locked && (
                <Lock
                  className="h-3.5 w-3.5 shrink-0 ml-auto"
                  style={{ color: "var(--h-ink-faint)" }}
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
