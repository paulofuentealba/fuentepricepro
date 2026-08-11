import { createFileRoute, Outlet } from "@tanstack/react-router";
import "@/styles/horizonte-tokens.css";
import { Header } from "@/components/ceiling/Header";
import { SidebarHorizonte } from "@/components/layout-v2/SidebarHorizonte";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { GuestWarningBanner } from "@/components/ceiling/GuestWarningBanner";
import { FeedbackWidget } from "@/components/ceiling/FeedbackWidget";
import { useAuth } from "@/lib/auth-provider";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";

/**
 * Layout raiz da v2 "Horizonte FI" — rota paralela que nunca substitui a v1
 * em produção nesta fase (ver prompt 49). Espelha `src/routes/app.tsx`,
 * reaproveitando o mesmo `useAuth()` (nenhuma verificação de sessão nova ou
 * duplicada) e os mesmos componentes de shell (`Header`,
 * `GuestWarningBanner`, `MobileBottomNav`, `FeedbackWidget`).
 *
 * `data-app-version="horizonte"` ativa os tokens de `horizonte-tokens.css`
 * (prompt 46) só dentro desta subárvore — a v1 continua com a stack de
 * fontes de sistema.
 */
export const Route = createFileRoute("/app-v2")({
  head: () => ({
    meta: [{ title: "Horizonte FI — Fuente Price Pro" }],
  }),
  component: AppV2Layout,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function AppV2Layout() {
  useAuth();

  return (
    <div
      data-app-version="horizonte"
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: "var(--h-paper)", color: "var(--h-ink)" }}
    >
      <Header />
      <GuestWarningBanner />
      <div className="flex flex-1 overflow-hidden flex-row">
        <SidebarHorizonte />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
      <FeedbackWidget />
    </div>
  );
}
