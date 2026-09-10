import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dict, type Dict, type Locale, toIntlLocale } from "./i18n";

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "fuente_lang";
const LEGACY_STORAGE_KEY = "ceiling-price-pro:locale";

function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ptBR" || v === "es";
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "ptBR";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (isLocale(legacy)) {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    // ignore
  }
  try {
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("pt")) return "ptBR";
    if (nav.startsWith("es")) return "es";
    if (nav.startsWith("en")) return "en";
  } catch {
    // ignore
  }
  // No stored preference and no recognized browser language signal —
  // default to ptBR (decision: majority of content and users are BR).
  return "ptBR";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ptBR");

  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  // Keep <html lang> honest for accessibility/SEO crawlers that do render
  // client JS — was previously hardcoded to "en" in __root.tsx regardless
  // of actual content language.
  useEffect(() => {
    try {
      document.documentElement.lang = toIntlLocale(locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<I18nCtx>(
    () => ({ locale, setLocale, t: dict[locale] }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      locale: "ptBR",
      setLocale: () => {},
      t: dict.ptBR,
    };
  }
  return ctx;
}
