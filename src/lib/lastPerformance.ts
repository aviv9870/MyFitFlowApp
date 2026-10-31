import { supabase } from "@/integrations/supabase/client";
import { loadFamilyIndex } from "@/lib/exerciseLibrary";

export interface PreviousSet {
  weight: number;
  reps: number;
}

/**
 * The last session each exercise was trained in, set by set - the "previous"
 * numbers shown in a workout card. An exercise with no history of its own
 * (first time on the V-bar after months on the rope) borrows its most
 * recently trained sibling's last session instead of starting blind.
 */
export async function loadLastPerformance(
  userId: string,
  exerciseNames: string[],
): Promise<Record<string, PreviousSet[]>> {
  if (exerciseNames.length === 0) return {};
  const families = await loadFamilyIndex();
  const candidates = [...new Set(exerciseNames.flatMap((n) => [n, ...families.siblingsOf(n)]))];

  // One query for the latest session per candidate. Rows come newest first, so
  // the order names first appear in is also how recently each was trained.
  const { data: latestRows } = await supabase
    .from("workout_set_logs")
    .select("exercise_name, session_id, created_at")
    .eq("user_id", userId)
    .in("exercise_name", candidates)
    .order("created_at", { ascending: false });

  const latestSession: Record<string, string> = {};
  const recency: string[] = [];
  for (const row of latestRows ?? []) {
    if (!latestSession[row.exercise_name]) {
      latestSession[row.exercise_name] = row.session_id;
      recency.push(row.exercise_name);
    }
  }

  // Where each wanted exercise's numbers come from: itself, else its most
  // recently trained sibling.
  const source: Record<string, string> = {};
  for (const name of exerciseNames) {
    if (latestSession[name]) source[name] = name;
    else {
      const sibling = families
        .siblingsOf(name)
        .filter((s) => latestSession[s])
        .sort((a, b) => recency.indexOf(a) - recency.indexOf(b))[0];
      if (sibling) source[name] = sibling;
    }
  }

  const sessionIds = [...new Set(Object.values(source).map((s) => latestSession[s]))];
  if (sessionIds.length === 0) return {};

  const { data: sets } = await supabase
    .from("workout_set_logs")
    .select("exercise_name, weight, reps, set_number, session_id")
    .eq("user_id", userId)
    .in("session_id", sessionIds)
    .in("exercise_name", [...new Set(Object.values(source))])
    .order("set_number", { ascending: true });

  const result: Record<string, PreviousSet[]> = {};
  for (const name of exerciseNames) {
    const from = source[name];
    if (!from) continue;
    result[name] = (sets ?? [])
      .filter((s) => s.exercise_name === from && s.session_id === latestSession[from])
      .map((s) => ({ weight: Number(s.weight), reps: s.reps }));
  }
  return result;
}
