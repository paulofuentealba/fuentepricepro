import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Forbidden legacy tagline strings. If any of these reappear in the codebase,
 * the build must fail so the old copy does not get shipped again.
 */
const FORBIDDEN = [
  "Intelligent\u00a0Ceiling Price and Smart Allocation Tool",
  "Intelligent Ceiling Price and Smart Allocation Tool",
  "Ferramenta Inteligente de Preço\u00a0Teto e Aporte Inteligente",
  "Ferramenta Inteligente de Preço Teto e Aporte Inteligente",
  "Ceiling Price & Smart Allocation for Dividend Investors",
];

/** Extensions to scan for text copy. */
const EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  ".md",
  ".html",
  ".css",
]);

/** Directories that should never be scanned. */
const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".git", ".output", "build"]);

async function walk(dir, matches = [], thisScriptPath = join(".", "scripts", "forbid-legacy-tagline.js")) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walk(path, matches, thisScriptPath);
      continue;
    }

    if (!entry.isFile()) continue;

    // Do not scan the checker itself; it legitimately contains the forbidden strings.
    if (path === thisScriptPath) continue;

    const extIndex = entry.name.lastIndexOf(".");
    const ext = extIndex === -1 ? "" : entry.name.slice(extIndex);
    if (!EXTENSIONS.has(ext)) continue;

    const content = await readFile(path, "utf-8");
    for (const phrase of FORBIDDEN) {
      if (content.includes(phrase)) {
        matches.push({ path, phrase });
      }
    }
  }

  return matches;
}

const matches = await walk(".");

if (matches.length > 0) {
  console.error("ERROR: Legacy tagline found in the codebase:");
  for (const { path, phrase } of matches) {
    console.error(`  ${path}: "${phrase}"`);
  }
  console.error("\nUpdate the copy to the new tagline before building.");
  process.exit(1);
}

console.log("OK: No legacy tagline found.");
