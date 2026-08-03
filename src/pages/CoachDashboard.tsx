import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import WorkoutSummaryModal from "@/components/WorkoutSummaryModal";
import PlanEditor from "@/components/PlanEditor";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { FOODS_SEED } from "@/data/foodsSeed";
import { mealActualMacros, mealTargetMacros, dayTargetMacros, planActualMacros, type PlanMeal, type MacroTotals } from "@/domain/nutrition-calculations";
import { getBasePlan, saveBasePlan } from "@/services/nutritionLocal";
import { getMockSessions, getMockSetLogs, getMockWeightLogs, generateMockTraineeData, clearMockTraineeData, MOCK_TRAINEE_ID } from "@/services/mockTraineeData";

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

type CoachTab = "history" | "progress" | "weight" | "plans" | "exercises" | "nutrition" | "ai";

interface PendingExercise {
  id: string;
  name: string | null;
  muscle_group: string | null;
}

const MACRO_LABELS: { key: keyof MacroTotals; label: string; unit: string }[] = [
  { key: "calories", label: "קלוריות", unit: "" },
  { key: "protein", label: "חלבון", unit: "ג׳" },
  { key: "carbs", label: "פחמימה", unit: "ג׳" },
  { key: "fat", label: "שומן", unit: "ג׳" },
];

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

  // Exercise approval
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // New client creation
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // AI
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Report
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Nutrition (local-only base plan builder)
  const [nutritionMeals, setNutritionMeals] = useState<PlanMeal[]>([]);
  const [foodPickerMealId, setFoodPickerMealId] = useState<string | null>(null);
  const [foodPickerSearch, setFoodPickerSearch] = useState("");
  const [foodPickerMode, setFoodPickerMode] = useState<"search" | "custom">("search");
  const [customForm, setCustomForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const foodsById = useMemo(() => new Map(FOODS_SEED.map((f) => [f.id, f])), []);

  // Local dev-only demo data controls (mock trainee only)
  const generateDemoData = (traineeId: string) => {
    const result = generateMockTraineeData(traineeId);
    toast.success(`נוצרו ${result.sessionsCount} אימונים ו-${result.measurementsCount} מדידות`);
    if (activeTab === "history") fetchSessions(traineeId);
    if (activeTab === "progress") fetchProgress(traineeId);
    if (activeTab === "weight") fetchWeight(traineeId);
  };

  const clearDemoData = (traineeId: string) => {
    clearMockTraineeData(traineeId);
    toast.success("נתוני הדמו נמחקו");
    if (activeTab === "history") fetchSessions(traineeId);
    if (activeTab === "progress") fetchProgress(traineeId);
    if (activeTab === "weight") fetchWeight(traineeId);
  };

  useEffect(() => {
    if (!user) return;
    fetchTrainees();
  }, [user]);

  const fetchTrainees = async () => {
    if (!user?.email) return;
    setLoading(true);

    // Local dev-only stand-in: the DEV_MODE mock user has no real Supabase
    // data, so give it a local mock trainee to test the coach screens against.
    if (user.id === "dev-user") {
      setTrainees([{ trainee_id: MOCK_TRAINEE_ID, display_name: "מתאמן לדוגמה (מקומי)" }]);
      setLoading(false);
      return;
    }

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

  const createClient = async () => {
    if (!newClientEmail.trim() || creatingClient) return;
    setCreatingClient(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("admin-create-trainee", {
        body: {
          email: newClientEmail.trim(),
          fullName: newClientName.trim() || undefined,
          redirectTo: window.location.origin,
        },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("נשלחה הזמנה במייל ללקוח החדש");
      setNewClientEmail("");
      setNewClientName("");
      setShowNewClient(false);
      fetchTrainees();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת חשבון");
    } finally {
      setCreatingClient(false);
    }
  };

  const selectTrainee = async (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveTab("history");
    fetchSessions(trainee.trainee_id);
  };

  const fetchSessions = async (traineeId: string) => {
    setLoadingSessions(true);
    if (traineeId === MOCK_TRAINEE_ID) {
      const mock = getMockSessions(traineeId).sort((a, b) => b.completed_at.localeCompare(a.completed_at));
      setSessions(mock);
      setLoadingSessions(false);
      return;
    }
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
      const isMock = traineeId === MOCK_TRAINEE_ID;
      const allSessions = isMock
        ? getMockSessions(traineeId).sort((a, b) => a.completed_at.localeCompare(b.completed_at))
        : (await supabase.from("workout_sessions").select("id, completed_at").eq("user_id", traineeId).order("completed_at", { ascending: true })).data;

      const setLogs = isMock ? getMockSetLogs(traineeId) : (await supabase.from("workout_set_logs").select("session_id, exercise_name, weight, reps").eq("user_id", traineeId)).data;

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
    const data =
      traineeId === MOCK_TRAINEE_ID
        ? getMockWeightLogs(traineeId).sort((a, b) => a.logged_at.localeCompare(b.logged_at))
        : (await supabase.from("body_weight_logs").select("weight, logged_at").eq("user_id", traineeId).order("logged_at", { ascending: true })).data;
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

  const fetchPendingExercises = async (traineeId: string) => {
    setLoadingExercises(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name, muscle_group")
      .eq("submitted_by", traineeId)
      .eq("status", "pending");
    setPendingExercises(data ?? []);
    setLoadingExercises(false);
  };

  const reviewExercise = async (exerciseId: string, decision: "approved" | "rejected") => {
    const { error } = await supabase.from("exercises").update({ status: decision }).eq("id", exerciseId);
    if (error) {
      toast.error("שגיאה בעדכון התרגיל");
      return;
    }
    setPendingExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    toast.success(decision === "approved" ? "התרגיל אושר ונוסף למאגר הקבוע" : "התרגיל נדחה");
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
    if (tab === "exercises") fetchPendingExercises(tid);
    if (tab === "nutrition") setNutritionMeals(getBasePlan(tid));
  };

  const persistNutrition = (next: PlanMeal[]) => {
    setNutritionMeals(next);
    if (selectedTrainee) saveBasePlan(selectedTrainee.trainee_id, next);
  };

  const addMeal = () => {
    persistNutrition([
      ...nutritionMeals,
      {
        id: `${Date.now()}`,
        name: `ארוחה ${nutritionMeals.length + 1}`,
        order: nutritionMeals.length,
        targetCalories: 0,
        targetProtein: 0,
        targetCarbs: 0,
        targetFat: 0,
        items: [],
      },
    ]);
  };

  const removeMeal = (mealId: string) => {
    persistNutrition(nutritionMeals.filter((m) => m.id !== mealId));
  };

  const updateMealField = (mealId: string, field: keyof PlanMeal, value: string | number) => {
    persistNutrition(nutritionMeals.map((m) => (m.id === mealId ? { ...m, [field]: value } : m)));
  };

  const addNutritionItem = (mealId: string, foodId: string) => {
    persistNutrition(
      nutritionMeals.map((m) =>
        m.id !== mealId ? m : { ...m, items: [...m.items, { id: `${Date.now()}`, foodId, grams: 100 }] }
      )
    );
    setFoodPickerMealId(null);
    setFoodPickerSearch("");
  };

  const updateNutritionItemGrams = (mealId: string, itemId: string, grams: number) => {
    persistNutrition(
      nutritionMeals.map((m) =>
        m.id !== mealId ? m : { ...m, items: m.items.map((i) => (i.id === itemId ? { ...i, grams } : i)) }
      )
    );
  };

  const removeNutritionItem = (mealId: string, itemId: string) => {
    persistNutrition(nutritionMeals.map((m) => (m.id !== mealId ? m : { ...m, items: m.items.filter((i) => i.id !== itemId) })));
  };

  const addCustomNutritionItem = (mealId: string) => {
    if (!customForm.name.trim()) return;
    persistNutrition(
      nutritionMeals.map((m) =>
        m.id !== mealId
          ? m
          : {
              ...m,
              items: [
                ...m.items,
                {
                  id: `${Date.now()}`,
                  custom: {
                    name: customForm.name.trim(),
                    calories: Number(customForm.calories) || 0,
                    protein: Number(customForm.protein) || 0,
                    carbs: Number(customForm.carbs) || 0,
                    fat: Number(customForm.fat) || 0,
                  },
                },
              ],
            }
      )
    );
    setFoodPickerMealId(null);
    setFoodPickerMode("search");
    setCustomForm({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  };

  const updateCustomNutritionItem = (mealId: string, itemId: string, field: keyof NonNullable<PlanMeal["items"][number]["custom"]>, value: string | number) => {
    persistNutrition(
      nutritionMeals.map((m) =>
        m.id !== mealId
          ? m
          : {
              ...m,
              items: m.items.map((i) => (i.id === itemId && i.custom ? { ...i, custom: { ...i.custom, [field]: value } } : i)),
            }
      )
    );
  };

  // Every edit above already autosaves — this exists so the coach gets an
  // explicit, unambiguous "this is now live for the trainee" confirmation.
  const saveNutritionForTrainee = (traineeId: string) => {
    saveBasePlan(traineeId, nutritionMeals);
    toast.success("התפריט נשמר ויופיע אצל המתאמן");
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
    { key: "exercises", icon: "fact_check", label: "אישור תרגילים" },
    { key: "nutrition", icon: "restaurant", label: "תזונה" },
    { key: "ai", icon: "auto_awesome", label: "AI" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={selectedTrainee ? () => { setSelectedTrainee(null); setProgressData([]); setWeightData([]); setPlans([]); setPendingExercises([]); setAiMessages([]); setNutritionMeals([]); } : onClose} className="p-1 rounded-lg hover:bg-secondary/50">
          <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
        </button>
        <h1 className="text-xl font-bold neon-text">
          {selectedTrainee ? selectedTrainee.display_name : "ניהול מתאמנים"}
        </h1>
      </div>

      {!selectedTrainee ? (
        <>
          <div className="glass-card p-3 mb-4">
            {showNewClient ? (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MaterialIcon icon="person_add" className="text-primary text-[18px]" />
                  לקוח חדש
                </h3>
                <input
                  type="text"
                  placeholder="שם מלא (אופציונלי)"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="email"
                  placeholder="coach@email.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground">הלקוח יקבל מייל הזמנה לקביעת סיסמה ויתווסף אוטומטית לרשימת המתאמנים שלך</p>
                <div className="flex gap-2">
                  <button
                    onClick={createClient}
                    disabled={creatingClient || !newClientEmail.trim()}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {creatingClient ? "שולח הזמנה..." : "שלח הזמנה"}
                  </button>
                  <button
                    onClick={() => setShowNewClient(false)}
                    className="px-3 bg-secondary/50 text-muted-foreground rounded-lg text-xs font-bold"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewClient(true)}
                className="w-full flex items-center justify-center gap-2 text-primary py-1"
              >
                <MaterialIcon icon="person_add" className="text-[18px]" />
                <span className="text-sm font-bold">צור חשבון ללקוח חדש</span>
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground text-sm mt-10">טוען...</p>
          ) : trainees.length === 0 ? (
            <div className="text-center mt-16">
              <MaterialIcon icon="group_off" className="text-muted-foreground text-[48px] mb-3" />
              <p className="text-muted-foreground text-sm">אין עדיין מתאמנים</p>
              <p className="text-muted-foreground text-[10px] mt-1">צור חשבון ללקוח חדש למעלה כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trainees.map((t) => (
                <button
                  key={t.trainee_id}
                  onClick={() => selectTrainee(t)}
                  className="w-full glass-card p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform"
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
          {selectedTrainee.trainee_id === MOCK_TRAINEE_ID && (
            <div className="glass-card p-3 mb-4">
              <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                <MaterialIcon icon="science" className="text-[13px]" />
                כלי בדיקה מקומיים (localStorage בלבד, לא נכתב ל-Supabase)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => generateDemoData(selectedTrainee.trainee_id)}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-xs font-bold"
                >
                  הזן נתוני אימונים ומדידות
                </button>
                <button
                  onClick={() => clearDemoData(selectedTrainee.trainee_id)}
                  className="px-3 bg-secondary/50 text-destructive rounded-xl text-xs font-bold"
                >
                  מחק
                </button>
              </div>
            </div>
          )}

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
                      className="w-full glass-card p-3 flex items-center gap-3 hover:bg-card/70 transition-all"
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
                  <div className="glass-card p-4">
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
            <div className="glass-card p-4">
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
                    className="w-full glass-card p-3 flex items-center justify-center gap-2 hover:neon-glow-box transition-all mb-3"
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

          {/* Exercise approval tab */}
          {activeTab === "exercises" && (
            <div>
              {loadingExercises ? (
                <div className="text-center mt-10">
                  <MaterialIcon icon="hourglass_top" className="text-primary text-[24px] animate-spin" />
                </div>
              ) : pendingExercises.length === 0 ? (
                <div className="text-center mt-10">
                  <MaterialIcon icon="fact_check" className="text-muted-foreground text-[48px] mb-3" />
                  <p className="text-muted-foreground text-sm">אין תרגילים הממתינים לאישור</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingExercises.map((ex) => (
                    <div key={ex.id} className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-foreground">{ex.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1">{ex.muscle_group}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => reviewExercise(ex.id, "approved")}
                            className="p-2 rounded-lg bg-primary/15 hover:bg-primary/25"
                          >
                            <MaterialIcon icon="check" className="text-primary text-[18px]" />
                          </button>
                          <button
                            onClick={() => reviewExercise(ex.id, "rejected")}
                            className="p-2 rounded-lg bg-destructive/15 hover:bg-destructive/25"
                          >
                            <MaterialIcon icon="close" className="text-destructive text-[18px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nutrition tab — local-only base menu builder */}
          {activeTab === "nutrition" && (
            <div>
              {nutritionMeals.length > 0 && (
                <div className="glass-card p-4 mb-3">
                  <h3 className="text-sm font-bold text-foreground mb-3">סך יומי — הוזן מול יעד</h3>
                  <div className="space-y-2.5">
                    {MACRO_LABELS.map((m) => {
                      const target = dayTargetMacros(nutritionMeals)[m.key];
                      const actual = planActualMacros(nutritionMeals, foodsById)[m.key];
                      const pct = target > 0 ? Math.min(100, (actual / target) * 100) : actual > 0 ? 100 : 0;
                      const over = target > 0 && actual > target * 1.02;
                      return (
                        <div key={m.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-muted-foreground">{m.label}</span>
                            <span className={`text-[11px] font-semibold ${over ? "text-destructive" : "text-foreground"}`}>
                              {Math.round(actual)}/{Math.round(target)}{m.unit}
                            </span>
                          </div>
                          <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${over ? "bg-destructive" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={addMeal}
                className="w-full glass-card p-3 flex items-center justify-center gap-2 mb-3"
              >
                <MaterialIcon icon="add" className="text-primary text-[20px]" />
                <span className="text-sm font-bold text-foreground">הוסף ארוחה</span>
              </button>

              {nutritionMeals.length === 0 ? (
                <div className="text-center mt-10">
                  <MaterialIcon icon="restaurant" className="text-muted-foreground text-[48px] mb-3" />
                  <p className="text-muted-foreground text-sm">עדיין אין תפריט בסיס למתאמן</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nutritionMeals
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((meal) => {
                      const actual = mealActualMacros(meal, foodsById);
                      const target = mealTargetMacros(meal);
                      return (
                        <div key={meal.id} className="glass-card p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={meal.name}
                              onChange={(e) => updateMealField(meal.id, "name", e.target.value)}
                              className="flex-1 bg-secondary/50 border border-border rounded-lg py-1.5 px-2 text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button onClick={() => removeMeal(meal.id)} className="text-destructive">
                              <MaterialIcon icon="delete" className="text-[18px]" />
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {MACRO_LABELS.map((m) => (
                              <div key={m.key}>
                                <label className="text-[9px] text-muted-foreground mb-0.5 block">{m.label}</label>
                                <input
                                  type="number"
                                  value={meal[`target${m.key[0].toUpperCase()}${m.key.slice(1)}` as keyof PlanMeal] as number}
                                  onChange={(e) =>
                                    updateMealField(
                                      meal.id,
                                      `target${m.key[0].toUpperCase()}${m.key.slice(1)}` as keyof PlanMeal,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full bg-secondary/50 border border-border rounded-lg py-1 px-1 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1.5 mb-2">
                            {meal.items.map((item) => {
                              if (item.custom) {
                                return (
                                  <div key={item.id} className="bg-secondary/40 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className="flex-1 text-xs font-semibold text-foreground">{item.custom.name}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">מותאם אישית</span>
                                      <button onClick={() => removeNutritionItem(meal.id, item.id)} className="text-muted-foreground">
                                        <MaterialIcon icon="close" className="text-[16px]" />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {MACRO_LABELS.map((m) => (
                                        <div key={m.key}>
                                          <label className="text-[8.5px] text-muted-foreground mb-0.5 block">{m.label}</label>
                                          <input
                                            type="number"
                                            value={item.custom![m.key]}
                                            onChange={(e) => updateCustomNutritionItem(meal.id, item.id, m.key, Number(e.target.value) || 0)}
                                            className="w-full bg-background border border-border rounded-lg py-1 px-1 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              const food = item.foodId ? foodsById.get(item.foodId) : undefined;
                              if (!food) return null;
                              return (
                                <div key={item.id} className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                                  <span className="flex-1 text-xs text-foreground">{food.name}</span>
                                  <input
                                    type="number"
                                    value={item.grams}
                                    onChange={(e) => updateNutritionItemGrams(meal.id, item.id, Number(e.target.value) || 0)}
                                    className="w-14 bg-background border border-border rounded-lg py-1 px-1 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <span className="text-[10px] text-muted-foreground">ג׳</span>
                                  <button onClick={() => removeNutritionItem(meal.id, item.id)} className="text-muted-foreground">
                                    <MaterialIcon icon="close" className="text-[16px]" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {foodPickerMealId === meal.id ? (
                            <div className="bg-secondary/40 rounded-xl p-2 mb-2">
                              <div className="flex gap-1 mb-2">
                                <button
                                  onClick={() => setFoodPickerMode("search")}
                                  className={`flex-1 text-[10px] font-semibold py-1.5 rounded-lg ${foodPickerMode === "search" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                                >
                                  מהמאגר
                                </button>
                                <button
                                  onClick={() => setFoodPickerMode("custom")}
                                  className={`flex-1 text-[10px] font-semibold py-1.5 rounded-lg ${foodPickerMode === "custom" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                                >
                                  מותאם אישית
                                </button>
                              </div>

                              {foodPickerMode === "search" ? (
                                <>
                                  <input
                                    type="text"
                                    autoFocus
                                    value={foodPickerSearch}
                                    onChange={(e) => setFoodPickerSearch(e.target.value)}
                                    placeholder="חיפוש מזון..."
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground mb-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <div className="max-h-36 overflow-y-auto space-y-1">
                                    {FOODS_SEED.filter((f) => f.name.includes(foodPickerSearch)).map((f) => (
                                      <button
                                        key={f.id}
                                        onClick={() => addNutritionItem(meal.id, f.id)}
                                        className="w-full text-right text-xs text-foreground py-1.5 px-2 rounded-lg hover:bg-secondary/60"
                                      >
                                        {f.name}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={customForm.name}
                                    onChange={(e) => setCustomForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="שם המנה/הפריט..."
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {MACRO_LABELS.map((m) => (
                                      <div key={m.key}>
                                        <label className="text-[8.5px] text-muted-foreground mb-0.5 block">{m.label}</label>
                                        <input
                                          type="number"
                                          value={customForm[m.key]}
                                          onChange={(e) => setCustomForm((f) => ({ ...f, [m.key]: e.target.value }))}
                                          className="w-full bg-background border border-border rounded-lg py-1 px-1 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => addCustomNutritionItem(meal.id)}
                                    disabled={!customForm.name.trim()}
                                    className="w-full bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                                  >
                                    הוסף
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={() => { setFoodPickerMealId(null); setFoodPickerMode("search"); }}
                                className="text-[10px] text-muted-foreground mt-1.5"
                              >
                                ביטול
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setFoodPickerMealId(meal.id)}
                              className="flex items-center gap-1 text-xs text-primary font-semibold mb-2"
                            >
                              <MaterialIcon icon="add_circle" className="text-[16px]" />
                              הוסף מזון
                            </button>
                          )}

                          <div className="flex flex-wrap gap-3 pt-2 hairline-t">
                            {MACRO_LABELS.map((m) => (
                              <span key={m.key} className="text-[10px] text-muted-foreground">
                                {m.label}: <span className="text-foreground font-semibold">{Math.round(actual[m.key])}</span>/{Math.round(target[m.key])}{m.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {nutritionMeals.length > 0 && (
                <button
                  onClick={() => saveNutritionForTrainee(selectedTrainee.trainee_id)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm mt-3"
                >
                  שמור תפריט למתאמן
                </button>
              )}
            </div>
          )}

          {/* AI tab */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Report generator */}
              <div className="glass-card p-4">
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
              <div className="glass-card p-4">
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
