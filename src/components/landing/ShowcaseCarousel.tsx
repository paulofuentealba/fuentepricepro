import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { CARDS } from "./showcase/cards";
import { ShowcaseCard } from "./showcase/ShowcaseCard";
import { ProAllocationCard, ProForecastCard } from "./showcase/ProCards";

export function ShowcaseCarousel() {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.round(el.clientWidth * 0.85) * dir;
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      {/* Ambient emerald glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />

      {/* Heading with nav arrows */}
      <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
          {t.showcase.globalOpportunity}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={t.showcase.scrollLeft}
            onClick={() => scrollBy(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:border-success/40 hover:text-success"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t.showcase.scrollRight}
            onClick={() => scrollBy(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:border-success/40 hover:text-success"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24"
      />

      <div
        ref={scrollerRef}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((c, i) =>
          c.kind === "pro" ? (
            <div
              key={`pro-${i}`}
              className="snap-start shrink-0 basis-[85%] sm:basis-[360px] md:basis-[380px]"
            >
              {c.variant === "allocation" ? <ProAllocationCard /> : <ProForecastCard />}
            </div>
          ) : (
            <div
              key={`${c.ticker}-${i}`}
              className="snap-start shrink-0 basis-[85%] sm:basis-[360px] md:basis-[380px]"
            >
              <ShowcaseCard card={c} />
            </div>
          ),
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground sm:hidden">
        {t.landing.swipeHint}
      </p>
    </div>
  );
}
