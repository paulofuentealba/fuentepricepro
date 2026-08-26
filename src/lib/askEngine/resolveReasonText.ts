/**
 * Resolves a dictionary string key (or path) and interpolates all {{param}} tokens with reasonParams.
 *
 * Scoped pure helper for AskEngine reason keys and consequence values.
 *
 * @param t I18n translation dictionary or getter
 * @param reasonKey Path to key in dictionary, e.g. "askEngine.reasons.highestNetYield" or direct string
 * @param reasonParams Structured parameter map from the AskEngine, e.g. { yield: 12.4 }
 */
export function resolveReasonText(
  t: any,
  reasonKey?: string | null,
  reasonParams?: Record<string, string | number | null | undefined>,
): string {
  if (!reasonKey || typeof reasonKey !== "string") {
    return "";
  }

  // 1. Resolve raw template string by dot-path or direct lookup
  let template = "";
  if (t && typeof t === "object") {
    const parts = reasonKey.split(".");
    let curr = t;
    for (const part of parts) {
      if (curr && typeof curr === "object" && part in curr) {
        curr = curr[part];
      } else {
        curr = null;
        break;
      }
    }
    if (typeof curr === "string") {
      template = curr;
    }
  }

  // Graceful fallback to reasonKey if not found in dictionary
  if (!template) {
    template = reasonKey;
  }

  // 2. Return template as is if no parameters are provided
  if (!reasonParams || Object.keys(reasonParams).length === 0) {
    return template;
  }

  // 3. Interpolate all {{token}} matches
  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    if (token in reasonParams) {
      const val = reasonParams[token];
      return val !== null && val !== undefined ? String(val) : "";
    }
    return match;
  });
}
