import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";

interface ValuationData {
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  consensus: number | null;
}

interface ConsensusPyramidProps {
  valuation: ValuationData;
  currency: Currency;
}

export function ConsensusPyramid({ valuation, currency }: ConsensusPyramidProps) {
  const { locale } = useI18n();

  const renderVertex = (label: string, value: number | null, positionClass: string) => {
    const isNull = value === null || value <= 0;
    return (
      <div className={`absolute flex flex-col items-center justify-center ${positionClass} ${isNull ? 'opacity-40 grayscale' : ''}`}>
        <div className="rounded-md border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md shadow-lg flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</span>
          <span className="text-sm font-bold text-white">
            {isNull ? "N/A" : formatCurrency(value, currency, locale)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6 rounded-xl border border-white/5 bg-[#0a0a0c] p-6 shadow-2xl relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-emerald-900/10 pointer-events-none" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none" />
      
      <h3 className="mb-8 text-center text-xs font-semibold text-white/80 uppercase tracking-widest">
        Fuente Valuation Model
      </h3>

      <div className="relative w-full max-w-[320px] mx-auto h-[260px]">
        {/* SVG Triangle connecting the vertices */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 320 260">
          <polygon 
            points="160,40 50,220 270,220" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray="4 6"
            className="text-indigo-500/30"
          />
          {/* Inner connections to center */}
          <line x1="160" y1="40" x2="160" y2="150" stroke="currentColor" strokeWidth="1" className="text-emerald-500/30" />
          <line x1="50" y1="220" x2="160" y2="150" stroke="currentColor" strokeWidth="1" className="text-emerald-500/30" />
          <line x1="270" y1="220" x2="160" y2="150" stroke="currentColor" strokeWidth="1" className="text-emerald-500/30" />
        </svg>

        {/* Vertices */}
        {renderVertex("Gordon", valuation.gordon, "top-0 left-1/2 -translate-x-1/2")}
        {renderVertex("Bazin", valuation.bazin, "bottom-0 left-4")}
        {renderVertex("Graham", valuation.graham, "bottom-0 right-4")}

        {/* Center Consensus */}
        <div className="absolute top-[150px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
          <div className="relative rounded-full border border-emerald-500/50 bg-black px-5 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-xl">
            <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest text-center mb-0.5 drop-shadow-md">
              Consensus
            </span>
            <span className="block text-xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {valuation.consensus !== null && valuation.consensus > 0
                ? formatCurrency(valuation.consensus, currency, locale)
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
