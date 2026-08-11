import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import ChartTooltip from "@/components/ChartTooltip";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
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

// The exercises table has muscle_group values seeded in both English and
// Hebrew for the same muscle (e.g. "Shoulders" and "כתפיים" both exist) -
// normalize everything to a single canonical Hebrew name so the same
// muscle doesn't get split into two separate bars in the distribution.
const MUSCLE_GROUP_ALIASES: Record<string, string> = {
  Back: "גב",
  Biceps: "יד קדמית",
  Chest: "חזה",
  Core: "בטן",
  Legs: "רגליים",
  Shoulders: "כתפיים",
  Triceps: "יד אחורית",
};
const canonicalMuscleGroup = (raw: string) => MUSCLE_GROUP_ALIASES[raw] ?? raw;

// Distinct, fixed color per muscle (not a rank-based intensity scale) so
// each muscle keeps a consistent, easily-distinguishable color regardless
// of its current rank in the list. No yellow, by request.
const MUSCLE_COLORS: Record<string, string> = {
  "חזה": "#FF6B6B",
  "גב": "#4ECDC4",
  "כתפיים": "#5B9EE8",
  "רגליים": "#8FD08A",
  "יד קדמית": "#C58AF2",
  "יד אחורית": "#F2789A",
  "בטן": "#FF9F5B",
  "אחר": "oklch(var(--muted-foreground))",
};
const muscleColor = (name: string) => MUSCLE_COLORS[name] ?? "oklch(var(--primary))";

// Indirect (synergist) credit can produce values like 3.5 - round to the
// nearest half-set and drop the trailing .0 for whole numbers.
const formatSets = (n: number) => {
  const rounded = Math.round(n * 2) / 2;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
};

// Compound exercises also load secondary muscles besides their primary
// muscle_group - credit those as partial ("indirect") sets so the
// distribution reflects real training load, not just the primary target.
const SYNERGIST_MAP: Record<string, { muscle: string; factor: number }[]> = {
  "חזה": [{ muscle: "יד אחורית", factor: 0.5 }],
  "גב": [{ muscle: "יד קדמית", factor: 0.5 }],
  "כתפיים": [{ muscle: "יד אחורית", factor: 0.5 }],
  "רגליים": [{ muscle: "בטן", factor: 0.25 }],
};

interface VolumeTrend {
  points: { label: string; value: number }[];
  total: number;
  deltaPct: number | null;
}

