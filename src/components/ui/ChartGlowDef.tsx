export function ChartGlowDef({ id = "glowLine", blur = 4 }: { id?: string; blur?: number }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={blur} result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  );
}
