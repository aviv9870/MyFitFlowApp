import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import WorkoutSummaryModal from "@/components/WorkoutSummaryModal";
import PlanEditor from "@/components/PlanEditor";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface Trainee {
  trainee_id: string;
  display_name: string | null;
}

interface SessionRow {
  id: string;
  plan_name: string;
  duration_seconds: number;
  completed_at: string;
}

type CoachTab = "history" | "progress" | "weight" | "plans" | "ai";

const MUSCLE_COLORS: Record<string, string> = {
  "חזה": "#FF6B6B", "גב": "#4ECDC4", "כתפיים": "#45B7D1", "רגליים": "#96CEB4",
  "יד קדמית": "#FFEAA7", "יד אחורית": "#DDA0DD", "בטן": "#FF8C42",
};

const CoachDashboard = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CoachTab>("history");

  // History
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [summarySession, setSummarySession] = useState<SessionRow | null>(null);

  // Progress
  const [progressData, setProgressData] = useState<any[]>([]);
  const [muscleVolumes, setMuscleVolumes] = useState<Record<string, number>>({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Weight
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);
  const [loadingWeight, setLoadingWeight] = useState(false);

  // Plans
  const [plans, setPlans] = useState<{ id: string; name: string; description: string | null; exerciseCount: number }[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<"new" | string | null>(null); // "new" or plan id
  const [editPlanData, setEditPlanData] = useState<any>(null);

  // AI
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Report
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchTrainees();
  }, [user]);

  const fetchTrainees = async () => {
    if (!user?.email) return;
    setLoading(true);
    const { data: perms } = await supabase
      .from("coach_permissions")
      .select("trainee_id")
      .eq("coach_email", user.email.toLowerCase());

    if (!perms || perms.length === 0) {
      setTrainees([]);
      setLoading(false);
      return;
    }

    const traineeIds = perms.map((p) => p.trainee_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", traineeIds);

    setTrainees(
      traineeIds.map((id) => ({
        trainee_id: id,
        display_name: profiles?.find((p) => p.user_id === id)?.display_name || "מתאמן",
      }))
    );
    setLoading(false);
  };

  const selectTrainee = async (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveTab("history");
    fetchSessions(trainee.trainee_id);
  };

  const fetchSessions = async (traineeId: string) => {
    setLoadingSessions(true);
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, plan_name, duration_seconds, completed_at")
      .eq("user_id", traineeId)
      .order("completed_at", { ascending: false })
      .limit(50);
    setSessions(data ?? []);
    setLoadingSessions(false);
  };

  const fetchProgress = async (traineeId: string) => {
    setLoadingProgress(true);
    try {
      const { data: allSessions } = await supabase
        .from("workout_sessions")
        .select("id, completed_at")
        .eq("user_id", traineeId)
        .order("completed_at", { ascending: true });

      const { data: setLogs } = await supabase
        .from("workout_set_logs")
        .select("session_id, exercise_name, weight, reps")
        .eq("user_id", traineeId);

      const { data: exercises } = await supabase.from("exercises").select("name, muscle_group");
      const exerciseGroupMap = new Map((exercises ?? []).map((e) => [e.name, e.muscle_group]));

      // Volume per session for line chart
      const sessionVolumes: Record<string, number> = {};
      const volumes: Record<string, number> = {};
      (setLogs ?? []).forEach((log) => {
        sessionVolumes[log.session_id] = (sessionVolumes[log.session_id] ?? 0) + log.weight * log.reps;
        const group = exerciseGroupMap.get(log.exercise_name) ?? "אחר";
        volumes[group] = (volumes[group] ?? 0) + log.weight * log.reps;
      });

      setMuscleVolumes(volumes);
      setProgressData(
        (allSessions ?? []).map((s, i) => ({
          date: new Date(s.completed_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
          volume: sessionVolumes[s.id] ?? 0,
          workout: i + 1,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const fetchWeight = async (traineeId: string) => {
    setLoadingWeight(true);
    const { data } = await supabase
      .from("body_weight_logs")
      .select("weight, logged_at")
      .eq("user_id", traineeId)
      .order("logged_at", { ascending: true });
    setWeightData(
      (data ?? []).map((d) => ({
        date: new Date(d.logged_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
        weight: d.weight,
      }))
    );
    setLoadingWeight(false);
  };

  const fetchPlans = async (traineeId: string) => {
    setLoadingPlans(true);
    const { data: plansData } = await supabase
      .from("workout_plans")
      .select("id, name, description")
      .eq("user_id", traineeId)
      .order("created_at", { ascending: false });

    if (plansData) {
      const plansList = [];
      for (const p of plansData) {
        const { count } = await supabase
          .from("workout_plan_exercises")
          .select("*", { count: "exact", head: true })
          .eq("plan_id", p.id);
        plansList.push({ ...p, exerciseCount: count ?? 0 });
      }
      setPlans(plansList);
    }
    setLoadingPlans(false);
  };

  const askAi = async () => {
    if (!aiQuestion.trim() || !selectedTrainee || aiLoading) return;
    const q = aiQuestion.trim();
    setAiQuestion("");
    setAiMessages((prev) => [...prev, { role: "user", text: q }]);
    setAiLoading(true);

    try {
      const { data: history } = await supabase
        .from("workout_sessions")
        .select("plan_name, duration_seconds, completed_at")
        .eq("user_id", selectedTrainee.trainee_id)
        .order("completed_at", { ascending: false })
        .limit(20);

      const { data: sets } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", selectedTrainee.trainee_id)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: {
          type: "chat",
          question: `כמאמן, אני שואל על המתאמן ${selectedTrainee.display_name}: ${q}`,
          history: { sessions: history, sets },
        },
      });

      if (error) throw error;
      setAiMessages((prev) => [...prev, { role: "ai", text: data?.answer || "לא הצלחתי לענות." }]);
    } catch (err) {
      console.error(err);
      setAiMessages((prev) => [...prev, { role: "ai", text: "שגיאה, נסה שוב." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedTrainee || reportLoading) return;
    setReportLoading(true);
    setReport(null);
    try {
      const { data: history } = await supabase
        .from("workout_sessions")
        .select("plan_name, duration_seconds, completed_at")
        .eq("user_id", selectedTrainee.trainee_id)
        .order("completed_at", { ascending: false })
        .limit(20);

      const { data: sets } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", selectedTrainee.trainee_id)
        .order("created_at", { ascending: false })
        .limit(60);

      const { data: weightLogs } = await supabase
        .from("body_weight_logs")
        .select("weight, logged_at")
        .eq("user_id", selectedTrainee.trainee_id)
        .order("logged_at", { ascending: false })
        .limit(10);

      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: {
          type: "coach_report",
          traineeName: selectedTrainee.display_name,
          history: { sessions: history, sets, weight: weightLogs },
        },
      });

      if (error) throw error;
      setReport(data?.report || "לא הצלחתי ליצור דוח.");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה ביצירת הדוח");
    } finally {
      setReportLoading(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    toast.success("הדוח הועתק!");
  };

  const handleTabChange = (tab: CoachTab) => {
    setActiveTab(tab);
    if (!selectedTrainee) return;
    const tid = selectedTrainee.trainee_id;
    if (tab === "progress" && progressData.length === 0) fetchProgress(tid);
    if (tab === "weight" && weightData.length === 0) fetchWeight(tid);
    if (tab === "plans" && plans.length === 0) fetchPlans(tid);
  };

  const barData = useMemo(() => {
    return Object.entries(muscleVolumes)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [muscleVolumes]);
  const totalMuscleVolume = useMemo(() => barData.reduce((a, d) => a + d.value, 0), [barData]);

  if (summarySession && selectedTrainee) {
    return (
      <WorkoutSummaryModal
        sessionId={summarySession.id}
        planName={summarySession.plan_name}
        durationSeconds={summarySession.duration_seconds}
        completedAt={summarySession.completed_at}
        onClose={() => setSummarySession(null)}
        readOnly
      />
    );
  }

  const tabs: { key: CoachTab; icon: string; label: string }[] = [
    { key: "history", icon: "history", label: "היסטוריה" },
    { key: "progress", icon: "show_chart", label: "התקדמות" },
    { key: "weight", icon: "monitor_weight", label: "משקל" },
    { key: "plans", icon: "assignment", label: "תוכניות" },
    { key: "ai", icon: "auto_awesome", label: "AI" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={selectedTrainee ? () => { setSelectedTrainee(null); setProgressData([]); setWeightData([]); setPlans([]); setAiMessages([]); } : onClose} className="p-1 rounded-lg hover:bg-secondary/50">
          <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
        </button>
        <h1 className="text-xl font-bold neon-text">
          {selectedTrainee ? selectedTrainee.display_name : "דשבורד מאמן"}
        </h1>
      </div>

      {!selectedTrainee ? (
        <>
          {loading ? (
            <p className="text-center text-muted-foreground text-sm mt-10">טוען...</p>
          ) : trainees.length === 0 ? (
            <div className="text-center mt-16">
              <MaterialIcon icon="group_off" className="text-muted-foreground text-[48px] mb-3" />
              <p className="text-muted-foreground text-sm">אין מתאמנים מקושרים</p>
              <p className="text-muted-foreground text-[10px] mt-1">מתאמנים צריכים להוסיף את המייל שלך בהגדרות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trainees.map((t) => (
                <button
                  key={t.trainee_id}
                  onClick={() => selectTrainee(t)}
                  className="w-full glass-card neon-border p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <MaterialIcon icon="person" className="text-primary text-[22px]" />
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-bold text-foreground">{t.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">לחץ לצפייה בנתונים</p>
                  </div>
                  <MaterialIcon icon="chevron_left" className="text-muted-foreground text-[20px]" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
                }`}
              >
                <MaterialIcon icon={tab.icon} className="text-[16px]" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* History tab */}
          {activeTab === "history" && (
            <>
              {loadingSessions ? (
                <p className="text-center text-muted-foreground text-sm mt-10">טוען אימונים...</p>
              ) : sessions.length === 0 ? (
                <div className="text-center mt-16">
                  <MaterialIcon icon="fitness_center" className="text-muted-foreground text-[48px] mb-3" />
                  <p className="text-muted-foreground text-sm">אין אימונים עדיין</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSummarySession(s)}
                      className="w-full glass-card p-3 flex items-center gap-3 hover:neon-border transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MaterialIcon icon="fitness_center" className="text-primary text-[20px]" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-semibold text-foreground">{s.plan_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{new Date(s.completed_at).toLocaleDateString("he-IL")}</span>
                          <span>• {Math.floor(s.duration_seconds / 60)} דק׳</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Progress tab */}
          {activeTab === "progress" && (
            <div className="space-y-4">
              {loadingProgress ? (
                <div className="text-center mt-10">
                  <MaterialIcon icon="hourglass_top" className="text-primary text-[24px] animate-spin" />
                  <p className="text-xs text-muted-foreground mt-2">טוען נתונים...</p>
                </div>
              ) : (
                <>
                  {/* Volume over time */}
                  <div className="glass-card neon-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <MaterialIcon icon="show_chart" className="text-primary text-[18px]" />
                      נפח אימון לאורך זמן
                    </h3>
                    {progressData.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} />
                            <Tooltip
                              formatter={(value: number) => [`${value.toLocaleString()} ק״ג`, "נפח"]}
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                            />
                            <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">אין נתונים עדיין</p>
                    )}
                  </div>

                  {/* Muscle distribution */}
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <MaterialIcon icon="pie_chart" className="text-primary text-[18px]" />
                      התפלגות לפי שרירים
                    </h3>
                    {barData.length > 0 ? (
                      <div className="space-y-2">
                        {barData.map((d) => {
                          const pct = totalMuscleVolume > 0 ? (d.value / totalMuscleVolume) * 100 : 0;
                          return (
                            <div key={d.name} className="flex items-center gap-2">
                              <span className="text-[11px] text-foreground w-16 text-right shrink-0">{d.name}</span>
                              <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: MUSCLE_COLORS[d.name] || "hsl(var(--primary))" }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-10 shrink-0">{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">אין נתונים</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Weight tab */}
          {activeTab === "weight" && (
            <div className="glass-card neon-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MaterialIcon icon="monitor_weight" className="text-primary text-[18px]" />
                גרף משקל גוף
              </h3>
              {loadingWeight ? (
                <div className="text-center py-6">
                  <MaterialIcon icon="hourglass_top" className="text-primary text-[24px] animate-spin" />
                </div>
              ) : weightData.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{weightData[weightData.length - 1].weight}</p>
                      <p className="text-[10px] text-muted-foreground">משקל נוכחי (ק״ג)</p>
                    </div>
                    {weightData.length > 1 && (
                      <div className="text-center">
                        <p className={`text-lg font-bold ${weightData[weightData.length - 1].weight - weightData[0].weight > 0 ? "text-destructive" : "text-green-500"}`}>
                          {(weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">שינוי כולל (ק״ג)</p>
                      </div>
                    )}
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} domain={['auto', 'auto']} />
                        <Tooltip
                          formatter={(value: number) => [`${value} ק״ג`, "משקל"]}
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Line type="monotone" dataKey="weight" stroke="#4ECDC4" strokeWidth={2} dot={{ r: 3, fill: "#4ECDC4" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <MaterialIcon icon="monitor_weight" className="text-muted-foreground text-[32px] mb-1" />
                  <p className="text-xs text-muted-foreground">אין נתוני משקל</p>
                </div>
              )}
            </div>
          )}

          {/* Plans tab */}
          {activeTab === "plans" && (
            <div>
              {editingPlan !== null ? (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3">
                    {editingPlan === "new" ? "תוכנית חדשה למתאמן" : "עריכת תוכנית"}
                  </h3>
                  <PlanEditor
                    plan={editPlanData}
                    forUserId={selectedTrainee!.trainee_id}
                    onSave={() => {
                      setEditingPlan(null);
                      setEditPlanData(null);
                      fetchPlans(selectedTrainee!.trainee_id);
                    }}
                    onCancel={() => { setEditingPlan(null); setEditPlanData(null); }}
                  />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { setEditingPlan("new"); setEditPlanData(undefined); }}
                    className="w-full glass-card neon-border p-3 flex items-center justify-center gap-2 hover:neon-glow-box transition-all mb-3"
                  >
                    <MaterialIcon icon="add" className="text-primary text-[20px]" />
                    <span className="text-sm font-bold text-foreground">צור תוכנית למתאמן</span>
                  </button>

                  {loadingPlans ? (
                    <div className="text-center mt-10">
                      <MaterialIcon icon="hourglass_top" className="text-primary text-[24px] animate-spin" />
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center mt-10">
                      <MaterialIcon icon="assignment" className="text-muted-foreground text-[48px] mb-3" />
                      <p className="text-muted-foreground text-sm">אין תוכניות אימונים</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {plans.map((p) => (
                        <div key={p.id} className="glass-card p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-foreground">{p.name}</h4>
                              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                              <div className="flex items-center gap-1 mt-2">
                                <MaterialIcon icon="fitness_center" className="text-primary text-[14px]" />
                                <span className="text-[10px] text-primary">{p.exerciseCount} תרגילים</span>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                // Load full plan data for editing
                                const { data: exData } = await supabase
                                  .from("workout_plan_exercises")
                                  .select("exercise_id, target_sets, rest_seconds, order_index")
                                  .eq("plan_id", p.id)
                                  .order("order_index");
                                const exerciseIds = (exData ?? []).map((e) => e.exercise_id);
                                let exerciseNames: Record<string, string> = {};
                                if (exerciseIds.length > 0) {
                                  const { data: exNames } = await supabase.from("exercises").select("id, name").in("id", exerciseIds);
                                  exerciseNames = Object.fromEntries((exNames ?? []).map((e) => [e.id, e.name]));
                                }
                                setEditPlanData({
                                  id: p.id,
                                  name: p.name,
                                  description: p.description || "",
                                  exercises: (exData ?? []).map((e) => ({
                                    exercise_id: e.exercise_id,
                                    exercise_name: exerciseNames[e.exercise_id] ?? "תרגיל",
                                    target_sets: e.target_sets,
                                    rest_seconds: e.rest_seconds,
                                    order_index: e.order_index,
                                  })),
                                });
                                setEditingPlan(p.id);
                              }}
                              className="p-2 rounded-lg hover:bg-secondary/50"
                            >
                              <MaterialIcon icon="edit" className="text-muted-foreground text-[18px]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* AI tab */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Report generator */}
              <div className="glass-card neon-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MaterialIcon icon="description" className="text-primary text-[20px]" />
                    <h3 className="text-sm font-semibold text-foreground">דוח אימון למתאמן</h3>
                  </div>
                  <button
                    onClick={generateReport}
                    disabled={reportLoading}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <MaterialIcon icon={reportLoading ? "hourglass_top" : "auto_awesome"} className={`text-[14px] ${reportLoading ? "animate-spin" : ""}`} />
                    {reportLoading ? "יוצר..." : "צור דוח"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">דוח מותאם אישית שנראה כאילו נכתב על ידך למתאמן</p>

                {report && (
                  <div className="space-y-3">
                    <div className="bg-secondary/50 rounded-xl p-3 max-h-60 overflow-y-auto">
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed" dir="rtl">{report}</p>
                    </div>
                    <button
                      onClick={copyReport}
                      className="w-full bg-secondary/70 hover:bg-secondary text-foreground py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <MaterialIcon icon="content_copy" className="text-[16px]" />
                      העתק דוח
                    </button>
                  </div>
                )}
              </div>

              {/* AI Chat */}
              <div className="glass-card neon-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MaterialIcon icon="auto_awesome" className="text-primary text-[20px]" />
                  <h3 className="text-sm font-semibold text-foreground">שאל AI על המתאמן</h3>
                </div>

              <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
                {aiMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">שאל שאלה על התקדמות המתאמן, מגמות, או המלצות</p>
                )}
                {aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-2.5 text-xs ${
                      msg.role === "user" ? "bg-primary/20 text-foreground mr-8" : "bg-secondary/50 text-foreground ml-8"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {aiLoading && (
                  <div className="bg-secondary/50 rounded-xl p-2.5 text-xs text-muted-foreground ml-8 flex items-center gap-1">
                    <MaterialIcon icon="hourglass_top" className="text-[14px] animate-spin" />
                    חושב...
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAi()}
                  placeholder="כתוב שאלה..."
                  className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
                <button
                  onClick={askAi}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="bg-primary text-primary-foreground p-2 rounded-xl disabled:opacity-50"
                >
                  <MaterialIcon icon="send" className="text-[18px]" />
                </button>
              </div>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default CoachDashboard;
