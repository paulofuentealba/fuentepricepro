import type { UserSettings } from "./useUserSettings";

/**
 * Version identifier for the regulatory disclaimer text and terms.
 * Must be incremented whenever the legal text undergoes significant normative revisions.
 */
export const DISCLAIMER_VERSION = "v1";

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
