// Which personal records a workout set, set by set, against what the trainee
// has done before. Pure, so the rules can be tested without a database.

export type RecordType = "weight" | "1rm" | "reps" | "volume";

export interface SessionSet {
  exercise_name: string;
  weight: number;
  reps: number;
}

export interface PreviousSet extends SessionSet {
  session_id: string;
}

export interface PRRecord {
  exercise: string;
  type: RecordType;
  oldValue: number;
  newValue: number;
  isFirst: boolean;
  /** Set when the value beaten belongs to another variation of the same lift. */
  baseline?: string;
}

export const calc1RM = (w: number, r: number) => (r === 1 ? w : w / (1.0278 - 0.0278 * r));

interface Best {
  value: number;
  /** the exercise whose history produced it */
  from: string;
}

// Highest value over `logs`; on a tie the earliest log wins, so callers put the
// exercise's own logs first and a tie is never blamed on a variation.
const best = (logs: PreviousSet[], valueOf: (l: PreviousSet) => number): Best => {
  let out: Best = { value: -Infinity, from: "" };
  for (const l of logs) {
    const v = valueOf(l);
    if (v > out.value) out = { value: v, from: l.exercise_name };
  }
  return out;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * An exercise with its own history is judged against that history only: a
 * lighter variation (incline vs flat) would otherwise never set a record while
 * a heavier one existed. An exercise with *no* history is judged against its
 * family - changing the cable handle, or the bench angle, shouldn't make you
 * "new" at lifting - and only counts a record where it actually beats them.
 */
export function findPersonalRecords(
  sets: SessionSet[],
  previous: PreviousSet[],
  siblingsOf: (exercise: string) => string[] = () => [],
): PRRecord[] {
  const found: PRRecord[] = [];

  const currentByExercise = new Map<string, SessionSet[]>();
  for (const s of sets) currentByExercise.set(s.exercise_name, [...(currentByExercise.get(s.exercise_name) ?? []), s]);

  for (const [exercise, exSets] of currentByExercise) {
    const own = previous.filter((l) => l.exercise_name === exercise);
    const siblings = new Set(siblingsOf(exercise));
    const fromFamily = own.length === 0 ? previous.filter((l) => siblings.has(l.exercise_name)) : [];
    const baseline = own.length > 0 ? own : fromFamily;
    const usingFamily = own.length === 0 && fromFamily.length > 0;

    const currentMaxWeight = Math.max(...exSets.map((s) => s.weight));
    const current1RM = Math.max(...exSets.map((s) => calc1RM(s.weight, s.reps)));
    const currentMaxReps = Math.max(...exSets.map((s) => s.reps));
    const currentVolume = exSets.reduce((a, s) => a + s.weight * s.reps, 0);

    if (baseline.length === 0) {
      found.push({ exercise, type: "weight", oldValue: 0, newValue: currentMaxWeight, isFirst: true });
      continue;
    }

    const prevWeight = best(baseline, (l) => Number(l.weight));
    const prev1RM = best(baseline, (l) => calc1RM(Number(l.weight), l.reps));
    const prevReps = best(baseline, (l) => l.reps);

    // Best single-session volume, per exercise: a session that holds both flat
    // and incline sets must not add their volumes together.
    const volumeBySession = new Map<string, Best>();
    for (const l of baseline) {
      const key = `${l.session_id}|${l.exercise_name}`;
      const prior = volumeBySession.get(key);
      volumeBySession.set(key, { value: (prior?.value ?? 0) + Number(l.weight) * l.reps, from: l.exercise_name });
    }
    const prevVolume = [...volumeBySession.values()].reduce<Best>((a, b) => (b.value > a.value ? b : a), { value: 0, from: "" });

    const baselineName = (b: Best) => (usingFamily && b.from && b.from !== exercise ? b.from : undefined);
    const before = found.length;

    if (currentMaxWeight > prevWeight.value) {
      found.push({ exercise, type: "weight", oldValue: prevWeight.value, newValue: currentMaxWeight, isFirst: false, baseline: baselineName(prevWeight) });
    }
    if (current1RM > prev1RM.value * 1.005) {
      found.push({ exercise, type: "1rm", oldValue: round1(prev1RM.value), newValue: round1(current1RM), isFirst: false, baseline: baselineName(prev1RM) });
    }
    if (currentMaxReps > prevReps.value) {
      found.push({ exercise, type: "reps", oldValue: prevReps.value, newValue: currentMaxReps, isFirst: false, baseline: baselineName(prevReps) });
    }
    if (currentVolume > prevVolume.value * 1.02) {
      found.push({ exercise, type: "volume", oldValue: Math.round(prevVolume.value), newValue: Math.round(currentVolume), isFirst: false, baseline: baselineName(prevVolume) });
    }

    // First time on this variation and it didn't beat the family: it is still a
    // first, exactly as a brand-new exercise has always been.
    if (usingFamily && found.length === before) {
      found.push({ exercise, type: "weight", oldValue: 0, newValue: currentMaxWeight, isFirst: true });
    }
  }

  return found;
}