const Analytics = () => {
  const { user } = useAuth();
  const gender = useGender();
  const [stats, setStats] = useState({ totalWorkouts: 0, avgDuration: 0, improvement: 0, isBaseWeek: false });

  const [aiInsights, setAiInsights] = useState<{ insights: string[]; recommendation: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [range, setRange] = useState<RangeKey>("week");
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrend>({ points: [], total: 0, deltaPct: null });
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [showTrendChart, setShowTrendChart] = useState(false);
  const [activeTrendIdx, setActiveTrendIdx] = useState<number | null>(null);

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

      const sumVolume = (rows: { weight: number; reps: number }[]) =>
        rows.reduce((a, row) => a + row.weight * row.reps, 0);
      const currentTotal = sumVolume(current);
      const previousTotal = sumVolume(previous);
      const deltaPct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

      let points: { label: string; value: number }[];
      if (cfg.bucket === "day") {
        const buckets: Record<string, number> = {};
        const dayKeys: string[] = [];
        for (let i = cfg.days - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          dayKeys.push(key);
          buckets[key] = 0;
        }
        current.forEach((row) => {
          const key = new Date(row.created_at).toISOString().slice(0, 10);
          if (buckets[key] !== undefined) buckets[key] += row.weight * row.reps;
        });
        points = dayKeys.map((key) => ({
          label: new Date(key).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
          value: Math.round(buckets[key]),
        }));
      } else {
        const buckets: Record<string, number> = {};
        const monthKeys: string[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          monthKeys.push(key);
          buckets[key] = 0;
        }
        current.forEach((row) => {
          const d = new Date(row.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (buckets[key] !== undefined) buckets[key] += row.weight * row.reps;
        });
        points = monthKeys.map((key) => {
          const [y, m] = key.split("-").map(Number);
          return { label: new Date(y, m, 1).toLocaleDateString("he-IL", { month: "short" }), value: Math.round(buckets[key]) };
        });
      }

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

    // Best (top-set) e1RM per exercise
    const bestE1RMByExercise = (sets: { exercise_name: string; weight: number; reps: number }[]) => {
      const map: Record<string, number> = {};
      sets.forEach((s) => {
        if (s.reps <= 0 || s.weight <= 0) return;
        const e1rm = epley1RM(s.weight, s.reps);
        if (!map[s.exercise_name] || e1rm > map[s.exercise_name]) {
          map[s.exercise_name] = e1rm;
        }
      });
      return map;
    };

    let improvement = 0;
    let isBaseWeek = false;

    if (older.length === 0) {
      // No data at all from last week - nothing to compare against yet
      isBaseWeek = true;
    } else {
      const recentBest = bestE1RMByExercise(recent);
      const olderBest = bestE1RMByExercise(older);
      const matchedExercises = Object.keys(recentBest).filter((ex) => olderBest[ex] !== undefined && olderBest[ex] > 0);

      if (matchedExercises.length > 0) {
        // Matched-exercise e1RM improvement, averaged across exercises trained in both weeks
        const pctChanges = matchedExercises.map(
          (ex) => ((recentBest[ex] - olderBest[ex]) / olderBest[ex]) * 100
        );
        improvement = pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length;
      } else {
        // Fallback: change in volume-per-working-set when no exercise overlaps between weeks
        const volumePerSet = (sets: { weight: number; reps: number }[]) =>
          sets.length > 0 ? sets.reduce((a, s) => a + s.weight * s.reps, 0) / sets.length : null;
        const recentVPS = volumePerSet(recent);
        const olderVPS = volumePerSet(older);
        if (recentVPS !== null && olderVPS !== null && olderVPS > 0) {
          improvement = ((recentVPS - olderVPS) / olderVPS) * 100;
        }
      }
    }

    setStats({
      totalWorkouts: recentCount,
      avgDuration: recentCount > 0 ? Math.floor(avgDur / recentCount / 60) : 0,
      improvement: Math.round(improvement * 10) / 10,
      isBaseWeek,
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
        pct: totalSets > 0 ? (count / totalSets) * 100 : 0,
        weeklySets: muscleWeeklySetCounts[name] ?? 0,
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
        .limit(50);

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

        {muscleBars.length > 0 ? (
          <div>
            {muscleBars.map((m) => {
              const isExpanded = expandedMuscle === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => setExpandedMuscle(isExpanded ? null : m.name)}
                  className="w-full text-right mb-3.5 last:mb-0"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12.5px] font-medium text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${m.pct}%`, backgroundColor: muscleColor(m.name) }}
                    />
                  </div>
                  {isExpanded && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <MaterialIcon icon="event_repeat" className="text-[13px]" />
                      {formatSets(m.weeklySets)} סטים השבוע
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <MaterialIcon icon="pie_chart" className="text-muted-foreground text-[32px] mb-1" />
            <p className="text-xs text-muted-foreground">אין נתוני אימונים ב-30 ימים אחרונים</p>
          </div>
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
                  onClick={() => { setRange(r.key); setActiveTrendIdx(null); }}
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

            {loadingTrend ? (
              <div className="h-28 flex items-center justify-center">
                <MaterialIcon icon="hourglass_top" className="text-primary text-[22px] animate-spin" />
              </div>
            ) : volumeTrend.points.some((p) => p.value > 0) ? (
              <div className="h-28 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={volumeTrend.points}
                    onClick={(state) => {
                      const idx = state?.activeTooltipIndex;
                      if (idx == null) return;
                      setActiveTrendIdx((prev) => (prev === idx ? null : idx));
                    }}
                  >
                    <defs>
                      <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="oklch(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={true} vertical={false} stroke="oklch(var(--border))" strokeOpacity={0.4} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9.5, fill: "oklch(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      active={activeTrendIdx !== null}
                      defaultIndex={activeTrendIdx ?? undefined}
                      content={<ChartTooltip unit="ק״ג" valueLabel="נפח" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="oklch(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#volumeFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: "oklch(var(--primary))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-6">
                <MaterialIcon icon="show_chart" className="text-muted-foreground text-[28px] mb-1" />
                <p className="text-xs text-muted-foreground">אין נתוני אימונים בטווח הזה</p>
              </div>
            )}
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
              שינוי ב-1RM המשוער (Epley) בתרגילים שחזרו על עצמם השבוע לעומת שבוע שעבר
            </p>
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
