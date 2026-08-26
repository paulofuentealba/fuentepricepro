import { describe, it, expect } from "vitest";
import {
  DISCLAIMER_VERSION,
  TAX_DISCLAIMER_VERSION,
  isDisclaimerAccepted,
  isTaxDisclaimerAccepted,
  resolveDisclaimerText,
  type RegulatoryDisclaimerVariant,
} from "../disclaimer";
import { dict } from "../i18n";

describe("Regulatory Disclaimer (Prompt 132 / Item 0.4)", () => {
  describe("DISCLAIMER_VERSION & Acceptance Detection", () => {
    it("exports DISCLAIMER_VERSION as a non-empty string", () => {
      expect(DISCLAIMER_VERSION).toBeDefined();
      expect(typeof DISCLAIMER_VERSION).toBe("string");
      expect(DISCLAIMER_VERSION.length).toBeGreaterThan(0);
    });

    it("returns true when settings has matching disclaimerAcceptedVersion", () => {
      const settings = {
        disclaimerAcceptedVersion: DISCLAIMER_VERSION,
      };
      expect(isDisclaimerAccepted(settings)).toBe(true);
    });

    it("returns false when disclaimerAcceptedVersion is outdated, absent, or null", () => {
      expect(isDisclaimerAccepted({ disclaimerAcceptedVersion: "v0" })).toBe(false);
      expect(isDisclaimerAccepted({ disclaimerAcceptedVersion: "" })).toBe(false);
      expect(isDisclaimerAccepted({ disclaimerAcceptedVersion: undefined })).toBe(false);
      expect(isDisclaimerAccepted(null)).toBe(false);
      expect(isDisclaimerAccepted(undefined)).toBe(false);
    });

    it("allows checking against a specific requiredVersion", () => {
      const settings = {
        disclaimerAcceptedVersion: "v2",
      };
      expect(isDisclaimerAccepted(settings, "v2")).toBe(true);
      expect(isDisclaimerAccepted(settings, "v1")).toBe(false);
    });
  });

  describe("TAX_DISCLAIMER_VERSION & Tax Acceptance Detection (Prompt 137)", () => {
    it("exports TAX_DISCLAIMER_VERSION as a non-empty string", () => {
      expect(TAX_DISCLAIMER_VERSION).toBeDefined();
      expect(typeof TAX_DISCLAIMER_VERSION).toBe("string");
      expect(TAX_DISCLAIMER_VERSION.length).toBeGreaterThan(0);
    });

    it("returns true when settings has matching taxDisclaimerAcceptedVersion", () => {
      const settings = {
        taxDisclaimerAcceptedVersion: TAX_DISCLAIMER_VERSION,
      };
      expect(isTaxDisclaimerAccepted(settings)).toBe(true);
    });

    it("returns false when taxDisclaimerAcceptedVersion is outdated, absent, or null", () => {
      expect(isTaxDisclaimerAccepted({ taxDisclaimerAcceptedVersion: "v0" })).toBe(false);
      expect(isTaxDisclaimerAccepted({ taxDisclaimerAcceptedVersion: "" })).toBe(false);
      expect(isTaxDisclaimerAccepted({ taxDisclaimerAcceptedVersion: undefined })).toBe(false);
      expect(isTaxDisclaimerAccepted(null)).toBe(false);
      expect(isTaxDisclaimerAccepted(undefined)).toBe(false);
    });

    it("allows checking against a custom requiredVersion", () => {
      const settings = {
        taxDisclaimerAcceptedVersion: "v2",
      };
      expect(isTaxDisclaimerAccepted(settings, "v2")).toBe(true);
      expect(isTaxDisclaimerAccepted(settings, "v1")).toBe(false);
    });
  });

  describe("resolveDisclaimerText across variants and locales", () => {
    const locales = ["ptBR", "en", "es"] as const;
    const variants: RegulatoryDisclaimerVariant[] = ["calculation", "tax", "full"];

    for (const loc of locales) {
      const d = dict[loc];

      it(`resolves calculation variant for ${loc}`, () => {
        const text = resolveDisclaimerText(d, "calculation");
        expect(text).toBe(d.regulatoryDisclaimer.calculation);
        expect(text.length).toBeGreaterThan(20);
      });

      it(`resolves tax variant for ${loc}`, () => {
        const text = resolveDisclaimerText(d, "tax");
        expect(text).toBe(d.regulatoryDisclaimer.tax);
        expect(text.length).toBeGreaterThan(20);
      });

      it(`resolves full variant for ${loc}`, () => {
        const text = resolveDisclaimerText(d, "full");
        expect(text).toBe(d.regulatoryDisclaimer.full);
        expect(text.length).toBeGreaterThan(20);
      });

      it(`defaults to calculation when variant is omitted for ${loc}`, () => {
        const text = resolveDisclaimerText(d);
        expect(text).toBe(d.regulatoryDisclaimer.calculation);
      });
    }

    it("returns empty string when dictionary group is null/undefined", () => {
      expect(resolveDisclaimerText(null)).toBe("");
      expect(resolveDisclaimerText({})).toBe("");
    });
  });
});
