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
});
