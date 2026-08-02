import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";

interface Props {
  onPlanCreated: () => void;
  onCancel: () => void;
}

const goalOptions = [
  { label: "בניית שריר", value: "בניית מסת שריר והגדלת נפח" },
  { label: "חיטוב", value: "חיטוב הגוף ושריפת שומן" },
  { label: "כוח", value: "הגברת כוח מקסימלי" },
  { label: "סיבולת", value: "שיפור סיבולת שרירית" },
];

const daysOptions = [2, 3, 4, 5, 6];
const durationOptions = [
  { label: "30 דקות", value: 30 },
  { label: "45 דקות", value: 45 },
  { label: "60 דקות", value: 60 },
  { label: "75 דקות", value: 75 },
  { label: "90 דקות", value: 90 },
];

const muscleOptions = [
  { label: "חזה", value: "חזה" },
  { label: "גב", value: "גב" },
  { label: "כתפיים", value: "כתפיים" },
  { label: "רגליים", value: "רגליים" },
  { label: "יד קדמית", value: "יד קדמית" },
  { label: "יד אחורית", value: "יד אחורית" },
  { label: "בטן", value: "בטן" },
];

const AIPlanGenerator = ({ onPlanCreated, onCancel }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggleMuscle = (m: string) => {
    setFocusMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const generate = async () => {
    if (!user) return;
    if (!goal) { toast.error("יש לבחור מטרה"); return; }
    setLoading(true);
    try {
      const { data: history } = await supabase
        .from("workout_sessions")
        .select("plan_name, duration_seconds, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: {
          type: "generate_plan",
          goal,
          daysPerWeek,
          sessionDuration,
          focusMuscles,
          history,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "שגיאה ביצירת תוכנית");
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!user || !result) return;
    setLoading(true);
    try {
      const { data: exercises } = await supabase.from("exercises").select("id, name");
      const exerciseMap = new Map((exercises ?? []).map((e) => [e.name, e.id]));

      const { data: plan, error } = await supabase
        .from("workout_plans")
        .insert({ name: result.name, description: result.description, user_id: user.id, exercise_ids: [] })
        .select()
        .single();
      if (error) throw error;

      const unmatched = result.exercises
        .filter((ex: any) => !exerciseMap.get(ex.name))
        .map((ex: any) => ex.name);
      if (unmatched.length > 0) {
        toast.warning(`${unmatched.length} תרגילים לא נמצאו בספרייה ולא נשמרו: ${unmatched.join(", ")}`);
      }

      const rows = result.exercises
        .map((ex: any, i: number) => {
          const exerciseId = exerciseMap.get(ex.name);
          if (!exerciseId) return null;
          return {
            plan_id: plan.id,
            exercise_id: exerciseId,
            target_sets: ex.target_sets,
            rest_seconds: ex.rest_seconds,
            order_index: i,
          };
        })
        .filter(Boolean);

      if (rows.length > 0) {
        await supabase.from("workout_plan_exercises").insert(rows);
      }

      toast.success("התוכנית נשמרה!");
      onPlanCreated();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MaterialIcon icon="auto_awesome" className="text-primary text-[20px]" />
            <h3 className="text-base font-bold text-foreground">{result.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{result.description}</p>
          <div className="space-y-2">
            {result.exercises?.map((ex: any, i: number) => (
              <div key={i} className="bg-secondary/50 rounded-xl p-2 flex items-center justify-between">
                <span className="text-sm text-foreground">{ex.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {ex.target_sets} סטים • {ex.rest_seconds}״ מנוחה
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={savePlan} disabled={loading} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            {loading ? "שומר..." : "שמור תוכנית"}
          </button>
          <button onClick={() => setResult(null)} className="flex-1 bg-secondary text-secondary-foreground py-2.5 rounded-xl font-bold text-sm">
            נסה שוב
          </button>
        </div>
        <button onClick={onCancel} className="w-full text-center text-xs text-muted-foreground">ביטול</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MaterialIcon icon="auto_awesome" className="text-primary text-[20px]" />
        <h3 className="text-base font-bold text-foreground">בניית תוכנית עם AI</h3>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">מה המטרה שלך?</p>
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setGoal(opt.value)}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  goal === opt.value
                    ? "bg-primary/20 neon-border text-primary"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => { if (goal) setStep(2); }} disabled={!goal} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
              הבא
            </button>
            <button onClick={onCancel} className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl font-bold text-sm">ביטול</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">כמה אימונים בשבוע?</p>
          <div className="flex gap-2">
            {daysOptions.map((d) => (
              <button
                key={d}
                onClick={() => setDaysPerWeek(d)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  daysPerWeek === d
                    ? "bg-primary/20 neon-border text-primary"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">כמה זמן כל אימון?</p>
          <div className="flex gap-2 flex-wrap">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSessionDuration(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  sessionDuration === opt.value
                    ? "bg-primary/20 neon-border text-primary"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(1)} className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl font-bold text-sm">חזרה</button>
            <button onClick={() => setStep(3)} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm">הבא</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">אילו שרירים תרצה להתמקד בהם?</p>
          <p className="text-[10px] text-muted-foreground">בחר שריר אחד או יותר (אופציונלי)</p>
          <div className="flex gap-2 flex-wrap">
            {muscleOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleMuscle(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  focusMuscles.includes(opt.value)
                    ? "bg-primary/20 neon-border text-primary"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(2)} className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl font-bold text-sm">חזרה</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm">הבא</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">סיכום</p>
          <div className="glass-card p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">מטרה:</span>
              <span className="text-foreground font-medium">{goalOptions.find((g) => g.value === goal)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">אימונים בשבוע:</span>
              <span className="text-foreground font-medium">{daysPerWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">זמן אימון:</span>
              <span className="text-foreground font-medium">{sessionDuration} דקות</span>
            </div>
            {focusMuscles.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">מיקוד:</span>
                <span className="text-foreground font-medium">{focusMuscles.join(", ")}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(3)} className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl font-bold text-sm">חזרה</button>
            <button
              onClick={generate}
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <MaterialIcon icon="hourglass_top" className="text-[18px] animate-spin" />
                  יוצר תוכנית...
                </>
              ) : (
                <>
                  <MaterialIcon icon="auto_awesome" className="text-[18px]" />
                  צור תוכנית
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPlanGenerator;
