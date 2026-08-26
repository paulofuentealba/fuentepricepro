import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ceilingPricePro.theme.v1";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveIsDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return getSystemTheme() === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const resolved = resolveIsDark(theme);
    setIsDark(resolved);

    const root = document.documentElement;
    if (resolved) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme, mounted]);

  // Listen to system preference changes if theme is "system"
  useEffect(() => {
    if (!mounted || theme !== "system" || typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const dark = e.matches;
      setIsDark(dark);
      if (dark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if rendered outside ThemeProvider (e.g. isolated test)
    return {
      theme: "dark" as Theme,
      setTheme: () => {},
      isDark: true,
    };
  }
  return context;
}
