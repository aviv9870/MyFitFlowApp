import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";
import { getPlanExerciseExtras, savePlanExerciseExtras, type PlanExerciseExtras } from "@/services/workoutExtrasLocal";

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
  group_id: string | null;
  group_type: "superset" | "triset" | null;
  notes: string;
  // Local-only until the schema migration lands (see workoutExtrasLocal.ts)
  tempo: string;
}

// What callers pass in — tempo is loaded internally from the local overlay
// (keyed by plan id), not supplied by the caller.
type IncomingPlanExercise = Omit<PlanExercise, "tempo">;

interface WorkoutPlan {
  id?: string;
  name: string;
  description: string;
  exercises: IncomingPlanExercise[];
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
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>(() => {
    const extras = plan?.id ? getPlanExerciseExtras(plan.id) : {};
    return (plan?.exercises ?? []).map((pe) => ({
      ...pe,
      tempo: extras[pe.exercise_id]?.tempo ?? "",
    }));
  });
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newExerciseMuscle, setNewExerciseMuscle] = useState("");
  const [submittingExercise, setSubmittingExercise] = useState(false);

  const reloadExercises = async () => {
    const { data } = await supabase.from("exercises").select("id, name, muscle_group");
    setAllExercises(data ?? []);
  };

  useEffect(() => {
    reloadExercises();
  }, []);

  const submitNewExercise = async () => {
    const name = searchTerm.trim();
    if (!name || !newExerciseMuscle.trim() || !effectiveUserId) {
      toast.error("יש למלא שם קבוצת שרירים לתרגיל החדש");
      return;
    }
    setSubmittingExercise(true);
    try {
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          name,
          name_he: name,
          name_en: name,
          muscle_group: newExerciseMuscle.trim(),
          primary_muscle: newExerciseMuscle.trim(),
          status: "pending",
          submitted_by: effectiveUserId,
        })
        .select("id, name, muscle_group")
        .single();
      if (error) throw error;
      setAllExercises((prev) => [...prev, data]);
      addExercise(data);
      toast.success("התרגיל נוסף לתוכנית וממתין לאישור המאמן");
      setShowAddNew(false);
      setNewExerciseMuscle("");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהוספת תרגיל חדש");
    } finally {
      setSubmittingExercise(false);
    }
  };

  const addExercise = (ex: Exercise) => {
    if (planExercises.find((pe) => pe.exercise_id === ex.id)) return;
    setPlanExercises((prev) => [
      ...prev,
      { exercise_id: ex.id, exercise_name: ex.name, target_sets: 3, rest_seconds: 90, order_index: prev.length, group_id: null, group_type: null, notes: "", tempo: "" },
    ]);
    setShowPicker(false);
    setSearchTerm("");
  };

  const removeExercise = (idx: number) => {
    setPlanExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: "target_sets" | "rest_seconds", value: number | null) => {
    setPlanExercises((prev) =>
      prev.map((pe, i) => (i === idx ? { ...pe, [field]: value } : pe))
    );
  };

  const updateExerciseTempo = (idx: number, value: string) => {
    setPlanExercises((prev) => prev.map((pe, i) => (i === idx ? { ...pe, tempo: value } : pe)));
  };

  const updateExerciseNotes = (idx: number, value: string) => {
    setPlanExercises((prev) => prev.map((pe, i) => (i === idx ? { ...pe, notes: value } : pe)));
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= planExercises.length) return;
    const arr = [...planExercises];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setPlanExercises(arr.map((e, i) => ({ ...e, order_index: i })));
  };

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);

  const toggleSelectForGroup = (exerciseId: string) => {
    setSelectedForGroup((prev) => {
      if (prev.includes(exerciseId)) return prev.filter((id) => id !== exerciseId);
      if (prev.length >= 3) return prev;
      return [...prev, exerciseId];
    });
  };

  const createGroup = () => {
    if (selectedForGroup.length < 2) return;
    const groupType: "superset" | "triset" = selectedForGroup.length === 3 ? "triset" : "superset";
    const groupId = crypto.randomUUID();

    setPlanExercises((prev) => {
      const selectedSet = new Set(selectedForGroup);
      const firstIdx = prev.findIndex((pe) => selectedSet.has(pe.exercise_id));
      const selectedItems = prev
        .filter((pe) => selectedSet.has(pe.exercise_id))
        .map((pe) => ({ ...pe, group_id: groupId, group_type: groupType }));
      const others = prev.filter((pe) => !selectedSet.has(pe.exercise_id));
      // Reinsert the grouped items together at the position of the first selected item.
      const insertAt = prev.slice(0, firstIdx).filter((pe) => !selectedSet.has(pe.exercise_id)).length;
      const reordered = [...others.slice(0, insertAt), ...selectedItems, ...others.slice(insertAt)];
      return reordered.map((pe, i) => ({ ...pe, order_index: i }));
    });
    setSelectedForGroup([]);
    setSelectionMode(false);
  };

  const ungroup = (groupId: string) => {
    setPlanExercises((prev) => prev.map((pe) => (pe.group_id === groupId ? { ...pe, group_id: null, group_type: null } : pe)));
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
        group_id: pe.group_id,
        group_type: pe.group_type,
        notes: pe.notes || null,
      }));
      const { error: insertErr } = await supabase.from("workout_plan_exercises").insert(rows);
      if (insertErr) throw insertErr;

      const extras: Record<string, PlanExerciseExtras> = {};
      planExercises.forEach((pe) => {
        extras[pe.exercise_id] = { tempo: pe.tempo };
      });
      savePlanExerciseExtras(planId!, extras);

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

  const renderExerciseRow = (pe: PlanExercise, idx: number) => (
    <div key={pe.exercise_id} className="glass-card p-3 flex items-start gap-2">
      {selectionMode ? (
        <button
          onClick={() => toggleSelectForGroup(pe.exercise_id)}
          className={`w-6 h-6 mt-1 rounded-md border-2 flex items-center justify-center shrink-0 ${
            selectedForGroup.includes(pe.exercise_id) ? "bg-primary border-primary" : "border-border"
          }`}
        >
          {selectedForGroup.includes(pe.exercise_id) && <MaterialIcon icon="check" className="text-primary-foreground text-[14px]" />}
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          <button onClick={() => moveExercise(idx, -1)} className="text-muted-foreground hover:text-foreground">
            <MaterialIcon icon="keyboard_arrow_up" className="text-[16px]" />
          </button>
          <button onClick={() => moveExercise(idx, 1)} className="text-muted-foreground hover:text-foreground">
            <MaterialIcon icon="keyboard_arrow_down" className="text-[16px]" />
          </button>
        </div>
      )}
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
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <label className="text-[9px] text-muted-foreground">טמפו</label>
            <input
              type="text"
              placeholder="3-1-1-0"
              value={pe.tempo}
              onChange={(e) => updateExerciseTempo(idx, e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg py-1 px-2 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="text-[9px] text-muted-foreground">הערות</label>
          <textarea
            placeholder="הערות לתרגיל (טכניקה, אחיזה וכו')"
            value={pe.notes}
            onChange={(e) => updateExerciseNotes(idx, e.target.value)}
            rows={2}
            className="w-full bg-secondary/50 border border-border rounded-lg py-1 px-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      {!selectionMode && (
        <button onClick={() => removeExercise(idx)} className="text-destructive">
          <MaterialIcon icon="close" className="text-[18px]" />
        </button>
      )}
    </div>
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

      {planExercises.length >= 2 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectionMode((v) => !v); setSelectedForGroup([]); }}
            className={`text-xs font-bold flex items-center gap-1 ${selectionMode ? "text-destructive" : "text-primary"}`}
          >
            <MaterialIcon icon={selectionMode ? "close" : "link"} className="text-[16px]" />
            {selectionMode ? "ביטול קיבוץ" : "קבץ לסופר-סט / טריפל-סט"}
          </button>
          {selectionMode && (
            <button
              onClick={createGroup}
              disabled={selectedForGroup.length < 2}
              className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg disabled:opacity-40"
            >
              {selectedForGroup.length === 3 ? "צור טריפל-סט" : "צור סופר-סט"} ({selectedForGroup.length}/3)
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {(() => {
          const rendered: JSX.Element[] = [];
          let i = 0;
          while (i < planExercises.length) {
            const pe = planExercises[i];
            if (pe.group_id) {
              const groupId = pe.group_id;
              const groupItems: { pe: PlanExercise; idx: number }[] = [];
              let j = i;
              while (j < planExercises.length && planExercises[j].group_id === groupId) {
                groupItems.push({ pe: planExercises[j], idx: j });
                j++;
              }
              rendered.push(
                <div key={groupId} className="border-2 border-primary/40 rounded-2xl p-2 space-y-2 bg-primary/5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                      <MaterialIcon icon="link" className="text-[14px]" />
                      {pe.group_type === "triset" ? "טריפל-סט" : "סופר-סט"}
                    </span>
                    <button onClick={() => ungroup(groupId)} className="text-[10px] text-muted-foreground hover:text-destructive">
                      פרק קבוצה
                    </button>
                  </div>
                  {groupItems.map(({ pe: gpe, idx: gidx }) => renderExerciseRow(gpe, gidx))}
                </div>
              );
              i = j;
            } else {
              rendered.push(renderExerciseRow(pe, i));
              i++;
            }
          }
          return rendered;
        })()}
      </div>

      {showPicker ? (
        <div className="glass-card p-3 space-y-2">
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

          {searchTerm.trim() && filteredExercises.length === 0 && (
            showAddNew ? (
              <div className="glass-card p-2 space-y-2 border border-primary/30">
                <p className="text-xs text-muted-foreground">
                  הוספת "<span className="text-foreground font-semibold">{searchTerm.trim()}</span>" למאגר התרגילים — יופיע בתוכנית מיד, ויאושר לצמיתות ע"י המאמן
                </p>
                <input
                  type="text"
                  placeholder="קבוצת שרירים (למשל: חזה)"
                  value={newExerciseMuscle}
                  onChange={(e) => setNewExerciseMuscle(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg py-1.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitNewExercise}
                    disabled={submittingExercise}
                    className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {submittingExercise ? "מוסיף..." : "הוסף תרגיל חדש"}
                  </button>
                  <button onClick={() => setShowAddNew(false)} className="text-xs text-muted-foreground px-2">
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddNew(true)}
                className="w-full text-right p-2 rounded-lg border border-dashed border-primary/40 text-primary text-sm flex items-center gap-2"
              >
                <MaterialIcon icon="add_circle" className="text-[16px]" />
                לא נמצא — הוסף תרגיל חדש למאגר
              </button>
            )
          )}

          <button onClick={() => { setShowPicker(false); setShowAddNew(false); }} className="text-xs text-muted-foreground">
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
