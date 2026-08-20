import MaterialIcon from "@/components/MaterialIcon";

interface Props {
  icon: string;
  title: string;
  hint?: string;
  height?: number;
}

// Consistent, inviting "nothing to show yet" state for every chart in the
// app, instead of each screen writing its own slightly-different variant.
const ChartEmptyState = ({ icon, title, hint, height = 112 }: Props) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: height }}>
    <MaterialIcon icon={icon} className="text-muted-foreground/60 text-[30px] mb-1.5" />
    <p className="text-xs text-muted-foreground">{title}</p>
    {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
  </div>
);

export default ChartEmptyState;
