import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import TrendChart from "@/components/charts/TrendChart";
import { sparsePoints } from "@/lib/chartData";
import { calculateBrzycki1RM } from "@/domain/fitness-calculations";

interface SessionGroup {
  sessionId: string;
  date: string;
  sets: { set_number: number; weight: number; reps: number }[];
}

interface Props {
  exerciseName: string;
  onClose: () => void;
}

const ExerciseHistory = ({ exerciseName, onClose }: Props) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: logs } = await supabase
        .from("workout_set_logs")
        .select("session_id, set_number, weight, reps, created_at")
        .eq("user_id", user.id)
        .eq("exercise_name", exerciseName)
        .order("created_at", { ascending: false });

      const sessionIds = Array.from(new Set((logs ?? []).map((l) => l.session_id)));
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id, completed_at")
        .in("id", sessionIds);

      const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.completed_at]));
      const byId: Record<string, SessionGroup> = {};
      (logs ?? []).forEach((l) => {
        if (!byId[l.session_id]) {
          byId[l.session_id] = {
            sessionId: l.session_id,
            date: sessionMap.get(l.session_id) ?? l.created_at,
            sets: [],
          };
        }
        byId[l.session_id].sets.push({ set_number: l.set_number, weight: Number(l.weight), reps: l.reps });
      });
      const arr = Object.values(byId)
        .map((g) => ({ ...g, sets: g.sets.sort((a, b) => a.set_number - b.set_number) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setGroups(arr);
      setLoading(false);
    };
    load();
  }, [exerciseName, user]);

  // Estimated 1RM is what shows progress when weight and reps move in
  // opposite directions (60x5 is stronger than 62.5x3); the heaviest set of
  // each session is the session's best effort.
  const progress = useMemo(
    () =>
      sparsePoints(
        [...groups].reverse().slice(-12),
        (g) => g.date,
        (g) => {
          const best = Math.max(
            0,
            ...g.sets.filter((s) => s.weight > 0 && s.reps > 0).map((s) => calculateBrzycki1RM(s.weight, s.reps)),
          );
          return best > 0 ? Math.round(best * 10) / 10 : null;
        },
      ),
    [groups],
  );

  const firstValue = progress.find((p) => p.value !== null)?.value ?? null;
  const lastValue = [...progress].reverse().find((p) => p.value !== null)?.value ?? null;
  const deltaPct =
    firstValue !== null && lastValue !== null && firstValue > 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : null;

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col" dir="rtl">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MaterialIcon icon="history" className="text-primary text-[22px]" />
          <h2 className="text-base font-bold text-foreground">היסטוריית משקלים</h2>
        </div>
        <button onClick={onClose} className="p-1">
          <MaterialIcon icon="close" className="text-foreground text-[24px]" />
        </button>
      </div>
      <p className="px-4 pt-3 text-sm text-primary font-semibold">{exerciseName}</p>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm mt-10">טוען...</p>
        ) : groups.length === 0 ? (
          <div className="text-center mt-16">
            <MaterialIcon icon="history_toggle_off" className="text-muted-foreground text-[48px] mb-2" />
            <p className="text-muted-foreground text-sm">אין היסטוריה לתרגיל זה</p>
          </div>
        ) : (
          <>
            <div className="glass-card p-3">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-semibold text-foreground">גרף התקדמות</p>
                {deltaPct !== null && (
                  <span className={`flex items-center gap-1 text-[11px] font-bold ${deltaPct >= 0 ? "text-primary" : "text-destructive"}`}>
                    <MaterialIcon icon={deltaPct >= 0 ? "trending_up" : "trending_down"} className="text-[14px]" />
                    {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">1RM משוער לפי הסט הטוב באימון · עד 12 אימונים אחרונים</p>
              <TrendChart
                data={progress}
                height={120}
                unit="ק״ג"
                valueLabel="1RM משוער"
                showYAxis
                connectNulls
                emptyTitle="צריך לפחות שני אימונים עם התרגיל"
                emptyHint="אחרי אימון נוסף יופיע כאן גרף ההתקדמות"
              />
            </div>
            {groups.slice(0, 10).map((g) => (
            <div key={g.sessionId} className="glass-card p-3">
              <p className="text-xs text-muted-foreground mb-2">
                {new Date(g.date).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </p>
              <div className="space-y-1">
                {g.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="w-8 text-muted-foreground">סט {s.set_number}</span>
                    <span className="flex-1 text-foreground font-semibold">{s.weight} ק״ג</span>
                    <span className="flex-1 text-foreground">{s.reps} חזרות</span>
                  </div>
                ))}
              </div>
            </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ExerciseHistory;
