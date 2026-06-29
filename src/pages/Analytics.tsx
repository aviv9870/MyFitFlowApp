import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const MUSCLE_COLORS: Record<string, string> = {
  "חזה": "#FF6B6B",
  "גב": "#4ECDC4",
  "כתפיים": "#45B7D1",
  "רגליים": "#96CEB4",
  "יד קדמית": "#FFEAA7",
  "יד אחורית": "#DDA0DD",
  "ישבן": "#FF69B4",
  "בטן": "#FF8C42",
  "אמות": "#87CEEB",
  "קרדיו": "#98FB98",
  "פונקציונלי": "#DEB887",
};

const Analytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalWorkouts: 0, avgDuration: 0, improvement: 0 });

  const [aiInsights, setAiInsights] = useState<{ insights: string[]; recommendation: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [muscleVolumes, setMuscleVolumes] = useState<Record<string, number>>({});
  const [showProgress, setShowProgress] = useState(false);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchStats();
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

    // === Strength Progress (1RM Brzycki) ===
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

    const calc1RM = (weight: number, reps: number) => {
      if (reps <= 0 || weight <= 0) return 0;
      if (reps === 1) return weight;
      return weight / (1.0278 - 0.0278 * reps);
    };

    // Get best estimated 1RM per exercise
    const getBest1RM = (sets: { exercise_name: string; weight: number; reps: number }[]) => {
      const map: Record<string, number> = {};
      sets.forEach((s) => {
        if (s.reps <= 0 || s.weight <= 0) return;
        const est = calc1RM(s.weight, s.reps);
        if (!map[s.exercise_name] || est > map[s.exercise_name]) {
          map[s.exercise_name] = est;
        }
      });
      return map;
    };

    const recent1RM = getBest1RM(recentSets ?? []);
    const older1RM = getBest1RM(olderSets ?? []);

    // Calculate per-exercise improvement, capped at 15%
    const exerciseImprovements: number[] = [];
    const allExercises = new Set([...Object.keys(recent1RM), ...Object.keys(older1RM)]);
    allExercises.forEach((ex) => {
      const curr = recent1RM[ex];
      const prev = older1RM[ex];
      if (!curr || !prev || prev <= 0) return;
      const pEx = Math.min(((curr / prev) - 1) * 100, 15);
      exerciseImprovements.push(pEx);
    });

    const strengthScore = exerciseImprovements.length > 0
      ? exerciseImprovements.reduce((a, b) => a + b, 0) / exerciseImprovements.length
      : null;

    // === Body Progress (B) ===
    const { data: currentWeightRows } = await supabase
      .from("body_weight_logs")
      .select("weight")
      .eq("user_id", user.id)
      .gte("logged_at", sevenDaysAgo.toISOString())
      .order("logged_at", { ascending: false })
      .limit(1);

    const { data: prevWeightRows } = await supabase
      .from("body_weight_logs")
      .select("weight")
      .eq("user_id", user.id)
      .gte("logged_at", fourteenDaysAgo.toISOString())
      .lt("logged_at", sevenDaysAgo.toISOString())
      .order("logged_at", { ascending: false })
      .limit(1);

    const currWeight = currentWeightRows?.[0]?.weight;
    const prevWeight = prevWeightRows?.[0]?.weight;

    let bodyScore: number | null = null;
    if (currWeight && prevWeight && prevWeight > 0) {
      bodyScore = Math.abs((currWeight - prevWeight) / prevWeight) * 100;
    }

    // === Combined Score ===
    let improvement: number;
    if (strengthScore !== null && bodyScore !== null) {
      improvement = 0.7 * strengthScore + 0.3 * bodyScore;
    } else if (strengthScore !== null) {
      improvement = strengthScore;
    } else if (bodyScore !== null) {
      improvement = bodyScore;
    } else {
      improvement = 0;
    }

    setStats({
      totalWorkouts: recentCount,
      avgDuration: recentCount > 0 ? Math.floor(avgDur / recentCount / 60) : 0,
      improvement: Math.round(improvement * 10) / 10,
    });

    const { data: setLogs } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, weight, reps, created_at")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    const { data: exercises } = await supabase.from("exercises").select("name, muscle_group");
    const exerciseGroupMap = new Map((exercises ?? []).map((e) => [e.name, e.muscle_group]));

    const volumes: Record<string, number> = {};
    (setLogs ?? []).forEach((log) => {
      const group = exerciseGroupMap.get(log.exercise_name) ?? "אחר";
      volumes[group] = (volumes[group] ?? 0) + log.weight * log.reps;
    });

    setMuscleVolumes(volumes);
  };

  const fetchProgressData = async () => {
    if (!user || loadingProgress) return;
    setLoadingProgress(true);
    try {
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id, completed_at, duration_seconds, plan_name")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: true });

      const { data: setLogs } = await supabase
        .from("workout_set_logs")
        .select("session_id, weight, reps")
        .eq("user_id", user.id);

      if (!sessions || sessions.length === 0) {
        setProgressData([]);
        return;
      }

      const sessionVolumes: Record<string, number> = {};
      (setLogs ?? []).forEach((log) => {
        sessionVolumes[log.session_id] = (sessionVolumes[log.session_id] ?? 0) + log.weight * log.reps;
      });

        const data = sessions.map((s, i) => ({
          date: new Date(s.completed_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
          volume: sessionVolumes[s.id as string] ?? 0,
          workout: i + 1,
          duration: Math.floor(s.duration_seconds / 60),
        }));

      setProgressData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const barData = useMemo(() => {
    return Object.entries(muscleVolumes)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [muscleVolumes]);

  const totalVolume = useMemo(() => barData.reduce((a, d) => a + d.value, 0), [barData]);

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

      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: { type: "analyze", history: { sessions: history, sets } },
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

  const handleToggleProgress = () => {
    if (!showProgress && progressData.length === 0) {
      fetchProgressData();
    }
    setShowProgress(!showProgress);
  };

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold neon-text">PERFORMANCE ANALYTICS</h1>
      </div>

      {/* Muscle Distribution - Bar Chart */}
      <div className="glass-card neon-border p-4 mb-4">
        <button
          onClick={handleToggleProgress}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-semibold text-foreground">התפלגות אימונים לפי שרירים</h3>
          <MaterialIcon icon={showProgress ? "expand_less" : "expand_more"} className="text-muted-foreground text-[20px]" />
        </button>

        {barData.length > 0 ? (
          <div className="mt-3 space-y-2">
            {barData.map((d) => {
              const pct = totalVolume > 0 ? (d.value / totalVolume) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-[11px] text-foreground w-16 text-right shrink-0">{d.name}</span>
                  <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: MUSCLE_COLORS[d.name] || "hsl(var(--primary))",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 mt-2">
            <MaterialIcon icon="pie_chart" className="text-muted-foreground text-[32px] mb-1" />
            <p className="text-xs text-muted-foreground">אין נתוני אימונים ב-7 ימים אחרונים</p>
          </div>
        )}

        {/* Expandable Progress Graph */}
        {showProgress && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MaterialIcon icon="show_chart" className="text-primary text-[18px]" />
              גרף התקדמות באימונים
            </h4>
            {loadingProgress ? (
              <div className="text-center py-6">
                <MaterialIcon icon="hourglass_top" className="text-primary text-[24px] animate-spin" />
                <p className="text-xs text-muted-foreground mt-2">טוען נתונים...</p>
              </div>
            ) : progressData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      width={45}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} ק״ג`, "נפח"]}
                      labelFormatter={(label) => `תאריך: ${label}`}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-6">
                <MaterialIcon icon="show_chart" className="text-muted-foreground text-[32px] mb-1" />
                <p className="text-xs text-muted-foreground">אין נתוני אימונים עדיין</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Progress Card */}
      <div className="glass-card p-4 mb-4 border-r-2 border-primary">
        <h3 className="text-sm font-semibold text-foreground mb-1">שיפור שבועי</h3>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold neon-text">{stats.improvement > 0 ? "+" : ""}{stats.improvement}%</span>
          <MaterialIcon icon={stats.improvement >= 0 ? "trending_up" : "trending_down"} className="text-primary text-[24px]" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          שילוב 70% כוח (1RM Brzycki) + 30% שינוי משקל גוף
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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
      <div className="glass-card neon-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon icon="psychology" className="text-primary text-[20px]" />
            <h3 className="text-sm font-semibold text-foreground">AI INSIGHTS</h3>
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
