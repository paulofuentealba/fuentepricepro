import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function getAllTsxFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsxFiles(filePath));
    } else if (filePath.endsWith(".tsx")) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Known exception list for temporary violations.
 * MUST remain empty (0 exceptions) when design system sweep is complete.
 */
const KNOWN_EXCEPTIONS: string[] = [];

describe("Design System Color Tokens SSOT Gate", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const stylesCssPath = path.join(rootDir, "src/styles.css");
  const stylesCssContent = fs.readFileSync(stylesCssPath, "utf-8");

  // 1. Extract oklch tokens from styles.css
  const tokenRegex = /--(color-[a-z0-9-]+|[a-z0-9-]+):\s*oklch\(/g;
  const oklchTokens = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(stylesCssContent)) !== null) {
    const rawToken = match[1].replace(/^color-/, "");
    if (!rawToken.startsWith("asset-")) {
      oklchTokens.add(rawToken);
    }
  }

  const componentFiles = [
    ...getAllTsxFiles(path.join(rootDir, "src/components")),
    ...getAllTsxFiles(path.join(rootDir, "src/routes")),
  ];

  // src/lib is scanned separately (rule 5 only) since it holds .ts (not .tsx) helpers
  // like classify.ts that generate className strings consumed by UI components.
  function getAllTsFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllTsFiles(filePath));
      } else if (filePath.endsWith(".ts") && !filePath.endsWith(".test.ts")) {
        results.push(filePath);
      }
    }
    return results;
  }
  const libFiles = getAllTsFiles(path.join(rootDir, "src/lib"));

  it("should maintain KNOWN_EXCEPTIONS list completely empty (0 exceptions)", () => {
    expect(KNOWN_EXCEPTIONS).toEqual([]);
  });

  it("should extract defined oklch tokens from styles.css", () => {
    expect(oklchTokens.size).toBeGreaterThan(0);
    expect(oklchTokens.has("success")).toBe(true);
    expect(oklchTokens.has("comparison")).toBe(true);
    expect(oklchTokens.has("primary")).toBe(true);
  });

  it("should enforce that no component wraps oklch tokens in hsl()", () => {
    const violations: string[] = [];

    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        for (const token of oklchTokens) {
          const invalidPattern = new RegExp(`hsl\\(\\s*var\\(\\s*--${token}\\s*\\)\\s*\\)`);
          if (invalidPattern.test(line)) {
            const relPath = path.relative(rootDir, filePath);
            violations.push(`${relPath}:${idx + 1} -> Invalid hsl(var(--${token})) wrapper`);
          }
        }
      });
    }

    expect(violations, `Found ${violations.length} invalid hsl() token wrapper(s):\n${violations.join("\n")}`).toEqual([]);
  });

  it("should enforce no hardcoded oklch() in .tsx files outside styles.css", () => {
    const violations: string[] = [];

    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        if (line.includes("oklch(") && !filePath.endsWith("styles.css")) {
          const relPath = path.relative(rootDir, filePath);
          violations.push(`${relPath}:${idx + 1} -> Hardcoded oklch() color found: ${line.trim()}`);
        }
      });
    }

    expect(violations, `Found ${violations.length} hardcoded oklch() color(s):\n${violations.join("\n")}`).toEqual([]);
  });

  it("should enforce no hardcoded rgb/rgba/hex in Recharts chart components", () => {
    const violations: string[] = [];

    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (!content.includes("recharts") && !content.includes("Recharts")) {
        continue;
      }

      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        // Remove standard Recharts attribute selector strings like [stroke='#ccc'] before testing inline props
        const sanitizedLine = line.replace(/\[stroke=['"]#(?:ccc|fff)['"]\]/g, "");

        // Match inline rgb(...), rgba(...), or hex colors #123456 or #123 in fill/stroke/style/color props
        if (
          /(fill|stroke|color)\s*=\s*["']#(?:[0-9a-fA-F]{3}){1,2}["']/.test(sanitizedLine) ||
          /(fill|stroke|color)\s*=\s*["']rgba?\([^)]+\)["']/.test(sanitizedLine) ||
          /style=\{\{[^}]*(fill|stroke|color):\s*["']#(?:[0-9a-fA-F]{3}){1,2}["']/.test(sanitizedLine) ||
          /style=\{\{[^}]*(fill|stroke|color):\s*["']rgba?\([^)]+\)["']/.test(sanitizedLine)
        ) {
          const relPath = path.relative(rootDir, filePath);
          violations.push(`${relPath}:${idx + 1} -> Hardcoded rgb/hex color in chart component: ${line.trim()}`);
        }
      });
    }

    expect(violations, `Found ${violations.length} hardcoded rgb/hex color(s) in charts:\n${violations.join("\n")}`).toEqual([]);
  });

  it("should enforce no default Tailwind color scale classes (e.g., text-amber-400, bg-red-500)", () => {
    const violations: string[] = [];
    const tailwindPaletteRegex = /\b(text|bg|border|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(?:\/[0-9]{1,3})?\b/;

    for (const filePath of [...componentFiles, ...libFiles]) {
      const normalizedPath = filePath.replace(/\\/g, "/");
      // Exclude purely decorative public marketing and documentation pages
      if (normalizedPath.endsWith("src/routes/index.tsx") || normalizedPath.endsWith("src/routes/app/docs.tsx")) {
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        if (tailwindPaletteRegex.test(line)) {
          const match = line.match(tailwindPaletteRegex)?.[0];
          const relPath = path.relative(rootDir, filePath);
          violations.push(`${relPath}:${idx + 1} -> Hardcoded Tailwind palette class found (${match}): ${line.trim()}`);
        }
      });
    }

    expect(
      violations,
      `Found ${violations.length} hardcoded Tailwind palette class(es):\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
