import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";
import Settings from "@/pages/Settings";
import WorkoutSummaryModal from "@/components/WorkoutSummaryModal";
import History from "@/pages/History";
import AiInsightsChat from "@/components/AiInsightsChat";
import AppSidebar from "@/components/AppSidebar";
import CoachDashboard from "@/pages/CoachDashboard";
import Measurements from "@/pages/Measurements";
import WeightHistory from "@/pages/WeightHistory";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("...");
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [lastSession, setLastSession] = useState<{ id: string; plan_name: string; duration_seconds: number; completed_at: string } | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<{ insights: string[]; recommendation: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gender, setGender] = useState<string>("male");

  const getWeekDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { day: hebrewDays[i], num: d.getDate(), active: d.toDateString() === today.toDateString() };
    });
  };

  const weekDays = getWeekDays();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      if (profile?.display_name) setDisplayName(profile.display_name);

      const { data: settings } = await supabase.from("user_settings").select("gender").eq("user_id", user.id).single();
      if (settings?.gender) setGender(settings.gender);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count } = await supabase.from("workout_sessions").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("completed_at", weekAgo.toISOString());
      setWeeklyCount(count ?? 0);

      const { data: sessions } = await supabase.from("workout_sessions").select("id, plan_name, duration_seconds, completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1);
      if (sessions && sessions.length > 0) setLastSession(sessions[0]);

      const { data: weightLog } = await supabase.from("body_weight_logs").select("weight").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(1);
      if (weightLog && weightLog.length > 0) setCurrentWeight(weightLog[0].weight);
    };
    fetchData();
  }, [user]);

  const isFemale = gender === "female";

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

      const genderContext = isFemale ? "פני אל המשתמשת בלשון נקבה." : "פנה אל המשתמש בלשון זכר.";
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

  const handleSidebarNavigate = (page: string) => {
    if (page === "settings") setShowSettings(true);
    else if (page === "coach") setShowCoach(true);
    else if (page === "measurements") setShowMeasurements(true);
  };

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;
  if (showHistory) return <History onClose={() => setShowHistory(false)} />;
  if (showCoach) return <CoachDashboard onClose={() => setShowCoach(false)} />;
  if (showMeasurements) return <Measurements onClose={() => setShowMeasurements(false)} />;
  if (showWeightHistory) return <WeightHistory onClose={() => setShowWeightHistory(false)} />;

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={handleSidebarNavigate} />

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[19px] font-extrabold tracking-tight text-foreground">MyFitFlow</h1>
        <button onClick={() => setSidebarOpen(true)} className="flex flex-col gap-1 p-2 text-muted-foreground">
          <span className="w-[18px] h-[2px] rounded-full bg-muted-foreground" />
          <span className="w-[18px] h-[2px] rounded-full bg-muted-foreground" />
        </button>
      </div>

      <div className="mb-[22px]">
        <h2 className="text-[30px] font-bold tracking-tight leading-[1.15] text-foreground">
          שלום, {displayName}
        </h2>
        <p className="text-muted-foreground text-[13.5px] leading-relaxed mt-1.5">
          {isFemale
            ? <>ביצעת <span className="text-foreground/85 font-semibold">{weeklyCount}</span> אימונים השבוע. את בדרך ליעד!</>
            : <>ביצעת <span className="text-foreground/85 font-semibold">{weeklyCount}</span> אימונים השבוע. אתה בדרך ליעד!</>
          }
        </p>
      </div>

      <button onClick={() => setShowHistory(true)} className="w-full glass-card p-4 pb-3.5 mb-3.5">
        <div className="flex items-center justify-between mb-3.5">
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            פתח יומן
            <MaterialIcon icon="chevron_left" className="text-[12px]" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">לו״ז אימונים</h3>
        </div>
        <div className="flex justify-between">
          {weekDays.map((d) => (
            <div key={d.num} className="flex flex-col items-center gap-2 w-8">
              <span className="text-[11px] text-muted-foreground">{d.day}</span>
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold ${
                  d.active ? "bg-primary/16 text-primary" : "text-foreground"
                }`}
              >
                {d.num}
              </span>
            </div>
          ))}
        </div>
      </button>

      <button
        onClick={() => navigate("/workout")}
        className="w-full card-elevated p-[18px] mb-3.5 text-right group"
      >
        <p className="text-[12.5px] text-muted-foreground mb-3">{isFemale ? "מוכנה להתחיל?" : "מוכן להתחיל?"}</p>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <MaterialIcon icon="play_arrow" className="text-background text-[18px]" />
          </span>
          <span className="text-[17px] font-bold text-foreground">{isFemale ? "התחילי אימון חדש" : "התחל אימון חדש"}</span>
        </div>
      </button>

      <div className="flex gap-3 mb-3.5">
        <button onClick={() => setShowWeightHistory(true)} className="flex-1 glass-card p-[14px] text-right">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] text-muted-foreground">משקל גוף</span>
            <MaterialIcon icon="monitor_weight" className="text-muted-foreground/70 text-[14px]" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {currentWeight ?? "—"} <span className="text-[13px] font-medium text-muted-foreground">ק״ג</span>
          </p>
        </button>
        <button onClick={() => lastSession && setShowSummary(true)} className="flex-1 glass-card p-[14px] text-right">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] text-muted-foreground">אימון אחרון</span>
            <MaterialIcon icon="schedule" className="text-muted-foreground/70 text-[14px]" />
          </div>
          {lastSession ? (
            <>
              <p className="text-lg font-bold text-foreground">{lastSession.plan_name}</p>
              <p className="text-[11.5px] text-muted-foreground/90 mt-0.5">
                {Math.floor(lastSession.duration_seconds / 60)} דק׳
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">אין עדיין</p>
          )}
        </button>
      </div>

      {/* AI Insights + Chat */}
      <AiInsightsChat user={user} isFemale={isFemale} loadingAi={loadingAi} aiInsights={aiInsights} fetchAiInsights={fetchAiInsights} />

      {showSummary && lastSession && (
        <WorkoutSummaryModal
          sessionId={lastSession.id}
          planName={lastSession.plan_name}
          durationSeconds={lastSession.duration_seconds}
          completedAt={lastSession.completed_at}
          onClose={() => setShowSummary(false)}
          onDeleted={() => { setShowSummary(false); setLastSession(null); }}
        />
      )}
    </div>
  );
};

export default Dashboard;
