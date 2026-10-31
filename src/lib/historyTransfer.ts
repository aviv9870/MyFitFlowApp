import { supabase } from "@/integrations/supabase/client";

// Moving an exercise's history is a rename of `exercise_name` on the trainee's
// own logged sets, so every consumer (records, charts, "previous" hints) sees
// it under the new exercise without any extra bookkeeping.

/** One UPDATE, so the move is all-or-nothing. Returns the ids that were moved. */
export async function moveExerciseHistory(userId: string, from: string, to: string): Promise<string[]> {
  if (from === to) return [];
  const { data, error } = await supabase
    .from("workout_set_logs")
    .update({ exercise_name: to })
    .eq("user_id", userId)
    .eq("exercise_name", from)
    .select("id");
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

// Ids travel in the URL, so a long history is reverted in slices.
const SLICE = 100;

/** Puts exactly the sets that were moved back under their original name. */
export async function undoExerciseHistoryMove(userId: string, ids: string[], originalName: string): Promise<void> {
  for (let i = 0; i < ids.length; i += SLICE) {
    const { error } = await supabase
      .from("workout_set_logs")
      .update({ exercise_name: originalName })
      .eq("user_id", userId)
      .in("id", ids.slice(i, i + SLICE));
    if (error) throw error;
  }
}
