import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import WorkoutSummaryModal from "@/components/WorkoutSummaryModal";
import { toast } from "sonner";

interface SessionRow {
  id: string;
  plan_name: string;
  duration_seconds: number;
  completed_at: string;
}

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)} דק׳`;

const History = ({ onClose }: { onClose?: () => void }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summarySession, setSummarySession] = useState<SessionRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const monthDates = getMonthDates(currentMonth);
  const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const monthName = currentMonth.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  const navigateMonth = (dir: number) => {
    const nd = new Date(currentMonth);
    nd.setMonth(nd.getMonth() + dir);
    setCurrentMonth(nd);
  };

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", start)
      .lte("completed_at", end)
      .order("completed_at", { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user, currentMonth]);

  const deleteSession = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      const { error: logsErr } = await supabase.from("workout_set_logs").delete().eq("session_id", id);
      if (logsErr) throw logsErr;
      const { error: sessErr } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (sessErr) throw sessErr;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("האימון נמחק");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "שגיאה במחיקה");
    } finally {
      setDeletingId(null);
    }
  };

  const daysWithWorkouts = new Set(sessions.map((s) => new Date(s.completed_at).toDateString()));

  const sessionsForSelectedDay = sessions.filter(
    (s) => new Date(s.completed_at).toDateString() === selectedDate.toDateString()
  );

  if (summarySession) {
    return (
      <WorkoutSummaryModal
        sessionId={summarySession.id}
        planName={summarySession.plan_name}
        durationSeconds={summarySession.duration_seconds}
        completedAt={summarySession.completed_at}
        onClose={() => setSummarySession(null)}
        onDeleted={() => {
          setSummarySession(null);
          fetchHistory();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
            <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
          </button>
        )}
        <h1 className="text-xl font-bold text-foreground">היסטוריית אימונים</h1>
      </div>

      {/* Month navigation */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigateMonth(-1)} className="p-1 rounded-lg hover:bg-secondary/50">
            <MaterialIcon icon="chevron_right" className="text-foreground text-[22px]" />
          </button>
          <span className="text-sm font-semibold text-foreground">{monthName}</span>
          <button onClick={() => navigateMonth(1)} className="p-1 rounded-lg hover:bg-secondary/50">
            <MaterialIcon icon="chevron_left" className="text-foreground text-[22px]" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {hebrewDays.map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {monthDates.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} />;
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDate.toDateString();
            const hasWorkout = daysWithWorkouts.has(d.toDateString());
            return (
              <button
                key={d.getTime()}
                onClick={() => setSelectedDate(new Date(d))}
                className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all text-xs ${
                  isSelected ? "bg-primary/20 neon-border" : "hover:bg-secondary/50"
                }`}
              >
                <span className={`font-semibold ${isSelected ? "neon-text" : isToday ? "text-primary" : "text-foreground"}`}>
                  {d.getDate()}
                </span>
                {hasWorkout && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today button */}
      {selectedDate.toDateString() !== new Date().toDateString() && (
        <button
          onClick={() => { setSelectedDate(new Date()); setCurrentMonth(new Date()); }}
          className="w-full mb-3 text-xs text-primary flex items-center justify-center gap-1"
        >
          <MaterialIcon icon="today" className="text-[14px]" />
          חזרה להיום
        </button>
      )}

      {/* Selected day label */}
      <p className="text-xs text-muted-foreground mb-2">
        {selectedDate.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {loading ? (
        <p className="text-muted-foreground text-sm text-center mt-10">טוען...</p>
      ) : sessionsForSelectedDay.length === 0 ? (
        <div className="text-center mt-10">
          <MaterialIcon icon="event_busy" className="text-muted-foreground text-[48px] mb-2" />
          <p className="text-muted-foreground text-sm">אין אימונים ביום זה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessionsForSelectedDay.map((item) => (
            <div key={item.id} className="w-full glass-card p-3 flex items-center gap-3 hover:bg-card/70 transition-all">
              <button
                onClick={() => setSummarySession(item)}
                className="flex items-center gap-3 flex-1 text-right"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MaterialIcon icon="fitness_center" className="text-primary text-[20px]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.plan_name}</p>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MaterialIcon icon="schedule" className="text-[12px]" />
                    {formatDuration(item.duration_seconds)}
                  </span>
                </div>
              </button>
              <button
                onClick={() => {
                  if (confirm("למחוק את האימון הזה?")) deleteSession(item.id);
                }}
                disabled={deletingId === item.id}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-all"
              >
                <MaterialIcon
                  icon={deletingId === item.id ? "hourglass_top" : "delete"}
                  className={`text-destructive text-[20px] ${deletingId === item.id ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
