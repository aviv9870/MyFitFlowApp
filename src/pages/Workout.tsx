import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import RestTimer from "@/components/RestTimer";
import PlanEditor from "@/components/PlanEditor";
import AIPlanGenerator from "@/components/AIPlanGenerator";
import SwapExerciseModal from "@/components/SwapExerciseModal";
import ExerciseHistory from "@/components/ExerciseHistory";
import { useGender, getProgressMessages } from "@/hooks/useGender";
import { toast } from "sonner";
import { getPlanExerciseExtras } from "@/services/workoutExtrasLocal";

interface WorkoutSet {
  weight: number;
  reps: number;
  prevWeight: number | null;
  prevReps: number | null;
  locked: boolean;
}

interface WorkoutExercise {
  name: string;
  exerciseId: string;
  targetSets: number;
  restSeconds: number;
  repRange: string;
  tempo: string;
  notes: string;
  groupId: string | null;
  groupType: "superset" | "triset" | null;
  sets: WorkoutSet[];
}

interface PlanData {
  id: string;
  name: string;
  description: string | null;
  exercises: {
    exercise_id: string;
    exercise_name: string;
    target_sets: number;
    rest_seconds: number;
    order_index: number;
    group_id: string | null;
    group_type: "superset" | "triset" | null;
    notes: string;
  }[];
}

interface SavedWorkoutState {
  phase: "active";
  startTimestamp: number;
  selectedPlan: PlanData;
  exercises: WorkoutExercise[];
}

const WORKOUT_STORAGE_KEY = "myfitflow_active_workout";

// Compound exercises keywords for rep range logic
const compoundKeywords = [
  "סקוואט", "לחיצת חזה", "דדליפט", "מתח", "חתירה", "לחיצת כתפיים",
  "מקבילים", "שכיבות סמיכה", "היפ-תראסט", "לחיצה צרפתית",
  "לחיצת רגליים", "מכרעים", "לאנג", "בולגרי", "ארנולד", "אנכית",
  "front squat", "press", "row", "pull", "dip", "push",
];

