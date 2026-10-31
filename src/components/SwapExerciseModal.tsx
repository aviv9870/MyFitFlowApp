import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";
import ExerciseComparisonSheet from "@/components/ExerciseComparisonSheet";
import type { ExerciseInfo } from "@/domain/exerciseComparison";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

// What the library knows about an exercise beyond what the picker's callers
// need - only used to explain the difference between two exercises.
interface LibraryExercise extends Exercise {
  name_en: string | null;
  equipment: string | null;
  description: string | null;
}

interface Kinesiology {
  movement_pattern: string | null;
  muscle_contributions: Record<string, number> | null;
  is_compound: boolean | null;
  is_unilateral: boolean | null;
  joint_stress: Record<string, number> | null;
}

interface Props {
  /** Header text - the same picker is used both for swapping and for adding. */
  title?: string;
  /** Swap only: the exercise being replaced. Shown as context and hidden from the list. */
  currentExerciseName?: string;
  /** Exercise names already in the workout, hidden from the list. */
  excludeNames?: string[];
  /** "transfer" = choosing where to move an exercise's history, not a replacement. */
  mode?: "swap" | "transfer";
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

const SwapExerciseModal = ({ title = "החלף תרגיל", currentExerciseName, excludeNames, mode = "swap", onSelect, onClose }: Props) => {
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [kinesiology, setKinesiology] = useState<Map<string, Kinesiology>>(new Map());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("הכל");
  const [explain, setExplain] = useState<LibraryExercise | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data }, { data: kin, error: kinError }] = await Promise.all([
        supabase.from("exercises").select("id, name, name_en, muscle_group, equipment, description").order("muscle_group"),
        supabase
          .from("pz_exercise_kinesiology")
          .select("exercise_id, movement_pattern, muscle_contributions, is_compound, is_unilateral, joint_stress"),
      ]);
      setExercises((data ?? []) as LibraryExercise[]);
      // Without kinesiology the explanation falls back to equipment and the
      // angle / grip in the name, so a failed read must not block the picker.
      if (kinError) console.error(kinError);
      setKinesiology(
        new Map(
          (kin ?? []).map((k) => [
            k.exercise_id,
            {
              movement_pattern: k.movement_pattern as string | null,
              muscle_contributions: k.muscle_contributions as Record<string, number> | null,
              is_compound: k.is_compound,
              is_unilateral: k.is_unilateral,
              joint_stress: k.joint_stress as Record<string, number> | null,
            },
          ]),
        ),
      );
    };
    load();
  }, []);

  const infoOf = useMemo(
    () =>
      (ex: LibraryExercise): ExerciseInfo => {
        const k = kinesiology.get(ex.id);
        return {
          name: ex.name,
          nameEn: ex.name_en ?? ex.name,
          equipment: ex.equipment,
          description: ex.description && ex.description !== ex.name ? ex.description : null,
          contributions: k?.muscle_contributions ?? undefined,
          pattern: k?.movement_pattern ?? undefined,
          isCompound: k?.is_compound ?? undefined,
          isUnilateral: k?.is_unilateral ?? undefined,
          jointStress: k?.joint_stress ?? undefined,
        };
      },
    [kinesiology],
  );

  // Filtered at render rather than at fetch time, so changing the excluded
  // names never costs another round trip to the exercise library.
  const hidden = new Set([...(excludeNames ?? []), ...(currentExerciseName ? [currentExerciseName] : [])]);
  const selectable = exercises.filter((e) => !hidden.has(e.name));
  const current = currentExerciseName ? exercises.find((e) => e.name === currentExerciseName) : undefined;

  const groups = ["הכל", ...new Set(selectable.map((e) => e.muscle_group))];
  const filtered = selectable.filter((e) => {
    const mg = filter === "הכל" || e.muscle_group === filter;
    const ms = e.name.includes(search);
    return mg && ms;
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <button onClick={onClose} className="p-1">
          <MaterialIcon icon="close" className="text-foreground text-[24px]" />
        </button>
      </div>

      <div className="px-4 mb-3">
        {currentExerciseName && (
          <p className="text-xs text-muted-foreground mb-2">
            {mode === "transfer" ? "ההיסטוריה של" : "מחליף"}: <span className="text-primary">{currentExerciseName}</span>
            {current && <span className="text-muted-foreground"> · לחיצה על i מסבירה במה כל תרגיל שונה</span>}
          </p>
        )}
        <div className="relative">
          <MaterialIcon icon="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl py-2 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
              filter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pb-6">
        {filtered.map((ex) => (
          <div key={ex.id} className="w-full glass-card p-3 flex items-center gap-2 hover:bg-card/70 transition-all">
            <button onClick={() => onSelect(ex)} className="flex-1 min-w-0 flex items-center gap-3 text-right">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MaterialIcon icon="fitness_center" className="text-primary text-[16px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ex.name}</p>
              </div>
              <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">{ex.muscle_group}</span>
            </button>
            {current && (
              <button
                onClick={() => setExplain(ex)}
                aria-label={`ההבדל בין ${current.name} ל${ex.name}`}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-primary"
              >
                <MaterialIcon icon="info" className="text-[20px]" />
              </button>
            )}
          </div>
        ))}
      </div>

      {explain && current && (
        <ExerciseComparisonSheet
          from={infoOf(current)}
          to={infoOf(explain)}
          onChoose={() => {
            const chosen = explain;
            setExplain(null);
            onSelect(chosen);
          }}
          onClose={() => setExplain(null)}
          labels={
            mode === "transfer"
              ? { current: "ההיסטוריה של", next: "מועברת אל", choose: "העבר לתרגיל הזה" }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default SwapExerciseModal;
