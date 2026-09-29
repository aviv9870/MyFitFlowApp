import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import TrendChart from "@/components/charts/TrendChart";
import DistributionBars from "@/components/charts/DistributionBars";
import ExerciseHistory from "@/components/ExerciseHistory";
import { bucketByDay, bucketByMonth, safeNumber, safeDiv, type TrendPoint } from "@/lib/chartData";
import { canonicalMuscleGroup, muscleColor, formatSets, tallyMuscleWork, tallyRegionWeek, type MuscleWork, type RegionWork } from "@/lib/muscleGroups";
import { regionsForExercise } from "@/lib/exerciseRegions";
import { DEFAULT_WEEKLY_SET_RANGE, type RegionGroup } from "@/components/3d/regions";
import { toast } from "sonner";
import { analyzeTraining, type AnalysisSet } from "@/domain/trainingInsights";
import { ANALYSIS_DAYS } from "@/domain/trainingKnowledge";
import { useGender } from "@/hooks/useGender";

// three.js and the 5 MB model load only when this page renders the map.
const MuscleMap3D = lazy(() => import("@/components/3d/MuscleMap3D"));

type RangeKey = "week" | "month" | "year";

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "שבוע" },
  { key: "month", label: "חודש" },
  { key: "year", label: "שנה" },
];

const RANGE_CONFIG: Record<RangeKey, { days: number; label: string; bucket: "day" | "month" }> = {
  week: { days: 7, label: "נפח אימון שבועי", bucket: "day" },
  month: { days: 30, label: "נפח אימון חודשי", bucket: "day" },
  year: { days: 365, label: "נפח אימון שנתי", bucket: "month" },
};

interface VolumeTrend {
  points: TrendPoint[];
  total: number;
  deltaPct: number | null;
}

// How the weekly improvement figure was derived: matched-exercise estimated
// 1RM, or the volume-per-set fallback when no exercise repeated across weeks.
type ImprovementMethod = "e1rm" | "volume" | null;

interface ImprovementDriver {
  name: string;
  pct: number;
  fromWeight: number;
  fromReps: number;
  toWeight: number;
  toReps: number;
}

// Names the actual mechanism behind an exercise's change, so the percentage
// isn't just a number the trainee has to take on faith.
const describeDriver = (d: ImprovementDriver) => {
  const dw = d.toWeight - d.fromWeight;
  const dr = d.toReps - d.fromReps;
  if (dw > 0 && dr > 0) return "העלית משקל וגם חזרות";
  if (dw > 0 && dr === 0) return "העלית משקל";
  if (dw > 0 && dr < 0) return "משקל גבוה יותר, פחות חזרות";
  if (dw === 0 && dr > 0) return "יותר חזרות באותו משקל";
  if (dw < 0 && dr > 0) return "יותר חזרות, משקל נמוך יותר";
  if (dw < 0) return "ירידה במשקל";
  if (dr < 0) return "פחות חזרות";
  return "ללא שינוי";
};

