import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import TrendChart from "@/components/charts/TrendChart";
import DistributionBars from "@/components/charts/DistributionBars";
import { bucketByDay, bucketByMonth, safeNumber, safeDiv, type TrendPoint } from "@/lib/chartData";
import { canonicalMuscleGroup, muscleColor, formatSets, SYNERGIST_MAP } from "@/lib/muscleGroups";
import { toast } from "sonner";
import { useGender } from "@/hooks/useGender";

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

  const [aiInsights, setAiInsights] = useState<{
    training_qualities?: { quality: string; verdict: string; detail: string }[];
    insights: string[];
    recommendation: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [range, setRange] = useState<RangeKey>("week");
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrend>({ points: [], total: 0, deltaPct: null });
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [showTrendChart, setShowTrendChart] = useState(false);

  const [muscleSetCounts, setMuscleSetCounts] = useState<Record<string, number>>({});
  const [muscleWeeklySetCounts, setMuscleWeeklySetCounts] = useState<Record<string, number>>({});
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

      const points =
        cfg.bucket === "day"
          ? bucketByDay(current, (row) => row.created_at, volumeOf, windowStart, now)
          : bucketByMonth(current, (row) => row.created_at, volumeOf, 12, now);

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
      .select("exercise_name, created_at")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: exercises } = await supabase.from("exercises").select("name, muscle_group");
    const exerciseGroupMap = new Map(
      (exercises ?? []).map((e) => [e.name, canonicalMuscleGroup(e.muscle_group ?? "אחר")])
    );

    const addCredit = (target: Record<string, number>, group: string, amount: number) => {
      target[group] = (target[group] ?? 0) + amount;
      SYNERGIST_MAP[group]?.forEach(({ muscle, factor }) => {
        target[muscle] = (target[muscle] ?? 0) + amount * factor;
      });
    };

    const counts: Record<string, number> = {};
    const weeklyCounts: Record<string, number> = {};
    (setLogs ?? []).forEach((log) => {
      const group = exerciseGroupMap.get(log.exercise_name) ?? "אחר";
      addCredit(counts, group, 1);
      if (new Date(log.created_at) >= startOfWeek) {
        addCredit(weeklyCounts, group, 1);
      }
    });

    setMuscleSetCounts(counts);
    setMuscleWeeklySetCounts(weeklyCounts);
  };

  const muscleBars = useMemo(() => {
    const totalSets = Object.values(muscleSetCounts).reduce((a, v) => a + v, 0);
    return Object.entries(muscleSetCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        pct: safeDiv(count, totalSets) * 100,
        color: muscleColor(name),
        detail: `${formatSets(muscleWeeklySetCounts[name] ?? 0)} סטים השבוע`,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [muscleSetCounts, muscleWeeklySetCounts]);

  const fetchAiInsights = async () => {
    if (!user || loadingAi) return;
    setLoadingAi(true);
    try {
      const { data: history } = await supabase
        .from("workout_sessions")
        .select("plan_name, duration_seconds, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(20);

      const { data: sets } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        // Rep-range distribution is the basis of the training-quality
        // assessment, so it needs a real sample, not just the last few sets -
        // but the prompt still has to generate inside the request budget.
        .limit(150);

      const genderContext = gender === "female" ? "פני אל המשתמשת בלשון נקבה." : "פנה אל המשתמש בלשון זכר.";
      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: { type: "analyze", history: { sessions: history, sets }, genderContext },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiInsights(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "שגיאה בניתוח AI");
    } finally {
      setLoadingAi(false);
    }
  };

  const rangeCfg = RANGE_CONFIG[range];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold neon-text">PERFORMANCE ANALYTICS</h1>
      </div>

      {/* Muscle group distribution, with the volume trend chart tucked behind an expand toggle */}
      <div className="glass-card p-4 mb-3.5">
        <h3 className="text-sm font-semibold text-foreground mb-1">התפלגות אימונים לפי שרירים</h3>
        <p className="text-[11.5px] text-muted-foreground mb-4">30 הימים האחרונים · לפי סטים</p>

        <DistributionBars
          items={muscleBars}
          emptyTitle="אין נתוני אימונים ב-30 ימים אחרונים"
          onToggle={(name) => setExpandedMuscle((prev) => (prev === name ? null : name))}
          expandedName={expandedMuscle}
        />

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

      {/* AI Insights */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon icon="psychology" className="text-primary text-[20px]" />
            <h3 className="text-sm font-semibold text-foreground">תובנות AI</h3>
          </div>
          <button onClick={fetchAiInsights} disabled={loadingAi} className="text-xs text-primary flex items-center gap-1">
            <MaterialIcon icon={loadingAi ? "hourglass_top" : "refresh"} className={`text-[14px] ${loadingAi ? "animate-spin" : ""}`} />
            {loadingAi ? "מנתח..." : "נתח"}
          </button>
        </div>

        {aiInsights ? (
          <div className="space-y-2">
            {aiInsights.training_qualities && aiInsights.training_qualities.length > 0 && (
              <div className="bg-secondary/50 rounded-xl p-3 space-y-2.5">
                <span className="text-xs font-semibold text-primary">איכויות אימון</span>
                {aiInsights.training_qualities.map((q, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{q.quality}</span>
                      <span className="text-[11px] text-primary shrink-0">{q.verdict}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{q.detail}</p>
                  </div>
                ))}
              </div>
            )}
            {aiInsights.insights.map((insight, i) => (
              <div key={i} className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <MaterialIcon icon="insights" className="text-primary text-[16px] mt-0.5" />
                  <p className="text-xs text-muted-foreground">{insight}</p>
                </div>
              </div>
            ))}
            <div className="bg-primary/10 rounded-xl p-3">
              <span className="text-xs font-semibold text-primary">המלצה</span>
              <p className="text-xs text-foreground mt-1">{aiInsights.recommendation}</p>
            </div>
          </div>
        ) : (
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">לחץ ״נתח״ לקבלת תובנות AI מותאמות אישית</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
