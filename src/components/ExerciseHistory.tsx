import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";

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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      setGroups(arr);
      setLoading(false);
    };
    load();
  }, [exerciseName, user]);

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
          groups.map((g) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default ExerciseHistory;