const Analytics = () => {
  const { user } = useAuth();
  const gender = useGender();
  const [stats, setStats] = useState<{
    totalWorkouts: number;
    avgDuration: number;
    improvement: number;
    isBaseWeek: boolean;
    method: ImprovementMethod;
    comparedCount: number;
    drivers: ImprovementDriver[];
  }>({
    totalWorkouts: 0,
    avgDuration: 0,
    improvement: 0,
    isBaseWeek: false,
    method: null,
    comparedCount: 0,
    drivers: [],
  });

  // Inputs for the local analysis engine (domain/trainingInsights), which
  // replaced the LLM call on this screen.
  const [analysisSets, setAnalysisSets] = useState<AnalysisSet[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [exerciseGroups, setExerciseGroups] = useState<Record<string, string>>({});

  const [range, setRange] = useState<RangeKey>("week");
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrend>({ points: [], total: 0, deltaPct: null });
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [showTrendChart, setShowTrendChart] = useState(false);
  const [showMuscleBars, setShowMuscleBars] = useState(false);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [progressExercise, setProgressExercise] = useState<string | null>(null);

  const [muscleSetCounts, setMuscleSetCounts] = useState<Record<string, number>>({});
  const [muscleWeekly, setMuscleWeekly] = useState<Record<string, MuscleWork>>({});
  const [regionWeek, setRegionWeek] = useState<{
    regions: Partial<Record<RegionGroup, RegionWork>>;
    offModelSets: number;
  }>({ regions: {}, offModelSets: 0 });
  const [expandedMuscle, setExpandedMuscle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchMuscleDistribution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !showTrendChart) return;
    fetchVolumeTrend(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, range, showTrendChart]);

  const fetchVolumeTrend = useCallback(async (r: RangeKey) => {
    if (!user) return;
    setLoadingTrend(true);
    try {
      const cfg = RANGE_CONFIG[r];
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - cfg.days);
      const prevWindowStart = new Date(now);
      prevWindowStart.setDate(prevWindowStart.getDate() - cfg.days * 2);

      const { data } = await supabase
        .from("workout_set_logs")
        .select("weight, reps, created_at")
        .eq("user_id", user.id)
        .gte("created_at", prevWindowStart.toISOString())
        .order("created_at", { ascending: true });

      const all = data ?? [];
      const current = all.filter((row) => new Date(row.created_at) >= windowStart);
      const previous = all.filter((row) => new Date(row.created_at) < windowStart);

      // safeNumber guards against a null/garbled weight or reps value
      // silently turning the whole trend into NaN.
      const volumeOf = (row: { weight: number; reps: number }) => safeNumber(row.weight) * safeNumber(row.reps);
      const sumVolume = (rows: { weight: number; reps: number }[]) => rows.reduce((a, row) => a + volumeOf(row), 0);
      const currentTotal = sumVolume(current);
      const previousTotal = sumVolume(previous);
      const deltaPct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

      // T is pinned to the row type: left to inference it's taken from
      // volumeOf's narrower { weight, reps } parameter, and row.created_at
      // then fails to typecheck.
      type SetRow = (typeof current)[number];
      const points =
        cfg.bucket === "day"
          ? bucketByDay<SetRow>(current, (row) => row.created_at, volumeOf, windowStart, now)
          : bucketByMonth<SetRow>(current, (row) => row.created_at, volumeOf, 12, now);

      setVolumeTrend({ points, total: Math.round(currentTotal), deltaPct });
    } finally {
      setLoadingTrend(false);
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .order("completed_at", { ascending: false });


    setSessionDates((recentSessions ?? []).map((sess) => sess.completed_at).filter((d): d is string => !!d));

    const recentCount = recentSessions?.length ?? 0;
    const avgDur = recentSessions?.reduce((a, s) => a + s.duration_seconds, 0) ?? 0;

    // === Weekly Training Improvement (body weight is intentionally excluded) ===
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: recentSets } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, weight, reps")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    const { data: olderSets } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, weight, reps")
      .eq("user_id", user.id)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString());

    const recent = recentSets ?? [];
    const older = olderSets ?? [];

    // Estimated 1RM via Epley: weight * (1 + reps / 30)
    const epley1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

    // Best (top-set) per exercise. Keeping the set's weight and reps - not just
    // the e1RM - is what lets the card explain *why* the number moved, since a
    // single percentage can come from heavier load or from more reps.
    const bestSetByExercise = (sets: { exercise_name: string; weight: number; reps: number }[]) => {
      const map: Record<string, { e1rm: number; weight: number; reps: number }> = {};
      sets.forEach((s) => {
        if (s.reps <= 0 || s.weight <= 0) return;
        const e1rm = epley1RM(s.weight, s.reps);
        if (!map[s.exercise_name] || e1rm > map[s.exercise_name].e1rm) {
          map[s.exercise_name] = { e1rm, weight: s.weight, reps: s.reps };
        }
      });
      return map;
    };

    let improvement = 0;
    let isBaseWeek = false;
    let method: ImprovementMethod = null;
    let comparedCount = 0;
    let drivers: ImprovementDriver[] = [];

    if (older.length === 0) {
      // No data at all from last week - nothing to compare against yet
      isBaseWeek = true;
    } else {
      const recentBest = bestSetByExercise(recent);
      const olderBest = bestSetByExercise(older);
      const matchedExercises = Object.keys(recentBest).filter((ex) => olderBest[ex] !== undefined && olderBest[ex].e1rm > 0);

      if (matchedExercises.length > 0) {
        // Matched-exercise e1RM improvement, averaged across exercises trained in both weeks
        method = "e1rm";
        comparedCount = matchedExercises.length;
        drivers = matchedExercises
          .map((ex) => ({
            name: ex,
            pct: ((recentBest[ex].e1rm - olderBest[ex].e1rm) / olderBest[ex].e1rm) * 100,
            fromWeight: olderBest[ex].weight,
            fromReps: olderBest[ex].reps,
            toWeight: recentBest[ex].weight,
            toReps: recentBest[ex].reps,
          }))
          .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
        improvement = drivers.reduce((a, d) => a + d.pct, 0) / drivers.length;
      } else {
        // Fallback: change in volume-per-working-set when no exercise overlaps between weeks
        const volumePerSet = (sets: { weight: number; reps: number }[]) =>
          sets.length > 0 ? sets.reduce((a, s) => a + s.weight * s.reps, 0) / sets.length : null;
        const recentVPS = volumePerSet(recent);
        const olderVPS = volumePerSet(older);
        if (recentVPS !== null && olderVPS !== null && olderVPS > 0) {
          method = "volume";
          improvement = ((recentVPS - olderVPS) / olderVPS) * 100;
        }
      }
    }

    setStats({
      totalWorkouts: recentCount,
      avgDuration: recentCount > 0 ? Math.floor(avgDur / recentCount / 60) : 0,
      improvement: Math.round(improvement * 10) / 10,
      isBaseWeek,
      method,
      comparedCount,
      drivers: drivers.slice(0, 3),
    });
  };

  const fetchMuscleDistribution = async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // "This week" = the current calendar week, Sunday through Saturday
    // (matches the week-start convention already used on the Dashboard),
    // not a rolling last-7-days window.
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const { data: setLogs } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, created_at, weight, reps")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Exercises this user has actually logged (not the whole library), most
    // recently trained first, for the per-exercise progress picker.
    const { data: loggedNames } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(600);
    setExerciseNames([...new Set((loggedNames ?? []).map((r) => r.exercise_name))]);

    const [{ data: exercises }, { data: kinesiology, error: kinesiologyError }] = await Promise.all([
      supabase.from("exercises").select("id, name, muscle_group"),
      supabase.from("pz_exercise_kinesiology").select("exercise_id, muscle_contributions"),
    ]);
    // Without kinesiology the 3D map falls back to muscle_group; the bars don't use it.
    if (kinesiologyError) console.error(kinesiologyError);
    const exerciseGroupMap = new Map(
      (exercises ?? []).map((e) => [e.name, canonicalMuscleGroup(e.muscle_group ?? "אחר")])
    );
    const exerciseIdMap = new Map((exercises ?? []).map((e) => [e.name, e.id]));
    const contributionsById = new Map(
      (kinesiology ?? []).map((k) => [k.exercise_id, k.muscle_contributions as Record<string, number>])
    );

    const { sets, weekly } = tallyMuscleWork(
      setLogs ?? [],
      (name) => exerciseGroupMap.get(name) ?? "אחר",
      startOfWeek,
    );
    setMuscleSetCounts(sets);
    setMuscleWeekly(weekly);
    setExerciseGroups(Object.fromEntries(exerciseGroupMap));
    setAnalysisSets(
      (setLogs ?? []).map((l) => ({
        exercise_name: l.exercise_name,
        weight: safeNumber(l.weight),
        reps: safeNumber(l.reps),
        created_at: l.created_at,
      })),
    );
    setRegionWeek(
      tallyRegionWeek(
        setLogs ?? [],
        (name) =>
          regionsForExercise(contributionsById, exerciseIdMap.get(name), exerciseGroupMap.get(name) ?? "אחר"),
        startOfWeek,
      ),
    );
  };

  const muscleBars = useMemo(() => {
    const totalSets = Object.values(muscleSetCounts).reduce((a, v) => a + v, 0);
    return Object.entries(muscleSetCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        pct: safeDiv(count, totalSets) * 100,
        color: muscleColor(name),
        detail: `${formatSets(muscleWeekly[name]?.sets ?? 0)} סטים השבוע`,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [muscleSetCounts, muscleWeekly]);

  // The screen's analysis, computed locally from the trainee's own numbers.
  // It replaced an LLM call that depended on a paid provider chain: same card,
  // but instant, free, and the same answer every time for the same data.
  const analysis = useMemo(
    () =>
      analyzeTraining({
        sets: analysisSets,
        sessionDates,
        weeklySets: Object.fromEntries(Object.entries(muscleWeekly).map(([m, w]) => [m, w.sets])),
        muscleOf: (name) => exerciseGroups[name] ?? "אחר",
        gender,
      }),
    [analysisSets, sessionDates, muscleWeekly, exerciseGroups, gender],
  );

  const rangeCfg = RANGE_CONFIG[range];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold neon-text">PERFORMANCE ANALYTICS</h1>
      </div>

      {progressExercise && (
        <ExerciseHistory exerciseName={progressExercise} onClose={() => setProgressExercise(null)} />
      )}

      {/* This week's load per muscle on a 3D body, from the same set logs as the distribution bars */}
      <div className="glass-card p-4 mb-3.5">
        <h3 className="text-sm font-semibold text-foreground mb-1">מפת עומס שבועית</h3>
        <p className="text-[11.5px] text-muted-foreground mb-2">
          השבוע · מינימום אפקטיבי {DEFAULT_WEEKLY_SET_RANGE.mev} סטים, מומלץ עד {DEFAULT_WEEKLY_SET_RANGE.max} ·
          נגיעה בשריר מציגה פירוט
        </p>
        <Suspense
          fallback={
            <div className="h-[420px] flex items-center justify-center text-xs text-muted-foreground">
              טוען מפת שרירים…
            </div>
          }
        >
          <MuscleMap3D
            weekly={regionWeek.regions}
            offModelSets={regionWeek.offModelSets}
            range={DEFAULT_WEEKLY_SET_RANGE}
          />
        </Suspense>
      </div>

      {/* Per-exercise progress: pick an exercise to see its own 1RM trend and
          session history (the same view the workout screen's history button opens). */}
      <div className="glass-card p-4 mb-3.5">
        <button
          type="button"
          onClick={() => setShowExercisePicker((open) => !open)}
          aria-expanded={showExercisePicker}
          className="w-full flex items-start justify-between gap-2 text-right"
        >
          <span>
            <span className="block text-sm font-semibold text-foreground mb-1">התקדמות לפי תרגיל</span>
            <span className="block text-[11.5px] text-muted-foreground">בחר תרגיל לגרף שיפור והיסטוריה</span>
          </span>
          <MaterialIcon icon={showExercisePicker ? "expand_less" : "expand_more"} className="text-muted-foreground text-[20px]" />
        </button>

        {showExercisePicker && (
          <div className="mt-3">
            {exerciseNames.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">אין עדיין תרגילים מתועדים</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="חיפוש תרגיל..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg py-1.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="max-h-56 overflow-y-auto mt-2 space-y-1">
                  {exerciseNames
                    .filter((n) => n.includes(exerciseSearch))
                    .map((n) => (
                      <button
                        key={n}
                        onClick={() => setProgressExercise(n)}
                        className="w-full text-right flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-secondary/50"
                      >
                        <span className="text-[12.5px] text-foreground">{n}</span>
                        <MaterialIcon icon="show_chart" className="text-primary text-[16px]" />
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Muscle group distribution: a one-line stacked bar until expanded to the full
          ranked list. The volume trend chart sits behind its own toggle below. */}
      <div className="glass-card p-4 mb-3.5">
        <button
          type="button"
          onClick={() => setShowMuscleBars((open) => !open)}
          aria-expanded={showMuscleBars}
          className="w-full flex items-start justify-between gap-2 text-right"
        >
          <span>
            <span className="block text-sm font-semibold text-foreground mb-1">התפלגות אימונים לפי שרירים</span>
            <span className="block text-[11.5px] text-muted-foreground">30 הימים האחרונים · לפי סטים</span>
          </span>
          <MaterialIcon icon={showMuscleBars ? "expand_less" : "expand_more"} className="text-muted-foreground text-[20px]" />
        </button>

        {showMuscleBars ? (
          <div className="mt-4">
            <DistributionBars
              items={muscleBars}
              emptyTitle="אין נתוני אימונים ב-30 ימים אחרונים"
              onToggle={(name) => setExpandedMuscle((prev) => (prev === name ? null : name))}
              expandedName={expandedMuscle}
            />
          </div>
        ) : muscleBars.length > 0 ? (
          <button type="button" onClick={() => setShowMuscleBars(true)} className="w-full mt-3 text-right">
            <span className="flex h-2 rounded-full overflow-hidden bg-secondary/40">
              {muscleBars.map((m) => (
                <span key={m.name} className="h-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
              ))}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {muscleBars.slice(0, 3).map((m) => (
                <span key={m.name} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.name} {m.pct.toFixed(0)}%
                </span>
              ))}
              {muscleBars.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{muscleBars.length - 3} נוספים</span>
              )}
            </span>
          </button>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-3">אין נתוני אימונים ב-30 ימים אחרונים</p>
        )}

        {/* Expand to reveal the volume trend chart */}
        <button
          onClick={() => setShowTrendChart(!showTrendChart)}
          className="w-full flex items-center justify-between mt-4 pt-3.5 border-t border-border"
        >
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MaterialIcon icon="show_chart" className="text-primary text-[16px]" />
            גרף מגמת נפח אימונים
          </span>
          <MaterialIcon icon={showTrendChart ? "expand_less" : "expand_more"} className="text-muted-foreground text-[20px]" />
        </button>

        {showTrendChart && (
          <div className="mt-3.5">
            <div className="flex gap-1.5 mb-3">
              {RANGE_TABS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    range === r.key ? "bg-primary/16 text-primary" : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <div>
                <p className="text-[11.5px] text-muted-foreground mb-1">{rangeCfg.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {volumeTrend.total.toLocaleString()} <span className="text-[13px] font-medium text-muted-foreground">ק״ג</span>
                </p>
              </div>
              {volumeTrend.deltaPct !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold ${volumeTrend.deltaPct >= 0 ? "text-primary" : "text-destructive"}`}>
                  <span>{volumeTrend.deltaPct > 0 ? "+" : ""}{volumeTrend.deltaPct.toFixed(1)}%</span>
                  <MaterialIcon icon={volumeTrend.deltaPct >= 0 ? "trending_up" : "trending_down"} className="text-[14px]" />
                </div>
              )}
            </div>

            <div className="mt-2">
              <TrendChart
                data={volumeTrend.points}
                loading={loadingTrend}
                height={112}
                unit="ק״ג"
                valueLabel="נפח"
                emptyTitle="אין נתוני אימונים בטווח הזה"
              />
            </div>
          </div>
        )}
      </div>

      {/* Weekly Improvement Card */}
      <div className="glass-card p-4 mb-3.5 border-r-2 border-primary">
        <h3 className="text-sm font-semibold text-foreground mb-1">שיפור שבועי</h3>
        {stats.isBaseWeek ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">שבוע בסיס</span>
              <MaterialIcon icon="flag" className="text-primary text-[22px]" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              עדיין אין אימונים משבוע קודם להשוואה - השיפור יוצג משבוע הבא
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold neon-text">{stats.improvement > 0 ? "+" : ""}{stats.improvement}%</span>
              <MaterialIcon icon={stats.improvement >= 0 ? "trending_up" : "trending_down"} className="text-primary text-[24px]" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.method === "volume"
                ? "לא חזרת על אותם תרגילים בשני השבועות, אז ההשוואה היא לפי נפח ממוצע לסט"
                : `ממוצע השינוי ב-1RM המשוער (Epley) על פני ${stats.comparedCount} תרגילים שחזרו בשני השבועות`}
            </p>

            {stats.drivers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">ממה נובע השיפור</p>
                {stats.drivers.map((d) => (
                  <div key={d.name} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.fromWeight}ק״ג × {d.fromReps} ← {d.toWeight}ק״ג × {d.toReps}
                        <span className="mx-1">·</span>
                        {describeDriver(d)}
                      </p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${d.pct >= 0 ? "text-primary" : "text-destructive"}`}>
                      {d.pct > 0 ? "+" : ""}{Math.round(d.pct * 10) / 10}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <div className="glass-card p-3 border-r-2 border-primary">
          <p className="text-[10px] text-muted-foreground">אימונים (30 יום)</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalWorkouts}</p>
        </div>
        <div className="glass-card p-3 border-r-2 border-destructive">
          <p className="text-[10px] text-muted-foreground">ממוצע זמן</p>
          <p className="text-2xl font-bold text-foreground">{stats.avgDuration}<span className="text-xs text-muted-foreground"> דק׳</span></p>
        </div>
      </div>

      {/* Training analysis, computed locally from the trainee's own numbers */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <MaterialIcon icon="psychology" className="text-primary text-[20px]" />
          <h3 className="text-sm font-semibold text-foreground">ניתוח האימונים שלך</h3>
        </div>
        <p className="text-[11.5px] text-muted-foreground mb-3">
          מחושב מהנתונים שלך לפי עקרונות אימון · {ANALYSIS_DAYS} הימים האחרונים
        </p>

        <div className="space-y-2">
          {analysis.training_qualities.length > 0 && (
            <div className="bg-secondary/50 rounded-xl p-3 space-y-2.5">
              <span className="text-xs font-semibold text-primary">איכויות אימון</span>
              {analysis.training_qualities.map((q) => (
                <div key={q.quality}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{q.quality}</span>
                    <span className="text-[11px] text-primary shrink-0">{q.verdict}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{q.detail}</p>
                </div>
              ))}
            </div>
          )}
          {analysis.insights.map((insight, i) => (
            <div key={i} className="bg-secondary/50 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <MaterialIcon icon="insights" className="text-primary text-[16px] mt-0.5" />
                <p className="text-xs text-muted-foreground">{insight}</p>
              </div>
            </div>
          ))}
          <div className="bg-primary/10 rounded-xl p-3">
            <span className="text-xs font-semibold text-primary">המלצה</span>
            <p className="text-xs text-foreground mt-1">{analysis.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
