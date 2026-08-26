import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportGoogleError } from "../lib/google-error-reporting";
import { AuthProvider } from "../lib/auth-provider";
import { AuthModalProvider } from "../lib/auth-modal";
import { I18nProvider } from "../lib/i18n-provider";
import { SubscriptionProvider } from "../lib/subscription";
import { SettingsProvider } from "../lib/settings";
import { ValuedPortfolioProvider } from "../lib/useValuedPortfolio";
import { ThemeProvider } from "../lib/theme-provider";
import { CookieConsentBanner } from "../components/shared/CookieConsentBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportGoogleError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Fuente Price Pro" },
      { name: "google-site-verification", content: "sBsjXCA7px6g_27ie-9QBXwVgqj4rBEX5QoAc3yicsM" },
      { property: "og:site_name", content: "Fuente Price Pro" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Fuente Price Pro",
          url: "https://fuentepricepro.com",
          description:
            "Intelligent Ceiling Portfolio Valuation & Passive Income Engineering platform for dividend investors across US and Brazilian markets.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const themeInitScript = `
    (function() {
      try {
        var key = 'ceilingPricePro.theme.v1';
        var stored = localStorage.getItem(key);
        var isDark = stored ? (stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) : (window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="relative min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
        <div className="pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <SettingsProvider>
                <AuthModalProvider>
                  <ValuedPortfolioProvider>
                    {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                    <Outlet />
                    <Toaster theme="dark" richColors position="top-right" />
                    <CookieConsentBanner />
                  </ValuedPortfolioProvider>
                </AuthModalProvider>
              </SettingsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
