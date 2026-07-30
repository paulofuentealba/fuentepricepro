import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      react: react,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: [
            "R$",
            "USD",
            "BRL",
            "€",
            "%",
            "-",
            "/",
            "|",
            "+",
            "(",
            ")",
            "—",
            ".",
            ",",
            "*",
            ":",
            "Menu",
            "Pro",
            "Free",
            "shares @",
            "·",
            "➔",
            "BR",
            "US",
            "--",
            "N/A",
            "(%)",
            "Principal",
            "R$ 10k",
            "Maturity",
            "12/05/2028",
            "Daily Compound",
            "+ R$ 150.40",
            "Crossover Point reached",
            "Fuente Price Pro &copy;",
            "Fuente Price Pro",
            "F",
            "FPP",
            "R$ 1.240",
            ",50",
            "Projected for",
            "US$",
            "USD/BRL 5.08",
            "CDB BTG Pactual",
            "Banco BTG Pactual",
            "110% CDI",
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
