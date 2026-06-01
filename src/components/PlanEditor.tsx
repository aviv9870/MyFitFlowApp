import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface PlanExercise {
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  rest_seconds: number;
  order_index: number;
}

interface WorkoutPlan {
  id?: string;
  name: string;
  description: string;
  exercises: PlanExercise[];
}

interface Props {
  plan?: WorkoutPlan & { id: string };
  onSave: () => void;
  onCancel: () => void;
  forUserId?: string; // allows coach to create plans for a trainee
}

const PlanEditor = ({ plan, onSave, onCancel, forUserId }: Props) => {
  const { user } = useAuth();
  const effectiveUserId = forUserId || user?.id;
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>(plan?.exercises ?? []);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("exercises").select("id, name, muscle_group");
      setAllExercises(data ?? []);
    };
    fetch();
  }, []);

  const addExercise = (ex: Exercise) => {
    if (planExercises.find((pe) => pe.exercise_id === ex.id)) return;
    setPlanExercises((prev) => [
      ...prev,
      { exercise_id: ex.id, exercise_name: ex.name, target_sets: 3, rest_seconds: 90, order_index: prev.length },
    ]);
    setShowPicker(false);
    setSearchTerm("");
  };

  const removeExercise = (idx: number) => {
    setPlanExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: "target_sets" | "rest_seconds", value: number) => {
    setPlanExercises((prev) =>
      prev.map((pe, i) => (i === idx ? { ...pe, [field]: value } : pe))
    );
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= planExercises.length) return;
    const arr = [...planExercises];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setPlanExercises(arr.map((e, i) => ({ ...e, order_index: i })));
  };

  const save = async () => {
    if (!effectiveUserId || !name.trim() || planExercises.length === 0) {
      toast.error("יש למלא שם ולהוסיף לפחות תרגיל אחד");
      return;
    }
    setSaving(true);
    try {
      let planId = plan?.id;
      if (planId) {
        await supabase.from("workout_plans").update({ name, description }).eq("id", planId);
        await supabase.from("workout_plan_exercises").delete().eq("plan_id", planId);
      } else {
        const { data, error } = await supabase
          .from("workout_plans")
          .insert({ name, description, user_id: effectiveUserId, exercise_ids: [] })
          .select()
          .single();
        if (error) throw error;
        planId = data.id;
      }

      const rows = planExercises.map((pe, i) => ({
        plan_id: planId!,
        exercise_id: pe.exercise_id,
        target_sets: pe.target_sets,
        rest_seconds: pe.rest_seconds,
        order_index: i,
      }));
      const { error: insertErr } = await supabase.from("workout_plan_exercises").insert(rows);
      if (insertErr) throw insertErr;

      toast.success("התוכנית נשמרה!");
      onSave();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const filteredExercises = allExercises.filter(
    (e) => e.name.includes(searchTerm) && !planExercises.find((pe) => pe.exercise_id === e.id)
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="שם התוכנית"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <input
        type="text"
        placeholder="תיאור (אופציונלי)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="space-y-2">
        {planExercises.map((pe, idx) => (
          <div key={pe.exercise_id} className="glass-card p-3 flex items-start gap-2">
            <div className="flex flex-col gap-1">
              <button onClick={() => moveExercise(idx, -1)} className="text-muted-foreground hover:text-foreground">
                <MaterialIcon icon="keyboard_arrow_up" className="text-[16px]" />
              </button>
              <button onClick={() => moveExercise(idx, 1)} className="text-muted-foreground hover:text-foreground">
                <MaterialIcon icon="keyboard_arrow_down" className="text-[16px]" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-2">{pe.exercise_name}</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">סטים</label>
                  <input
                    type="number"
                    value={pe.target_sets}
                    onChange={(e) => updateExercise(idx, "target_sets", Number(e.target.value))}
                    className="w-full bg-secondary/50 border border-border rounded-lg py-1 px-2 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">מנוחה (שניות)</label>
                  <input
                    type="number"
                    value={pe.rest_seconds}
                    onChange={(e) => updateExercise(idx, "rest_seconds", Number(e.target.value))}
                    className="w-full bg-secondary/50 border border-border rounded-lg py-1 px-2 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <button onClick={() => removeExercise(idx)} className="text-destructive">
              <MaterialIcon icon="close" className="text-[18px]" />
            </button>
          </div>
        ))}
      </div>

      {showPicker ? (
        <div className="glass-card neon-border p-3 space-y-2">
          <input
            type="text"
            placeholder="חיפוש תרגיל..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg py-1.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="w-full text-right p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm text-foreground">{ex.name}</span>
                <span className="text-[10px] text-muted-foreground mr-2">{ex.muscle_group}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowPicker(false)} className="text-xs text-muted-foreground">
            ביטול
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full glass-card p-3 flex items-center justify-center gap-2 text-primary hover:bg-secondary/50 transition-colors"
        >
          <MaterialIcon icon="add" className="text-[18px]" />
          <span className="text-sm font-medium">הוסף תרגיל</span>
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמור תוכנית"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-secondary text-secondary-foreground py-2.5 rounded-xl font-bold text-sm"
        >
          ביטול
        </button>
      </div>
    </div>
  );
};

export default PlanEditor;
