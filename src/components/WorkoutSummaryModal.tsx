import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import PersonalRecords from "@/components/PersonalRecords";
import { toast } from "sonner";

interface SetLog {
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  exercise_order?: number | null;
}

interface Props {
  sessionId: string;
  planName: string;
  durationSeconds: number;
  completedAt: string;
  onClose: () => void;
  onDeleted?: () => void;
  readOnly?: boolean;
}

const WorkoutSummaryModal = ({ sessionId, planName, durationSeconds, completedAt, onClose, onDeleted, readOnly }: Props) => {
  const { user } = useAuth();
  const [sets, setSets] = useState<SetLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<{ insights: string[]; recommendation: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [gender, setGender] = useState<string>("male");
  const [editing, setEditing] = useState(false);
  const [editSets, setEditSets] = useState<SetLog[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, set_number, weight, reps, exercise_order")
        .eq("session_id", sessionId)
        .order("exercise_order", { ascending: true, nullsFirst: false })
        .order("set_number");
      setSets((data ?? []) as SetLog[]);
      setLoading(false);
    };
    fetchData();

    if (user) {
      supabase.from("user_settings").select("gender").eq("user_id", user.id).single().then(({ data }) => {
        if (data?.gender) setGender(data.gender);
      });
    }
  }, [sessionId, user]);

  const grouped: Record<string, SetLog[]> = {};
  const displaySets = editing ? editSets : sets;
  displaySets.forEach((s) => {
    if (!grouped[s.exercise_name]) grouped[s.exercise_name] = [];
    grouped[s.exercise_name].push(s);
  });

  const totalVolume = displaySets.reduce((a, s) => a + s.weight * s.reps, 0);
  const m = Math.floor(durationSeconds / 60);
  const date = new Date(completedAt).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  const startEditing = () => {
    setEditSets(sets.map(s => ({ ...s })));
    setEditing(true);
  };

  const updateEditSet = (idx: number, field: "weight" | "reps", value: number) => {
    setEditSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveEdits = async () => {
    if (!user || saving) return;
    setSaving(true);
    const backup = [...sets];
    try {
      const inserts = editSets.filter(s => s.reps > 0).map(s => ({
        session_id: sessionId,
        user_id: user.id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        exercise_order: s.exercise_order ?? null,
      }));

      const { error: delErr } = await supabase.from("workout_set_logs").delete().eq("session_id", sessionId);
      if (delErr) throw delErr;

      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from("workout_set_logs").insert(inserts);
        if (insErr) {
          // Restore original rows to avoid permanent data loss
          await supabase.from("workout_set_logs").insert(
            backup.map(s => ({
              session_id: sessionId,
              user_id: user.id,
              exercise_name: s.exercise_name,
              set_number: s.set_number,
              weight: s.weight,
              reps: s.reps,
              exercise_order: s.exercise_order ?? null,
            }))
          );
          throw insErr;
        }
      }

      setSets(editSets.filter(s => s.reps > 0));
      setEditing(false);
      toast.success("האימון עודכן בהצלחה");
    } catch (err) {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const analyzeWorkout = async () => {
    if (loadingAi || !user) return;
    setLoadingAi(true);
    try {
      const genderPrompt = gender === "female"
        ? "פני אל המשתמשת בלשון נקבה."
        : "פנה אל המשתמש בלשון זכר.";

      // Fetch previous records to detect PRs for AI context
      const { data: allLogs } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, weight, reps, session_id")
        .eq("user_id", user.id)
        .neq("session_id", sessionId);

      const prevLogs = allLogs ?? [];
      const calc1RM = (w: number, r: number) => r === 1 ? w : w / (1.0278 - 0.0278 * r);
      const prs: { exercise: string; type: string; oldValue: number; newValue: number }[] = [];

      const currentByEx: { [ex: string]: typeof displaySets } = {};
      displaySets.forEach(s => {
        if (!currentByEx[s.exercise_name]) currentByEx[s.exercise_name] = [];
        currentByEx[s.exercise_name].push(s);
      });

      for (const [exercise, exSets] of Object.entries(currentByEx)) {
        const prevForEx = prevLogs.filter(l => l.exercise_name === exercise);
        const currentMaxWeight = Math.max(...exSets.map(s => s.weight));
        const current1RM = Math.max(...exSets.map(s => calc1RM(s.weight, s.reps)));

        if (prevForEx.length > 0) {
          const prevMaxWeight = Math.max(...prevForEx.map(l => l.weight));
          const prev1RM = Math.max(...prevForEx.map(l => calc1RM(l.weight, l.reps)));
          if (currentMaxWeight > prevMaxWeight) {
            prs.push({ exercise, type: "weight", oldValue: prevMaxWeight, newValue: currentMaxWeight });
          } else if (current1RM > prev1RM * 1.005) {
            prs.push({ exercise, type: "1rm", oldValue: Math.round(prev1RM * 10) / 10, newValue: Math.round(current1RM * 10) / 10 });
          }
        }
      }

      const workoutData = {
        planName,
        duration: m,
        exercises: Object.entries(grouped).map(([name, exSets]) => ({
          name,
          sets: exSets.map(s => ({ weight: s.weight, reps: s.reps })),
        })),
        totalVolume,
        personalRecords: prs,
      };

      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: {
          type: "analyze_single_workout",
          workout: workoutData,
          genderContext: genderPrompt,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiAnalysis(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "שגיאה בניתוח AI");
    } finally {
      setLoadingAi(false);
    }
  };

  // Flat index for editSets
  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h2 className="text-base font-bold text-foreground">סיכום אימון</h2>
        <button onClick={onClose} className="p-1">
          <MaterialIcon icon="close" className="text-foreground text-[24px]" />
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="glass-card neon-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold neon-text mb-1">{planName}</h3>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
            <div className="flex items-center gap-2">
              {!editing && !readOnly && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 hover:bg-secondary/70 transition-all"
                >
                  <MaterialIcon icon="edit" className="text-foreground text-[16px]" />
                  <span className="text-xs font-bold text-foreground">ערוך</span>
                </button>
              )}
              <button
                onClick={analyzeWorkout}
                disabled={loadingAi}
                className="flex items-center gap-1 bg-primary/15 border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/25 transition-all"
              >
                <MaterialIcon icon={loadingAi ? "hourglass_top" : "auto_awesome"} className={`text-primary text-[18px] ${loadingAi ? "animate-spin" : ""}`} />
                <span className="text-xs font-bold text-primary">AI</span>
              </button>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1">
              <MaterialIcon icon="schedule" className="text-primary text-[16px]" />
              <span className="text-sm text-foreground">{m} דק׳</span>
            </div>
            <div className="flex items-center gap-1">
              <MaterialIcon icon="fitness_center" className="text-primary text-[16px]" />
              <span className="text-sm text-foreground">{displaySets.length} סטים</span>
            </div>
            <div className="flex items-center gap-1">
              <MaterialIcon icon="monitoring" className="text-primary text-[16px]" />
              <span className="text-sm text-foreground">{totalVolume.toLocaleString()} נפח</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit save/cancel bar */}
      {editing && (
        <div className="px-4 mb-3 flex gap-2">
          <button onClick={saveEdits} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-bold disabled:opacity-50">
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
          <button onClick={() => setEditing(false)} className="px-4 bg-secondary/50 border border-border rounded-xl py-2 text-sm text-foreground">
            ביטול
          </button>
        </div>
      )}

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="px-4 mb-4">
          <div className="glass-card neon-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon icon="auto_awesome" className="text-primary text-[18px]" />
              <h4 className="text-sm font-bold text-foreground">ניתוח AI</h4>
            </div>
            <div className="space-y-2">
              {aiAnalysis.insights.map((insight, i) => (
                <div key={i} className="bg-secondary/50 rounded-xl p-2.5">
                  <div className="flex items-start gap-2">
                    <MaterialIcon icon="insights" className="text-primary text-[14px] mt-0.5" />
                    <p className="text-xs text-muted-foreground">{insight}</p>
                  </div>
                </div>
              ))}
              <div className="bg-primary/10 rounded-xl p-2.5">
                <span className="text-xs font-semibold text-primary">המלצה</span>
                <p className="text-xs text-foreground mt-1">{aiAnalysis.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Records */}
      {!loading && user && (
        <PersonalRecords
          sessionId={sessionId}
          sets={displaySets}
          userId={user.id}
          planName={planName}
          date={date}
        />
      )}

      {loading ? (
        <p className="text-center text-muted-foreground text-sm">טוען...</p>
      ) : (
        <div className="px-4 space-y-3 pb-24">
          {Object.entries(grouped).map(([name, exerciseSets]) => {
            const startIdx = flatIdx;
            flatIdx += exerciseSets.length;
            return (
              <div key={name} className="glass-card p-3">
                <h4 className="text-sm font-semibold text-foreground mb-2">{name}</h4>
                <div className="space-y-1">
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span className="w-8">סט</span>
                    <span className="flex-1">ק״ג</span>
                    <span className="flex-1">חזרות</span>
                    <span className="flex-1">נפח</span>
                  </div>
                  {exerciseSets.map((s, i) => (
                    <div key={i} className="flex gap-4 text-xs text-foreground items-center">
                      <span className="w-8 text-muted-foreground">{s.set_number}</span>
                      {editing ? (
                        <>
                          <input
                            type="number"
                            value={s.weight}
                            onChange={(e) => updateEditSet(startIdx + i, "weight", Number(e.target.value))}
                            className="flex-1 bg-secondary/50 border border-border rounded px-1 py-0.5 text-xs text-foreground w-12"
                          />
                          <input
                            type="number"
                            value={s.reps}
                            onChange={(e) => updateEditSet(startIdx + i, "reps", Number(e.target.value))}
                            className="flex-1 bg-secondary/50 border border-border rounded px-1 py-0.5 text-xs text-foreground w-12"
                          />
                          <span className="flex-1 text-primary">{s.weight * s.reps}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex-1">{s.weight}</span>
                          <span className="flex-1">{s.reps}</span>
                          <span className="flex-1 text-primary">{s.weight * s.reps}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkoutSummaryModal;