const getRepRange = (name: string): string => {
  const lower = name.toLowerCase();
  const isCompound = compoundKeywords.some((kw) => lower.includes(kw) || name.includes(kw));
  return isCompound ? "6-12" : "8-15";
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const Workout = () => {
  const { user } = useAuth();
  const gender = useGender();
  const [phase, setPhase] = useState<"select" | "active" | "done" | "edit" | "ai">("select");
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restProgressMsg, setRestProgressMsg] = useState<string | null>(null);
  const [doneSessionId, setDoneSessionId] = useState<string | null>(null);
  const [editingDone, setEditingDone] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanData | null>(null);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  // Tracks the order in which exercises were first completed (first set locked)
  const [completionOrder, setCompletionOrder] = useState<string[]>([]);

  // Restore workout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (saved) {
      try {
        const state: SavedWorkoutState = JSON.parse(saved);
        setPhase("active");
        setSelectedPlan(state.selectedPlan);
        setExercises(state.exercises);
        setStartTimestamp(state.startTimestamp);
      } catch {
        localStorage.removeItem(WORKOUT_STORAGE_KEY);
      }
    }
  }, []);

  // Persist workout state to localStorage
  useEffect(() => {
    if (phase === "active" && selectedPlan && startTimestamp) {
      const state: SavedWorkoutState = { phase: "active", startTimestamp, selectedPlan, exercises };
      localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(state));
    }
  }, [phase, exercises, selectedPlan, startTimestamp]);

  // Timer based on system clock
  useEffect(() => {
    if (phase !== "active" || !startTimestamp) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTimestamp) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, startTimestamp]);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    const { data: plansData } = await supabase
      .from("workout_plans")
      .select("id, name, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!plansData) return;

    const fullPlans: PlanData[] = [];
    for (const p of plansData) {
      const { data: exData } = await supabase
        .from("workout_plan_exercises")
        .select("exercise_id, target_sets, rest_seconds, order_index, group_id, group_type, notes")
        .eq("plan_id", p.id)
        .order("order_index");

      const exerciseIds = (exData ?? []).map((e) => e.exercise_id);
      let exerciseNames: Record<string, string> = {};
      if (exerciseIds.length > 0) {
        const { data: exNames } = await supabase.from("exercises").select("id, name").in("id", exerciseIds);
        exerciseNames = Object.fromEntries((exNames ?? []).map((e) => [e.id, e.name]));
      }

      fullPlans.push({
        id: p.id,
        name: p.name,
        description: p.description,
        exercises: (exData ?? []).map((e) => ({
          ...e,
          group_type: e.group_type as "superset" | "triset" | null,
          notes: e.notes ?? "",
          exercise_name: exerciseNames[e.exercise_id] ?? "תרגיל",
        })),
      });
    }
    setPlans(fullPlans);
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const startWorkout = useCallback(async (plan: PlanData) => {
    if (!user) return;
    setSelectedPlan(plan);
    setCompletionOrder([]);

    const exNames = plan.exercises.map((e) => e.exercise_name);

    // Batch: one query to find the latest session_id per exercise
    const { data: latestRows } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, session_id, created_at")
      .eq("user_id", user.id)
      .in("exercise_name", exNames)
      .order("created_at", { ascending: false });

    const latestSessionPerExercise: Record<string, string> = {};
    for (const row of (latestRows ?? [])) {
      if (!latestSessionPerExercise[row.exercise_name]) {
        latestSessionPerExercise[row.exercise_name] = row.session_id;
      }
    }

    // Batch: one query to fetch all sets from those sessions
    const sessionIds = [...new Set(Object.values(latestSessionPerExercise))];
    const prevDataPerSet: Record<string, { weight: number; reps: number }[]> = {};
    if (sessionIds.length > 0) {
      const { data: allPrevSets } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, weight, reps, set_number, session_id")
        .eq("user_id", user.id)
        .in("session_id", sessionIds)
        .in("exercise_name", exNames)
        .order("set_number", { ascending: true });

      for (const s of (allPrevSets ?? [])) {
        if (s.session_id === latestSessionPerExercise[s.exercise_name]) {
          if (!prevDataPerSet[s.exercise_name]) prevDataPerSet[s.exercise_name] = [];
          prevDataPerSet[s.exercise_name].push({ weight: s.weight, reps: s.reps });
        }
      }
    }

    const planExtras = getPlanExerciseExtras(plan.id);

    const ts = Date.now();
    setStartTimestamp(ts);
    setExercises(
      plan.exercises.map((pe) => ({
        name: pe.exercise_name,
        exerciseId: pe.exercise_id,
        targetSets: pe.target_sets,
        restSeconds: pe.rest_seconds,
        repRange: getRepRange(pe.exercise_name),
        tempo: planExtras[pe.exercise_id]?.tempo ?? "",
        notes: pe.notes,
        groupId: pe.group_id,
        groupType: pe.group_type,
        sets: Array.from({ length: pe.target_sets }, (_, setIdx) => {
          const prev = prevDataPerSet[pe.exercise_name]?.[setIdx];
          return {
            weight: 0,
            reps: 0,
            prevWeight: prev?.weight ?? null,
            prevReps: prev?.reps ?? null,
            locked: false,
          };
        }),
      }))
    );
    setPhase("active");
  }, [user]);

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: [...ex.sets, { weight: 0, reps: 0, prevWeight: null, prevReps: null, locked: false }] }
          : ex
      )
    );
  };

  const updateSet = (exIdx: number, setIdx: number, field: "weight" | "reps", value: number | null) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)) }
          : ex
      )
    );
  };

  const toggleSetLock = (exIdx: number, setIdx: number) => {
    const set = exercises[exIdx]?.sets[setIdx];
    if (!set) return;

    if (!set.locked) {
      // Trying to lock - validate
      if (!set.weight || !set.reps) {
        toast.error("יש להזין משקל וחזרות לפני שמירה");
        return;
      }
      // Lock and start rest timer
      setExercises((prev) =>
        prev.map((ex, i) =>
          i === exIdx
            ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, locked: true } : s)) }
            : ex
        )
      );
      // Track first-completion order for this exercise
      const exName = exercises[exIdx].name;
      setCompletionOrder((prev) => (prev.includes(exName) ? prev : [...prev, exName]));
      // Check for progress vs previous
      let progressMsg: string | null = null;
      const messages = getProgressMessages(gender);
      if (set.prevWeight !== null && set.prevReps !== null) {
        if (set.weight > set.prevWeight) {
          const pool = messages.weight;
          progressMsg = pool[Math.floor(Math.random() * pool.length)]
            .replace("${prev}", String(set.prevWeight))
            .replace("${curr}", String(set.weight));
        } else if (set.weight === set.prevWeight && set.reps > set.prevReps) {
          const pool = messages.reps;
          progressMsg = pool[Math.floor(Math.random() * pool.length)]
            .replace("${prevReps}", String(set.prevReps))
            .replace("${currReps}", String(set.reps));
        }
      }
      // In a superset/triset, rest only after the last exercise in the
      // group's round — not between the group's own exercises.
      const groupId = exercises[exIdx].groupId;
      const isLastInGroup = !groupId || (() => {
        const groupIdxs = exercises.reduce<number[]>((acc, ex, i) => (ex.groupId === groupId ? [...acc, i] : acc), []);
        return exIdx === groupIdxs[groupIdxs.length - 1];
      })();

      if (isLastInGroup) {
        setRestProgressMsg(progressMsg);
        const seconds = exercises[exIdx].restSeconds;
        setRestTimer(seconds);
        setRestEndAt(Date.now() + seconds * 1000);
      }
    } else {
      // Unlock for editing
      setExercises((prev) =>
        prev.map((ex, i) =>
          i === exIdx
            ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, locked: false } : s)) }
            : ex
        )
      );
    }
  };

  const handleRestDone = useCallback(() => {
    setRestTimer(null);
    setRestEndAt(null);
    setRestProgressMsg(null);
  }, []);

  const handleSwap = (exIdx: number, newExercise: { id: string; name: string; muscle_group: string }) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, name: newExercise.name, exerciseId: newExercise.id, repRange: getRepRange(newExercise.name) }
          : ex
      )
    );
    setSwapIdx(null);
    toast.success(`הוחלף ל-${newExercise.name}`);
  };

  const finishWorkout = async () => {
    if (!user || !selectedPlan) return;

    try {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.id, plan_name: selectedPlan.name, duration_seconds: elapsed })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const orderMap: Record<string, number> = {};
      completionOrder.forEach((n, i) => { orderMap[n] = i; });
      // Append any exercises that have logged sets but weren't tracked (fallback)
      exercises.forEach((ex) => {
        if (!(ex.name in orderMap) && ex.sets.some((s) => s.reps > 0)) {
          orderMap[ex.name] = Object.keys(orderMap).length;
        }
      });

      const setLogs = exercises.flatMap((ex) =>
        ex.sets
          .filter((s) => s.reps > 0)
          .map((s, idx) => ({
            session_id: session.id,
            user_id: user.id,
            exercise_name: ex.name,
            set_number: idx + 1,
            weight: s.weight,
            reps: s.reps,
            exercise_order: orderMap[ex.name] ?? 999,
          }))
      );

      if (setLogs.length > 0) {
        const { error: logsError } = await supabase.from("workout_set_logs").insert(setLogs);
        if (logsError) throw logsError;
      }

      localStorage.removeItem(WORKOUT_STORAGE_KEY);
      toast.success("האימון נשמר בהצלחה!");
      setDoneSessionId(session.id);
      setPhase("done");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירת האימון");
    }
  };

  const cancelWorkout = () => {
    localStorage.removeItem(WORKOUT_STORAGE_KEY);
    setPhase("select");
    setStartTimestamp(0);
    setElapsed(0);
    setCompletionOrder([]);
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase.from("workout_plans").delete().eq("id", planId);
    if (error) {
      toast.error("שגיאה במחיקה");
    } else {
      toast.success("התוכנית נמחקה");
      fetchPlans();
    }
  };

  // Rest timer and swap-exercise modal are both rendered inline as overlays
  // in the active phase (below), so opening them doesn't unmount the timer.

  const saveEditedWorkout = async () => {
    if (!user || !doneSessionId) return;
    try {
      const setLogs = exercises.flatMap((ex, exIdx) =>
        ex.sets
          .filter((s) => s.reps > 0)
          .map((s, idx) => ({
            session_id: doneSessionId,
            user_id: user.id,
            exercise_name: ex.name,
            set_number: idx + 1,
            weight: s.weight,
            reps: s.reps,
            exercise_order: exIdx,
          }))
      );

      const { error: delErr } = await supabase.from("workout_set_logs").delete().eq("session_id", doneSessionId);
      if (delErr) throw delErr;

      if (setLogs.length > 0) {
        const { error: insErr } = await supabase.from("workout_set_logs").insert(setLogs);
        if (insErr) throw insErr;
      }

      toast.success("השינויים נשמרו!");
      setEditingDone(false);
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  if (phase === "done") {
    const completedSets = exercises.flatMap((ex) =>
      ex.sets.filter((s) => s.reps > 0).map((s) => ({ name: ex.name, weight: s.weight, reps: s.reps }))
    );
    const totalVol = completedSets.reduce((a, s) => a + s.weight * s.reps, 0);
    const grouped: Record<string, { weight: number; reps: number; setIdx: number; exIdx: number }[]> = {};
    exercises.forEach((ex, exIdx) => {
      const validSets = ex.sets
        .map((s, setIdx) => ({ ...s, setIdx, exIdx }))
        .filter((s) => s.reps > 0 || editingDone);
      if (validSets.length > 0) {
        grouped[ex.name] = validSets.map((s) => ({ weight: s.weight, reps: s.reps, setIdx: s.setIdx, exIdx: s.exIdx }));
      }
    });

    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 neon-glow-box">
            <MaterialIcon icon="check_circle" className="text-primary text-[48px]" />
          </div>
          <h2 className="text-2xl font-bold neon-text mb-2">אימון הושלם!</h2>
          <p className="text-muted-foreground text-sm mb-1">
            {selectedPlan?.name} • {formatTime(elapsed)}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card p-3 text-center">
            <MaterialIcon icon="fitness_center" className="text-primary text-[20px]" />
            <p className="text-lg font-bold text-foreground">{completedSets.length}</p>
            <p className="text-[10px] text-muted-foreground">סטים</p>
          </div>
          <div className="glass-card p-3 text-center">
            <MaterialIcon icon="monitoring" className="text-primary text-[20px]" />
            <p className="text-lg font-bold text-foreground">{totalVol.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">נפח (ק״ג)</p>
          </div>
          <div className="glass-card p-3 text-center">
            <MaterialIcon icon="timer" className="text-primary text-[20px]" />
            <p className="text-lg font-bold text-foreground">{Math.floor(elapsed / 60)}</p>
            <p className="text-[10px] text-muted-foreground">דק׳</p>
          </div>
        </div>

        {/* Exercise breakdown */}
        <div className="space-y-2 mb-4">
          {Object.entries(grouped).map(([name, sets]) => (
            <div key={name} className="glass-card p-3">
              <h4 className="text-sm font-semibold text-foreground mb-2">{name}</h4>
              <div className="space-y-1">
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span className="w-8">סט</span>
                  <span className="flex-1">ק״ג</span>
                  <span className="flex-1">חזרות</span>
                  <span className="flex-1">נפח</span>
                </div>
                {sets.map((s, i) => (
                  <div key={i} className="flex gap-4 text-xs text-foreground items-center">
                    <span className="w-8 text-muted-foreground">{i + 1}</span>
                    {editingDone ? (
                      <>
                        <input type="number" value={s.weight || ""} onChange={(e) => updateSet(s.exIdx, s.setIdx, "weight", Number(e.target.value))} className="flex-1 bg-secondary/50 border border-border rounded-lg px-2 py-1 text-center text-xs" />
                        <input type="number" value={s.reps || ""} onChange={(e) => updateSet(s.exIdx, s.setIdx, "reps", Number(e.target.value))} className="flex-1 bg-secondary/50 border border-border rounded-lg px-2 py-1 text-center text-xs" />
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{s.weight}</span>
                        <span className="flex-1">{s.reps}</span>
                      </>
                    )}
                    <span className="flex-1 text-primary">{s.weight * s.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          {editingDone ? (
            <>
              <button onClick={() => setEditingDone(false)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold text-sm">ביטול</button>
              <button onClick={saveEditedWorkout} className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm">שמור שינויים</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditingDone(true)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1">
                <MaterialIcon icon="edit" className="text-[16px]" />
                ערוך
              </button>
              <button onClick={() => { setPhase("select"); setStartTimestamp(0); setElapsed(0); }} className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm">
                חזרה לתפריט
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === "edit") {
    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {editPlan ? "עריכת תוכנית" : "תוכנית חדשה"}
        </h2>
        <PlanEditor
          plan={editPlan ? { ...editPlan, exercises: editPlan.exercises } : undefined}
          onSave={() => { fetchPlans(); setPhase("select"); }}
          onCancel={() => setPhase("select")}
        />
      </div>
    );
  }

  if (phase === "ai") {
    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
        <AIPlanGenerator onPlanCreated={() => { fetchPlans(); setPhase("select"); }} onCancel={() => setPhase("select")} />
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className={`min-h-screen bg-background pb-24 px-4 max-w-lg mx-auto ${restTimer !== null ? "pt-24" : "pt-6"}`}>
        {/* Rest timer banner at top */}
        {restTimer !== null && restEndAt !== null && (
          <RestTimer seconds={restTimer} endAt={restEndAt} onDone={handleRestDone} progressMessage={restProgressMsg} />
        )}
        {swapIdx !== null && (
          <SwapExerciseModal
            currentExerciseName={exercises[swapIdx]?.name ?? ""}
            onSwap={(ex) => handleSwap(swapIdx, ex)}
            onClose={() => setSwapIdx(null)}
          />
        )}
        {/* Header with timer */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{selectedPlan?.name}</h2>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <MaterialIcon icon="timer" className="text-primary text-[18px]" />
            <span className="text-lg font-bold neon-text font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>

        <div className="space-y-4">
          {(() => {
            const renderCard = (exercise: WorkoutExercise, exIdx: number) => (
            <div key={exIdx} className="glass-card p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground flex-1">{exercise.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryExercise(exercise.name)}
                    className="p-1.5 rounded-lg hover:bg-secondary/50"
                    title="היסטוריית משקלים"
                  >
                    <MaterialIcon icon="history" className="text-muted-foreground text-[18px]" />
                  </button>
                  <button
                    onClick={() => setSwapIdx(exIdx)}
                    className="p-1.5 rounded-lg hover:bg-secondary/50"
                    title="החלף תרגיל"
                  >
                    <MaterialIcon icon="swap_horiz" className="text-muted-foreground text-[18px]" />
                  </button>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    מנוחה: {exercise.restSeconds}״
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-primary mb-1">טווח מומלץ: {exercise.repRange} חזרות</p>
              {exercise.tempo && (
                <p className="text-[10px] text-muted-foreground mb-1">
                  יעד המאמן: <span>טמפו {exercise.tempo}</span>
                </p>
              )}
              {exercise.notes && (
                <p className="text-[10px] text-muted-foreground bg-secondary/30 rounded-lg px-2 py-1 mb-3">
                  <MaterialIcon icon="sticky_note_2" className="text-[12px] align-middle ml-1" />
                  {exercise.notes}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                  <span className="w-8">סט</span>
                  <span className="flex-1 text-center">ק״ג</span>
                  <span className="flex-1 text-center">חזרות</span>
                  <span className="w-10"></span>
                </div>
                {exercise.sets.map((set, setIdx) => (
                  <div key={setIdx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8 font-bold">{setIdx + 1}</span>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={set.prevWeight !== null ? `${set.prevWeight}` : "ק״ג"}
                          value={set.weight || ""}
                          onChange={(e) => updateSet(exIdx, setIdx, "weight", Number(e.target.value))}
                          disabled={set.locked}
                          className={`w-full border rounded-xl py-3 px-3 text-base text-foreground text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all scroll-mt-24 ${
                            set.locked
                              ? "bg-secondary/30 border-primary/30 text-primary"
                              : "bg-secondary/50 border-border"
                          }`}
                        />
                        {set.prevWeight !== null && !set.weight && !set.locked && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                            קודם
                          </span>
                        )}
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder={set.prevReps !== null ? `${set.prevReps}` : exercise.repRange}
                          value={set.reps || ""}
                          onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                          disabled={set.locked}
                          className={`w-full border rounded-xl py-3 px-3 text-base text-foreground text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all scroll-mt-24 ${
                            set.locked
                              ? "bg-secondary/30 border-primary/30 text-primary"
                              : "bg-secondary/50 border-border"
                          }`}
                        />
                      </div>
                      <button
                        onClick={() => toggleSetLock(exIdx, setIdx)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          set.locked
                            ? "bg-primary neon-glow-box"
                            : "bg-secondary/50 opacity-30 hover:opacity-60"
                        }`}
                      >
                        <MaterialIcon
                          icon={set.locked ? "check" : "check"}
                          className={`text-[20px] ${set.locked ? "text-primary-foreground" : "text-foreground"}`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => addSet(exIdx)} className="mt-3 text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <MaterialIcon icon="add" className="text-[14px]" />
                הוסף סט
              </button>
            </div>
            );

            const rendered: JSX.Element[] = [];
            let i = 0;
            while (i < exercises.length) {
              const ex = exercises[i];
              if (ex.groupId) {
                const groupId = ex.groupId;
                const groupItems: { ex: WorkoutExercise; idx: number }[] = [];
                let j = i;
                while (j < exercises.length && exercises[j].groupId === groupId) {
                  groupItems.push({ ex: exercises[j], idx: j });
                  j++;
                }
                rendered.push(
                  <div key={groupId} className="border-2 border-primary/40 rounded-2xl p-2 space-y-2 bg-primary/5">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1 px-1">
                      <MaterialIcon icon="link" className="text-[14px]" />
                      {ex.groupType === "triset" ? "טריפל-סט" : "סופר-סט"}
                    </span>
                    {groupItems.map(({ ex: gex, idx: gidx }) => renderCard(gex, gidx))}
                  </div>
                );
                i = j;
              } else {
                rendered.push(renderCard(ex, i));
                i++;
              }
            }
            return rendered;
          })()}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={cancelWorkout}
            className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold text-sm"
          >
            בטל
          </button>
          <button
            onClick={finishWorkout}
            className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 neon-glow-box"
          >
            <MaterialIcon icon="check" className="text-[20px]" />
            סיים אימון
          </button>
        </div>

        {historyExercise && (
          <ExerciseHistory exerciseName={historyExercise} onClose={() => setHistoryExercise(null)} />
        )}
      </div>
    );
  }

  // Select phase
  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-2">התחל אימון</h1>
      <p className="text-sm text-muted-foreground mb-4">בחר תוכנית אימון או צור חדשה</p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setEditPlan(null); setPhase("edit"); }}
          className="flex-1 glass-card p-3 flex items-center justify-center gap-2 hover:neon-glow-box transition-all"
        >
          <MaterialIcon icon="add" className="text-primary text-[20px]" />
          <span className="text-sm font-bold text-foreground">תוכנית חדשה</span>
        </button>
        <button
          onClick={() => setPhase("ai")}
          className="flex-1 glass-card p-3 flex items-center justify-center gap-2 hover:neon-glow-box transition-all"
        >
          <MaterialIcon icon="auto_awesome" className="text-primary text-[20px]" />
          <span className="text-sm font-bold text-foreground">AI תוכנית</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center mt-10">
          <MaterialIcon icon="fitness_center" className="text-muted-foreground text-[48px] mb-2" />
          <p className="text-muted-foreground text-sm">עדיין אין תוכניות אימון</p>
          <p className="text-muted-foreground text-xs">צור תוכנית חדשה או השתמש ב-AI</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-right flex-1">
                  <p className="text-base font-bold text-foreground">{plan.name}</p>
                  {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                  <p className="text-[10px] text-primary mt-1">{plan.exercises.length} תרגילים</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditPlan(plan); setPhase("edit"); }} className="p-2 rounded-lg hover:bg-secondary/50">
                    <MaterialIcon icon="edit" className="text-muted-foreground text-[18px]" />
                  </button>
                  <button onClick={() => deletePlan(plan.id)} className="p-2 rounded-lg hover:bg-secondary/50">
                    <MaterialIcon icon="delete" className="text-destructive text-[18px]" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => startWorkout(plan)}
                className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              >
                <MaterialIcon icon="play_circle" className="text-[20px]" />
                התחל אימון
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workout;
