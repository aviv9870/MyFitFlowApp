// A quiet, shimmering placeholder shaped like a trend line - shown while
// a chart's data is loading, instead of a spinner that gives no sense of
// what's about to appear.
const ChartSkeleton = ({ height = 112 }: { height?: number }) => {
  // A fixed, plausible-looking silhouette (not random per-render, so it
  // doesn't jitter on re-renders while still reading as "a chart").
  const points = "0,70 12,55 24,60 36,40 48,48 60,25 72,35 84,15 100,22";
  return (
    <div className="animate-pulse" style={{ height }} aria-hidden="true">
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          points={points}
          fill="none"
          stroke="oklch(var(--muted-foreground) / 0.25)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

export default ChartSkeleton;
