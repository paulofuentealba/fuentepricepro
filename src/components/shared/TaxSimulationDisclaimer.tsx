import React from "react";
import {
  RegulatoryDisclaimerBanner,
  type RegulatoryDisclaimerBannerProps,
} from "./RegulatoryDisclaimerBanner";
import { cn } from "@/lib/utils";

export interface TaxSimulationDisclaimerProps {
  className?: string;
}

/**
 * Specialized, non-dismissible regulatory disclaimer for tax simulation surfaces (Phase 2).
 *
 * Wraps RegulatoryDisclaimerBanner with variant="tax" and forceShow={true}.
 * Ensures every fiscal calculation/simulation explicitly states it is an estimate,
 * not formal tax advice, and that rules have exceptions requiring accountant verification.
 */
export function TaxSimulationDisclaimer({
  className,
}: TaxSimulationDisclaimerProps = {}) {
  return (
    <RegulatoryDisclaimerBanner
      variant="tax"
      forceShow={true}
      className={cn("border-t border-border/60 bg-muted/30", className)}
    />
  );
}
