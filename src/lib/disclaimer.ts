import type { UserSettings } from "./useUserSettings";

/**
 * Version identifier for the regulatory disclaimer text and terms.
 * Must be incremented whenever the legal text undergoes significant normative revisions.
 */
export const DISCLAIMER_VERSION = "v1";
export const TAX_DISCLAIMER_VERSION = "v1";

export type RegulatoryDisclaimerVariant = "calculation" | "tax" | "full";

/**
 * Pure function to check if the user has accepted the specified disclaimer version.
 */
export function isDisclaimerAccepted(
  settings?: Pick<UserSettings, "disclaimerAcceptedVersion"> | null,
  requiredVersion: string = DISCLAIMER_VERSION,
): boolean {
  if (!settings || typeof settings.disclaimerAcceptedVersion !== "string") {
    return false;
  }
  return settings.disclaimerAcceptedVersion.trim() === requiredVersion.trim();
}

/**
 * Pure function to check if the user has accepted the specific tax simulation disclaimer version.
 */
export function isTaxDisclaimerAccepted(
  settings?: Pick<UserSettings, "taxDisclaimerAcceptedVersion"> | null,
  requiredVersion: string = TAX_DISCLAIMER_VERSION,
): boolean {
  if (!settings || typeof settings.taxDisclaimerAcceptedVersion !== "string") {
    return false;
  }
  return settings.taxDisclaimerAcceptedVersion.trim() === requiredVersion.trim();
}

/**
 * Resolves the appropriate disclaimer text based on the variant requested.
 * PT-BR is the normative source; other locales are informative translations.
 */
export function resolveDisclaimerText(
  t: any,
  variant: RegulatoryDisclaimerVariant = "calculation",
): string {
  const disclaimerGroup = t?.regulatoryDisclaimer;
  if (!disclaimerGroup) {
    return "";
  }

  switch (variant) {
    case "tax":
      return disclaimerGroup.tax || disclaimerGroup.message || "";
    case "full":
      return disclaimerGroup.full || disclaimerGroup.message || "";
    case "calculation":
    default:
      return disclaimerGroup.calculation || disclaimerGroup.message || "";
  }
}
