import { calculateBrzycki1RM } from "./fitness-calculations";
import {
  ANALYSIS_DAYS,
  NEGLECTED_DAYS,
  PLATEAU_SESSIONS,
  PROGRESS_THRESHOLD_PCT,
  REP_BANDS,
  TRACKED_MUSCLES,
  WEEKLY_FREQUENCY_TARGET,
  WEEKLY_SETS,
  bandOf,
  verdictForShare,
} from "./trainingKnowledge";

// The analytics screen's analysis, computed from the trainee's own numbers
// instead of asked from an LLM: same output shape, but instant, free, offline,
// and identical every time it runs on the same data.

export interface AnalysisSet {
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
}

export interface TrainingQuality {
  quality: string;
  verdict: string;
  detail: string;
}

export interface TrainingAnalysis {
  training_qualities: TrainingQuality[];
  insights: string[];
  recommendation: string;
}

export interface AnalysisInput {
  /** Set logs from the analysis window (older rows are ignored). */
  sets: AnalysisSet[];
  /** completed_at of the sessions in that window. */
  sessionDates: string[];
  /** This week's credited sets per muscle group, synergists included. */
  weeklySets: Record<string, number>;
  muscleOf: (exerciseName: string) => string;
  gender?: "male" | "female";
  now?: Date;
}

const DAY = 86_400_000;
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const round1 = (n: number) => Math.round(n * 10) / 10;
const list = (names: string[]) =>
  names.length <= 1 ? names[0] ?? "" : `${names.slice(0, -1).join(", ")} ו${names[names.length - 1]}`;
const bandLabel = (max: number) => (max >= 100 ? "20+" : String(max));

