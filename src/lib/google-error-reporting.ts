// Generic Google Error Reporting placeholder
// You can integrate this with Google Analytics (gtag) or Firebase Crashlytics

export function reportGoogleError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  
  console.error("[Google Error Reporter]", error, context);

  // Example integration with Google Analytics (gtag.js):
  // if (typeof window.gtag === "function") {
  //   window.gtag("event", "exception", {
  //     description: String(error),
  //     fatal: false,
  //     ...context
  //   });
  // }
}
