import MaterialIcon from "@/components/MaterialIcon";
import ChartEmptyState from "./ChartEmptyState";

export interface DistributionItem {
  name: string;
  pct: number;
  color: string;
  /** Extra line shown under the bar when this item is expanded (only used if `onToggle` is passed). */
  detail?: string;
}

interface Props {
  items: DistributionItem[];
  loading?: boolean;
  emptyIcon?: string;
  emptyTitle: string;
  emptyHint?: string;
  /** Enables per-row tap-to-expand (shows `detail` beneath the row). Omit for a static list. */
  onToggle?: (name: string) => void;
  expandedName?: string | null;
}

const BarSkeleton = () => (
  <div className="space-y-3.5 animate-pulse" aria-hidden="true">
    {[85, 65, 50, 35, 22].map((w, i) => (
      <div key={i}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-2.5 w-16 rounded bg-secondary/60" />
          <div className="h-2.5 w-6 rounded bg-secondary/60" />
        </div>
        <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-secondary/60" style={{ width: `${w}%` }} />
        </div>
      </div>
    ))}
  </div>
);

// Ranked, tap-to-expand category breakdown (e.g. muscle-group set share)
// shared between Analytics and CoachDashboard so both render identically.
const DistributionBars = ({ items, loading, emptyIcon = "pie_chart", emptyTitle, emptyHint, onToggle, expandedName }: Props) => {
  if (loading) return <BarSkeleton />;
  if (items.length === 0) return <ChartEmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} height={140} />;

  return (
    <div>
      {items.map((item) => {
        const isExpanded = expandedName === item.name;
        const rowContent = (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-medium text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
              />
            </div>
            {isExpanded && item.detail && (
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <MaterialIcon icon="event_repeat" className="text-[13px]" />
                {item.detail}
              </p>
            )}
          </>
        );
        return onToggle ? (
          <button key={item.name} type="button" onClick={() => onToggle(item.name)} className="w-full text-right mb-3.5 last:mb-0">
            {rowContent}
          </button>
        ) : (
          <div key={item.name} className="mb-3.5 last:mb-0">
            {rowContent}
          </div>
        );
      })}
    </div>
  );
};

export default DistributionBars;