/** Best estimated 1RM per calendar day an exercise was trained, oldest first. */
const sessionBests = (sets: AnalysisSet[]) => {
  const byDay = new Map<string, { date: Date; best: number; weight: number; reps: number }>();
  for (const s of sets) {
    const date = new Date(s.created_at);
    if (Number.isNaN(date.getTime()) || !(s.weight > 0) || !(s.reps > 0)) continue;
    const key = date.toISOString().slice(0, 10);
    const e1rm = calculateBrzycki1RM(s.weight, s.reps);
    const current = byDay.get(key);
    if (!current || e1rm > current.best) byDay.set(key, { date, best: e1rm, weight: s.weight, reps: s.reps });
  }
  return [...byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
};

export function analyzeTraining({
  sets,
  sessionDates,
  weeklySets,
  muscleOf,
  gender = "male",
  now = new Date(),
}: AnalysisInput): TrainingAnalysis {
  const male = gender !== "female";
  const you = (m: string, f: string) => (male ? m : f);

  const windowStart = now.getTime() - ANALYSIS_DAYS * DAY;
  const recent = sets.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return Number.isFinite(t) && t >= windowStart && s.reps > 0;
  });

  if (recent.length === 0) {
    return {
      training_qualities: [],
      insights: [`אין סטים מתועדים ב-${ANALYSIS_DAYS} הימים האחרונים, אז אין על מה לבסס ניתוח.`],
      recommendation: you(
        "תתעד אימון אחד מלא, ומיד אחריו יופיע כאן ניתוח של טווחי החזרות, הנפח וההתקדמות שלך.",
        "תתעדי אימון אחד מלא, ומיד אחריו יופיע כאן ניתוח של טווחי החזרות, הנפח וההתקדמות שלך.",
      ),
    };
  }

  // --- Training qualities: what the rep ranges actually worked on ---
  const bandCounts: Record<string, number> = {};
  for (const s of recent) {
    const band = bandOf(s.reps);
    if (band) bandCounts[band] = (bandCounts[band] ?? 0) + 1;
  }
  const classified = Object.values(bandCounts).reduce((a, n) => a + n, 0) || recent.length;
  const training_qualities = REP_BANDS.map((band) => {
    const count = bandCounts[band.key] ?? 0;
    const share = count / classified;
    return {
      quality: band.label,
      verdict: verdictForShare(share),
      detail:
        count === 0
          ? `אין סטים בטווח ${band.min}-${bandLabel(band.max)} חזרות.`
          : `${Math.round(share * 100)}% מהסטים (${count} מתוך ${classified}) בטווח ${band.min}-${bandLabel(band.max)} חזרות.`,
    };
  });

  const insights: string[] = [];
  const topBand = REP_BANDS.reduce((a, b) => ((bandCounts[b.key] ?? 0) > (bandCounts[a.key] ?? 0) ? b : a));
  const topShare = (bandCounts[topBand.key] ?? 0) / classified;
  insights.push(
    `${Math.round(topShare * 100)}% מהסטים ב-${ANALYSIS_DAYS} הימים האחרונים בטווח ${topBand.min}-${bandLabel(topBand.max)} חזרות, כלומר העבודה שלך התרכזה ב${topBand.label}.`,
  );

  // --- Muscles that haven't been trained at all lately ---
  const lastTrained = new Map<string, number>();
  for (const s of recent) {
    const muscle = muscleOf(s.exercise_name);
    const t = new Date(s.created_at).getTime();
    if (t > (lastTrained.get(muscle) ?? 0)) lastTrained.set(muscle, t);
  }
  const neglected = TRACKED_MUSCLES.filter((m) => {
    const t = lastTrained.get(m);
    return !t || now.getTime() - t > NEGLECTED_DAYS * DAY;
  });
  if (neglected.length > 0 && neglected.length < TRACKED_MUSCLES.length) {
    insights.push(`${list([...neglected])} לא קיבלו אף סט ב-${NEGLECTED_DAYS} הימים האחרונים.`);
  }

  // --- Weekly volume per muscle against the recommended range ---
  // A muscle already called out as untrained is skipped here: the fraction of a
  // set it picks up as a synergist elsewhere would otherwise have it reported
  // twice, once as neglected and once as merely under the minimum.
  const below: { muscle: string; sets: number }[] = [];
  const above: { muscle: string; sets: number }[] = [];
  for (const muscle of TRACKED_MUSCLES) {
    const weekly = round1(weeklySets[muscle] ?? 0);
    if (weekly < 1 || neglected.includes(muscle)) continue;
    if (weekly < WEEKLY_SETS.mev) below.push({ muscle, sets: weekly });
    else if (weekly > WEEKLY_SETS.max) above.push({ muscle, sets: weekly });
  }
  const setsPhrase = (entries: { muscle: string; sets: number }[]) =>
    list(entries.map((e) => `${e.muscle} ${e.sets} סטים`));
  if (below.length > 0) {
    insights.push(
      `השבוע ${setsPhrase(below)}, מתחת ל-${WEEKLY_SETS.mev} הסטים השבועיים שנחשבים למינימום אפקטיבי לקבוצת שריר.`,
    );
  }
  if (above.length > 0) {
    insights.push(`השבוע ${setsPhrase(above)}, מעל הטווח המומלץ של עד ${WEEKLY_SETS.max} סטים לשבוע.`);
  }

  // --- Frequency ---
  const sessionsInWindow = sessionDates.filter((d) => {
    const t = new Date(d).getTime();
    return Number.isFinite(t) && t >= windowStart;
  }).length;
  const perWeek = round1((sessionsInWindow / ANALYSIS_DAYS) * 7);
  if (sessionsInWindow > 0) {
    insights.push(
      `${sessionsInWindow} אימונים ב-${ANALYSIS_DAYS} ימים, ${perWeek} בשבוע בממוצע${
        perWeek < WEEKLY_FREQUENCY_TARGET
          ? `, פחות מ-${WEEKLY_FREQUENCY_TARGET} אימונים בשבוע שמאפשרים לחזור על כל קבוצת שריר פעמיים`
          : ""
      }.`,
    );
  }

  // --- Progression per exercise: improving vs stuck ---
  const byExercise = new Map<string, AnalysisSet[]>();
  for (const s of recent) {
    const rows = byExercise.get(s.exercise_name) ?? [];
    rows.push(s);
    byExercise.set(s.exercise_name, rows);
  }
  const improving: { name: string; change: number }[] = [];
  const stuck: { name: string; weight: number; reps: number }[] = [];
  for (const [name, rows] of byExercise) {
    const bests = sessionBests(rows);
    if (bests.length < 2) continue;
    const latest = bests[bests.length - 1];
    const baseline = bests[Math.max(0, bests.length - PLATEAU_SESSIONS)];
    if (!(baseline.best > 0)) continue;
    const change = ((latest.best - baseline.best) / baseline.best) * 100;
    if (change >= PROGRESS_THRESHOLD_PCT) improving.push({ name, change });
    else if (bests.length >= PLATEAU_SESSIONS) stuck.push({ name, weight: latest.weight, reps: latest.reps });
  }
  improving.sort((a, b) => b.change - a.change);
  if (improving.length > 0) {
    insights.push(
      `ה-1RM המשוער עלה ב${list(improving.slice(0, 2).map((e) => `${e.name} (${signed(round1(e.change))})`))}.`,
    );
  }
  if (stuck.length > 0) {
    insights.push(
      `${list(stuck.slice(0, 2).map((e) => `${e.name} (${e.weight}ק״ג × ${e.reps})`))} על אותו ביצוע ${PLATEAU_SESSIONS} אימונים ברציפות.`,
    );
  }

  // --- One recommendation, by what matters most first ---
  let recommendation: string;
  if (neglected.length > 0 && neglected.length < TRACKED_MUSCLES.length) {
    recommendation = you(
      `תוסיף באימון הקרוב 2-3 סטים ל${neglected[0]}, כדי שכל קבוצת שריר תקבל עבודה באותו שבוע.`,
      `תוסיפי באימון הקרוב 2-3 סטים ל${neglected[0]}, כדי שכל קבוצת שריר תקבל עבודה באותו שבוע.`,
    );
  } else if (below.length > 0) {
    recommendation = you(
      `תוסיף עוד 2-4 סטים ל${below[0].muscle} השבוע, כדי להגיע ל-${WEEKLY_SETS.mev} סטים לפחות.`,
      `תוסיפי עוד 2-4 סטים ל${below[0].muscle} השבוע, כדי להגיע ל-${WEEKLY_SETS.mev} סטים לפחות.`,
    );
  } else if (stuck.length > 0) {
    recommendation = you(
      `ב${stuck[0].name} תנסה חזרה אחת נוספת בכל סט, ורק כשכל הסטים יושלמו בטווח תעלה במשקל.`,
      `ב${stuck[0].name} תנסי חזרה אחת נוספת בכל סט, ורק כשכל הסטים יושלמו בטווח תעלי במשקל.`,
    );
  } else if (above.length > 0) {
    recommendation = you(
      `הנפח ב${above[0].muscle} מעל הטווח המומלץ. תוריד סט או שניים ותשמור על אותם משקלים.`,
      `הנפח ב${above[0].muscle} מעל הטווח המומלץ. תורידי סט או שניים ותשמרי על אותם משקלים.`,
    );
  } else if (sessionsInWindow > 0 && perWeek < WEEKLY_FREQUENCY_TARGET) {
    recommendation = you(
      "תוסיף אימון שבועי אחד, כדי שכל קבוצת שריר תאומן פעמיים בשבוע.",
      "תוסיפי אימון שבועי אחד, כדי שכל קבוצת שריר תאומן פעמיים בשבוע.",
    );
  } else {
    recommendation = you(
      "הנפח, התדירות וההתקדמות בטווח הנכון. תמשיך באותה תוכנית ותעלה משקל כשכל הסטים בטווח החזרות מושלמים.",
      "הנפח, התדירות וההתקדמות בטווח הנכון. תמשיכי באותה תוכנית ותעלי משקל כשכל הסטים בטווח החזרות מושלמים.",
    );
  }

  return { training_qualities, insights, recommendation };
}
