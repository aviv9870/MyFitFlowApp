export interface WeightedRepsSet {
  weight: number;
  reps: number;
}

export interface ExerciseSetLog extends WeightedRepsSet {
  exerciseName: string;
}

export interface Exercise1RMMap {
  [exerciseName: string]: number;
}

export interface CombinedImprovementInput {
  strengthScore: number | null;
  bodyScore: number | null;
  strengthWeight?: number;
  bodyWeight?: number;
}

export const COMPOUND_EXERCISE_KEYWORDS = [
  "סקוואט",
  "לחיצת חזה",
  "דדליפט",
  "מתח",
  "חתירה",
  "לחיצת כתפיים",
  "מקבילים",
  "שכיבות סמיכה",
  "היפ-תראסט",
  "לחיצה צרפתית",
  "לחיצת רגליים",
  "מכרעים",
  "לאנג",
  "בולגרי",
  "ארנולד",
  "אנכית",
  "front squat",
  "press",
  "row",
  "pull",
  "dip",
  "push",
] as const;

/**
 * Workout volume for a single set.
 */
export function calculateSetVolume(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * reps;
}

/**
 * Workout volume for a collection of sets.
 */
export function calculateTotalVolume(sets: WeightedRepsSet[]): number {
  return sets.reduce((total, set) => total + calculateSetVolume(set.weight, set.reps), 0);
}

/**
 * Format elapsed seconds to mm:ss.
 */
export function formatSecondsToClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

/**
 * Brzycki estimated 1RM formula.
 */
export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight / (1.0278 - 0.0278 * reps);
}

/**
 * Best estimated 1RM per exercise from set logs.
 */
export function getBestEstimated1RMByExercise(logs: ExerciseSetLog[]): Exercise1RMMap {
  return logs.reduce<Exercise1RMMap>((map, log) => {
    const estimate = calculateBrzycki1RM(log.weight, log.reps);
    if (estimate <= 0) return map;

    const currentBest = map[log.exerciseName];
    if (!currentBest || estimate > currentBest) {
      map[log.exerciseName] = estimate;
    }
    return map;
  }, {});
}

/**
 * Improvement percentage between two values, with optional upper cap.
 */
export function calculatePercentImprovement(
  previousValue: number,
  currentValue: number,
  maxPercentCap?: number,
): number | null {
  if (previousValue <= 0 || currentValue <= 0) return null;

  const raw = ((currentValue / previousValue) - 1) * 100;
  if (typeof maxPercentCap === "number") {
    return Math.min(raw, maxPercentCap);
  }
  return raw;
}

/**
 * Average exercise-level improvement using best 1RM maps (as in Analytics page).
 */
export function calculateAverageStrengthImprovementFrom1RM(
  previous1RM: Exercise1RMMap,
  current1RM: Exercise1RMMap,
  perExerciseCapPercent = 15,
): number | null {
  const allExerciseNames = new Set([...Object.keys(previous1RM), ...Object.keys(current1RM)]);
  const improvements: number[] = [];

  allExerciseNames.forEach((exerciseName) => {
    const previousValue = previous1RM[exerciseName];
    const currentValue = current1RM[exerciseName];

    if (!previousValue || !currentValue) return;

    const improvement = calculatePercentImprovement(previousValue, currentValue, perExerciseCapPercent);
    if (improvement !== null) {
      improvements.push(improvement);
    }
  });

  if (improvements.length === 0) return null;
  return improvements.reduce((sum, value) => sum + value, 0) / improvements.length;
}

/**
 * Body change score currently used in the app:
 * absolute percent change between current and previous body weight.
 */
export function calculateBodyWeightChangeScore(
  previousWeight: number | null | undefined,
  currentWeight: number | null | undefined,
): number | null {
  if (!previousWeight || !currentWeight || previousWeight <= 0) return null;
  return Math.abs((currentWeight - previousWeight) / previousWeight) * 100;
}

/**
 * Weighted combined improvement score (default 70% strength + 30% body).
 */
export function calculateCombinedImprovementScore({
  strengthScore,
  bodyScore,
  strengthWeight = 0.7,
  bodyWeight = 0.3,
}: CombinedImprovementInput): number {
  if (strengthScore !== null && bodyScore !== null) {
    return (strengthWeight * strengthScore) + (bodyWeight * bodyScore);
  }
  if (strengthScore !== null) return strengthScore;
  if (bodyScore !== null) return bodyScore;
  return 0;
}

/**
 * Round numeric score to one decimal place (UI-friendly).
 */
export function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Delta between latest and previous measurement values.
 */
export function calculateMeasurementDelta(
  currentValue: number | null | undefined,
  previousValue: number | null | undefined,
): number | null {
  if (currentValue == null || previousValue == null) return null;
  return currentValue - previousValue;
}

/**
 * Recommended rep range heuristic from current workout logic.
 */
export function getRecommendedRepRange(
  exerciseName: string,
  compoundKeywords: readonly string[] = COMPOUND_EXERCISE_KEYWORDS,
): string {
  const lowerCaseName = exerciseName.toLowerCase();
  const isCompound = compoundKeywords.some(
    (keyword) => lowerCaseName.includes(keyword.toLowerCase()) || exerciseName.includes(keyword),
  );
  return isCompound ? "6-12" : "8-15";
}

/**
 * Detect whether current 1RM qualifies as new PR by app threshold.
 */
export function isOneRepMaxPr(current1RM: number, previous1RM: number, threshold = 1.005): boolean {
  if (current1RM <= 0 || previous1RM <= 0) return false;
  return current1RM > previous1RM * threshold;
}
