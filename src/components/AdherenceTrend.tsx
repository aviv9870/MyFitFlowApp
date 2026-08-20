import { useEffect, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import TrendChart from "@/components/charts/TrendChart";
import type { TrendPoint } from "@/lib/chartData";
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
  const [data, setData] = useState<TrendPoint[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const apply = (history: { date: string; adherence: number | null }[], average: number | null) => {
      if (cancelled) return;
      setData(
        history.map((p) => ({
          label: new Date(p.date).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
          value: p.adherence === null ? null : Math.round(p.adherence),
        }))
      );
      setAvg(average);
      setLoading(false);
    };

    if (isMock) {
      apply(getAdherenceHistory(traineeId, days), averageAdherence(traineeId, days));
    } else {
      Promise.all([fetchAdherenceHistory(traineeId, days), fetchAverageAdherence(traineeId, days)])
        .then(([history, average]) => apply(history, average))
        .catch((err) => {
          console.error(err);
          if (!cancelled) setLoading(false);
        });
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

      <TrendChart
        data={data}
        loading={loading}
        height={160}
        unit="%"
        valueLabel="עמידה"
        minPoints={1}
        connectNulls
        showYAxis
        yDomain={[0, 100]}
        emptyTitle="עדיין אין נתוני עמידה"
        emptyHint="סמן ארוחות כ״נאכל״ כדי לצבור מגמה"
      />
    </div>
  );
};

export default AdherenceTrend;
