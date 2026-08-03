import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import MaterialIcon from "@/components/MaterialIcon";
import { fetchAdherenceHistory, fetchAverageAdherence } from "@/services/nutrition";
import { getAdherenceHistory, averageAdherence } from "@/services/nutritionLocal";

interface Props {
  traineeId: string;
  days?: number;
  // Bump to force a re-read after adherence is recorded (e.g. after toggling eaten).
  refreshKey?: number;
  // The dev-only local mock trainee has no real Supabase row, so its history
  // lives in localStorage instead (see services/nutritionLocal.ts).
  isMock?: boolean;
}

// Weekly nutrition-adherence trend (spec §3: "גרף מגמה שבועי לעמידה ביעדי תזונה").
const AdherenceTrend = ({ traineeId, days = 7, refreshKey = 0, isMock = false }: Props) => {
  const [data, setData] = useState<{ label: string; value: number | null }[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const apply = (history: { date: string; adherence: number | null }[], average: number | null) => {
      if (cancelled) return;
      setData(
        history.map((p) => ({
          label: new Date(p.date).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
          value: p.adherence === null ? null : Math.round(p.adherence),
        }))
      );
      setAvg(average);
      setHasData(history.some((p) => p.adherence !== null));
    };

    if (isMock) {
      apply(getAdherenceHistory(traineeId, days), averageAdherence(traineeId, days));
    } else {
      Promise.all([fetchAdherenceHistory(traineeId, days), fetchAverageAdherence(traineeId, days)])
        .then(([history, average]) => apply(history, average))
        .catch((err) => console.error(err));
    }

    return () => {
      cancelled = true;
    };
  }, [traineeId, days, refreshKey, isMock]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MaterialIcon icon="trending_up" className="text-primary text-[18px]" />
          עמידה ביעדי תזונה (שבועי)
        </h3>
        {avg !== null && (
          <span className="text-xs font-semibold text-primary">ממוצע {Math.round(avg)}%</span>
        )}
      </div>

      {hasData ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border) / 0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "oklch(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "oklch(var(--muted-foreground))" }} width={28} />
              <ReferenceLine y={100} stroke="oklch(var(--primary) / 0.35)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "עמידה"]}
                contentStyle={{ background: "oklch(var(--card))", border: "1px solid oklch(var(--border) / 0.15)", borderRadius: "10px", fontSize: "12px" }}
              />
              <Line type="monotone" dataKey="value" stroke="oklch(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "oklch(var(--primary))" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-6">
          <MaterialIcon icon="show_chart" className="text-muted-foreground text-[28px] mb-1" />
          <p className="text-xs text-muted-foreground">עדיין אין נתוני עמידה — סמן ארוחות כ״נאכל״ כדי לצבור מגמה</p>
        </div>
      )}
    </div>
  );
};

export default AdherenceTrend;
