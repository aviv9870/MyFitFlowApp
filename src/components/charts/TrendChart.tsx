import { memo, useEffect, useId, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import ChartTooltip from "@/components/ChartTooltip";
import ChartSkeleton from "./ChartSkeleton";
import ChartEmptyState from "./ChartEmptyState";
import type { TrendPoint } from "@/lib/chartData";

interface Props {
  data: TrendPoint[];
  loading?: boolean;
  height?: number;
  /** Any valid CSS color string, e.g. "oklch(var(--primary))" or a hex. */
  color?: string;
  unit?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Minimum number of non-null points required before the chart renders instead of the empty state. Default 2. */
  minPoints?: number;
  emptyIcon?: string;
  emptyTitle: string;
  emptyHint?: string;
  showYAxis?: boolean;
  yDomain?: [number | string, number | string];
  /** Draw a straight line across null gaps instead of breaking the line - use for sparse/irregular logs. */
  connectNulls?: boolean;
}

// Shared premium trend-chart look (soft gradient fill, smooth curve, tap
// tooltip, quiet skeleton, inviting empty state) used by every line/area
// chart in the app, so a coach and a trainee see the same visual language
// instead of five slightly-different one-off chart implementations.
const TrendChart = ({
  data,
  loading = false,
  height = 112,
  color = "oklch(var(--primary))",
  unit,
  valueLabel,
  formatValue,
  minPoints = 2,
  emptyIcon = "show_chart",
  emptyTitle,
  emptyHint,
  showYAxis = false,
  yDomain = ["auto", "auto"],
  connectNulls = false,
}: Props) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // A stable, guaranteed-unique id per mounted instance, so multiple
  // TrendCharts on the same page never collide on a shared
  // <linearGradient id="...">, regardless of matching props.
  const reactId = useId();

  // A fresh dataset (new trainee, new time range, etc.) invalidates
  // whatever point index was previously pinned.
  useEffect(() => {
    setActiveIdx(null);
  }, [data]);

  if (loading) return <ChartSkeleton height={height} />;

  const nonNullCount = data.filter((p) => p.value !== null).length;
  if (nonNullCount < minPoints) {
    return <ChartEmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} height={height} />;
  }

  const gradientId = `trendFill-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          onClick={(state) => {
            const idx = state?.activeTooltipIndex;
            if (idx == null) return;
            setActiveIdx((prev) => (prev === idx ? null : idx));
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal vertical={false} stroke="oklch(var(--border))" strokeOpacity={0.35} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9.5, fill: "oklch(var(--muted-foreground))" }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          {showYAxis ? (
            <YAxis tick={{ fontSize: 9, fill: "oklch(var(--muted-foreground))" }} width={38} domain={yDomain} axisLine={false} tickLine={false} />
          ) : (
            <YAxis hide domain={yDomain} />
          )}
          <Tooltip
            active={activeIdx !== null}
            defaultIndex={activeIdx ?? undefined}
            content={<ChartTooltip unit={unit} valueLabel={valueLabel} formatValue={formatValue} color={color} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "oklch(var(--background))", strokeWidth: 2 }}
            connectNulls={connectNulls}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(TrendChart);
