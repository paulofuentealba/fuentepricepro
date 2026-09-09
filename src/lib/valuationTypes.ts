/**
 * Shared valuation contract types, used by both the valuation-consensus matrix
 * (components/shared/ValuationConsensusMatrix.tsx) and the consensus pyramid
 * (components/ceiling/watchlist/ConsensusPyramid.tsx) — previously each component
 * defined its own copy of these types independently (AGENTS.md Regra 1).
 */
export type MethodType = "gordon" | "bazin" | "graham" | "lynch" | "consensus";

export interface ValuationData {
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch?: number | null;
  consensus: number | null;
  margin?: number;
  methodDetails?: {
    gordon?: { formula: string; rate: number; growth: number; source: string; date: string; growthSource?: string };
    bazin?: { formula: string; yieldTarget: number; isNetJcp?: boolean; source: string; date: string };
    graham?: { formula: string; margin: number; source: string; date: string };
    lynch?: { formula: string; growth: number; dividendYield: number; source: string; date: string };
    consensus?: { methods: string[]; excluded: string[] };
  };
}
