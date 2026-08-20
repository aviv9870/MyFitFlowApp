import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

// Recharts' `contentStyle` prop on <Tooltip> is unreliable when
// `trigger="click"` is used (needed for tap-to-show on mobile) - it can
// render an empty, unstyled default box instead of our themed content.
// Passing a fully custom `content` component sidesteps that entirely.
interface Props extends TooltipProps<ValueType, NameType> {
  unit?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Accent color for the indicator dot and value text. Defaults to the theme primary. */
  color?: string;
}

const ChartTooltip = ({ active, payload, label, unit, valueLabel, formatValue, color = "oklch(var(--primary))" }: Props) => {
  if (!active || !payload || !payload.length) return null;
  const raw = payload[0].value as number;
  if (raw == null) return null;
  const display = formatValue ? formatValue(raw) : `${raw.toLocaleString()}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      style={{
        background: "oklch(var(--card) / 0.96)",
        backdropFilter: "blur(6px)",
        border: "1px solid oklch(var(--border) / 0.6)",
        borderRadius: 10,
        padding: "7px 11px",
        fontSize: 12,
        boxShadow: "0 4px 16px -4px oklch(0 0 0 / 0.35)",
      }}
    >
      {label && (
        <div style={{ color: "oklch(var(--muted-foreground))", marginBottom: 3, fontSize: 10.5 }}>{label}</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: color, flexShrink: 0 }} />
        <span style={{ color: "oklch(var(--foreground))", fontWeight: 700 }}>
          {valueLabel ? `${valueLabel}: ` : ""}
          {display}
        </span>
      </div>
    </div>
  );
};

export default ChartTooltip;
