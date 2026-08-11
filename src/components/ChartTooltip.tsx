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
}

const ChartTooltip = ({ active, payload, label, unit, valueLabel, formatValue }: Props) => {
  if (!active || !payload || !payload.length) return null;
  const raw = payload[0].value as number;
  const display = formatValue ? formatValue(raw) : `${raw.toLocaleString()}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      style={{
        background: "oklch(var(--card))",
        border: "1px solid oklch(var(--border))",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
      }}
    >
      {label && (
        <div style={{ color: "oklch(var(--muted-foreground))", marginBottom: 2, fontSize: 11 }}>{label}</div>
      )}
      <div style={{ color: "oklch(var(--foreground))", fontWeight: 600 }}>
        {valueLabel ? `${valueLabel}: ` : ""}
        {display}
      </div>
    </div>
  );
};

export default ChartTooltip;
