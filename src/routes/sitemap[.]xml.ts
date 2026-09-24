import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://fuentepricepro.com";
// Fixed to the date of the last content/structure audit of these public routes
// (Item: SEO review). Update when meaningfully editing a page's content —
// this signals actual freshness to crawlers, unlike changefreq/priority (which
// Google mostly ignores).
const LAST_AUDIT_DATE = "2026-09-24";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Pages whose head() is localized via ?lang= (guides: Item 4 SEO review; legal pages: SEO
// consistency audit) — list all 3 language variants so crawlers can discover and index each
// one, with hreflang annotations cross-referencing the alternates per Google's documented
// pattern for multi-language sitemaps.
const LOCALIZED_PATHS: { path: string; priority: string }[] = [
  { path: "/guides", priority: "0.8" },
  { path: "/guides/dividend-valuation", priority: "0.7" },
  { path: "/guides/bazin", priority: "0.7" },
  { path: "/guides/graham", priority: "0.7" },
  { path: "/guides/gordon", priority: "0.7" },
  { path: "/guides/peter-lynch", priority: "0.7" },
  { path: "/guides/reinvestir", priority: "0.7" },
  { path: "/guides/contribution-plan", priority: "0.7" },
  { path: "/guides/withdraw", priority: "0.7" },
  { path: "/guides/snowball", priority: "0.7" },
  { path: "/guides/tax-brazil", priority: "0.7" },
  { path: "/guides/tax-usa", priority: "0.7" },
  { path: "/guides/fi-infra", priority: "0.7" },
  { path: "/guides/metrics", priority: "0.7" },
  { path: "/guides/risk-radar", priority: "0.7" },
  { path: "/guides/currency-decomposition", priority: "0.7" },
  { path: "/guides/app-directory", priority: "0.7" },
  { path: "/guides/brokers", priority: "0.6" },
  { path: "/guides/glossary", priority: "0.6" },
  { path: "/guides/concepts", priority: "0.6" },
  { path: "/terms", priority: "0.3" },
  { path: "/privacy", priority: "0.3" },
  { path: "/subscription-terms", priority: "0.3" },
];
const LOCALIZED_PATH_SET = new Set(LOCALIZED_PATHS.map((e) => e.path));
const GUIDE_LOCALES: { code: string; hreflang: string }[] = [
  { code: "", hreflang: "pt-BR" }, // ptBR is the canonical, unparametrized URL
  { code: "?lang=en", hreflang: "en" },
  { code: "?lang=es", hreflang: "es" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const allEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.8" },
          { path: "/methodology", changefreq: "monthly", priority: "0.8" },
          { path: "/guides", changefreq: "weekly", priority: "0.8" },
          { path: "/guides/dividend-valuation", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/bazin", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/graham", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/gordon", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/peter-lynch", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/reinvestir", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/contribution-plan", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/withdraw", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/snowball", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/tax-brazil", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/tax-usa", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/fi-infra", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/metrics", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/risk-radar", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/currency-decomposition", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/app-directory", changefreq: "monthly", priority: "0.7" },
          { path: "/guides/brokers", changefreq: "monthly", priority: "0.6" },
          { path: "/guides/glossary", changefreq: "monthly", priority: "0.6" },
          { path: "/guides/concepts", changefreq: "monthly", priority: "0.6" },
          { path: "/demo", changefreq: "monthly", priority: "0.6" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/subscription-terms", changefreq: "yearly", priority: "0.3" },
        ];
        // localized entries are generated separately below, with hreflang annotations
        const entries: SitemapEntry[] = allEntries.filter((e) => !LOCALIZED_PATH_SET.has(e.path));

        const guideUrls = LOCALIZED_PATHS.flatMap(({ path, priority }) =>
          GUIDE_LOCALES.map((loc) => {
            const alternates = GUIDE_LOCALES.map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${BASE_URL}${path}${alt.code}" />`,
            ).join("\n");
            const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`;
            return [
              `  <url>`,
              `    <loc>${BASE_URL}${path}${loc.code}</loc>`,
              `    <lastmod>${LAST_AUDIT_DATE}</lastmod>`,
              `    <changefreq>monthly</changefreq>`,
              `    <priority>${priority}</priority>`,
              alternates,
              xDefault,
              `  </url>`,
            ].join("\n");
          }),
        );

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <lastmod>${LAST_AUDIT_DATE}</lastmod>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...urls,
          ...guideUrls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
