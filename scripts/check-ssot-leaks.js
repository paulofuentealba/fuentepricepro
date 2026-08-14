import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Directories that should never be scanned.
 */
const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".output",
  "build",
  ".claude",
  ".gemini",
  ".firebase",
  "__tests__",
  "__fixtures__",
]);

/**
 * Files where type-based currency resolution is canonically allowed (SSOT resolution & persistence).
 * Note: classify.ts is strictly for asset classification, NOT currency inference, so it is NOT whitelisted.
 */
const ALLOWED_CURRENCY_RESOLUTION_FILES = new Set([
  join("src", "lib", "watchlist.ts"),
  join("src", "lib", "api", "brapi.server.ts"),
  join("src", "lib", "api", "yahoo.server.ts"),
  join("src", "lib", "dynamicCsvParser.ts"),
  join("src", "lib", "transactionPersistence.ts"),
]);

async function walk(dir, fileList = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walk(path, fileList);
      continue;
    }

    if (!entry.isFile()) continue;
    fileList.push(path);
  }

  return fileList;
}

const allFiles = await walk("src");

const rawTypeLeaks = [];
const currencyInferenceLeaks = [];

for (const filePath of allFiles) {
  const isTsx = filePath.endsWith(".tsx");
  const isTs = filePath.endsWith(".ts");
  if (!isTsx && !isTs) continue;

  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");

  // Rule 1: Raw enum .type rendered in JSX in .tsx files
  if (isTsx) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments or non-JSX lines
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) continue;

      // Look for JSX child expressions like {item.type}, {tItem.type}, {it.type}, {asset.type}, {card.type}
      // Pattern: not preceded by '=' (which would be prop assignment type={...}) and not containing t.types[
      // Also check if line or previous 2 lines have t.types[
      const prevLinesContext = lines.slice(Math.max(0, i - 2), i + 1).join(" ");
      if (prevLinesContext.includes("t.types[")) continue;

      // Match raw expressions like <span>{it.type}</span> or >{item.type}< or \s{item.type}\s
      // Ensure it's not a prop pass like type={item.type} or key={item.type}
      const rawTypeMatch = /(?<![a-zA-Z0-9_\-=])\{[a-zA-Z0-9_]+\.type\}(?![=])/.exec(line);

      if (rawTypeMatch) {
        // Exclude Landing Showcase Card mock preview if applicable
        if (filePath.includes(join("showcase", "ShowcaseCard.tsx"))) continue;

        rawTypeLeaks.push({
          file: filePath,
          line: i + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  // Rule 2: Currency inference from type outside approved SSOT files
  if (!ALLOWED_CURRENCY_RESOLUTION_FILES.has(filePath)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) continue;

      // Detect patterns like ["Stock", "REIT"].includes or ["STOCK_US", "REIT"].includes or type === "STOCK_US" ? "USD"
      if (
        /\[(?:"Stock"|"STOCK_US"|"REIT")\s*,\s*(?:"Stock"|"STOCK_US"|"REIT")\]\.includes/.test(line) ||
        /\b(?:type|it\.type|item\.type)\s*===\s*["']STOCK_US["']\s*\?\s*["']USD["']/.test(line)
      ) {
        currencyInferenceLeaks.push({
          file: filePath,
          line: i + 1,
          snippet: line.trim(),
        });
      }
    }
  }
}

let hasError = false;

if (rawTypeLeaks.length > 0) {
  hasError = true;
  console.error("\n❌ ERROR: Raw enum .type rendered directly in JSX without t.types[...] (SSOT Leak):");
  for (const leak of rawTypeLeaks) {
    console.error(`  ${leak.file}:${leak.line} -> "${leak.snippet}"`);
  }
  console.error("  👉 Use t.types[item.type] (or t.types[item.type] ?? item.type) to render localized labels.\n");
}

if (currencyInferenceLeaks.length > 0) {
  hasError = true;
  console.error("\n❌ ERROR: Ad-hoc currency inference from type outside SSOT resolution files (SSOT Leak):");
  for (const leak of currencyInferenceLeaks) {
    console.error(`  ${leak.file}:${leak.line} -> "${leak.snippet}"`);
  }
  console.error("  👉 Use item.currency directly instead of inferring currency by type.\n");
}

if (hasError) {
  process.exit(1);
}

console.log("OK: No SSOT leaks detected (all types localized, currencies read canonically).");
