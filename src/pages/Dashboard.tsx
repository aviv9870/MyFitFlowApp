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

  const handleSidebarNavigate = (page: string) => {
    if (page === "settings") setShowSettings(true);
    else if (page === "coach") setShowCoach(true);
    else if (page === "measurements") setShowMeasurements(true);
  };

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;
  if (showHistory) return <History onClose={() => setShowHistory(false)} />;
  if (showCoach) return <CoachDashboard onClose={() => setShowCoach(false)} />;
  if (showMeasurements) return <Measurements onClose={() => setShowMeasurements(false)} />;

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={handleSidebarNavigate} />

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground">
          <MaterialIcon icon="menu" className="text-[28px]" />
        </button>
        <h1 className="text-lg font-bold neon-text">MyFitFlow</h1>
        <div className="w-7" />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          שלום, {displayName}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {isFemale
            ? <>ביצעת <span className="text-primary font-bold">{weeklyCount}</span> אימונים השבוע. את בדרך ליעד!</>
            : <>ביצעת <span className="text-primary font-bold">{weeklyCount}</span> אימונים השבוע. אתה בדרך ליעד!</>
          }
        </p>
      </div>

      <button onClick={() => setShowHistory(true)} className="w-full glass-card neon-border p-4 mb-4 hover:scale-[1.01] transition-transform">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">לו״ז אימונים</h3>
          <span className="flex items-center gap-1 text-xs text-primary">
            <MaterialIcon icon="open_in_new" className="text-[14px]" />
            פתח יומן
          </span>
        </div>
        <div className="flex justify-between">
          {weekDays.map((d) => (
            <div
              key={d.num}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
                d.active ? "bg-primary/20 neon-border" : ""
              }`}
            >
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
              <span className={`text-sm font-bold ${d.active ? "neon-text" : "text-foreground"}`}>{d.num}</span>
            </div>
          ))}
        </div>
      </button>

      {/* AI Insights + Chat */}
      <AiInsightsChat user={user} isFemale={isFemale} loadingAi={loadingAi} aiInsights={aiInsights} fetchAiInsights={fetchAiInsights} />

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">{isFemale ? "מוכנה להתחיל?" : "מוכן להתחיל?"}</p>
        <button
          onClick={() => navigate("/workout")}
          className="w-full glass-card neon-border neon-glow-box p-4 flex items-center justify-between group hover:scale-[1.02] transition-transform"
        >
          <span className="text-base font-bold neon-text">{isFemale ? "התחילי אימון חדש" : "התחל אימון חדש"}</span>
          <MaterialIcon icon="play_circle" className="text-primary text-[32px] group-hover:animate-pulse-neon" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => lastSession && setShowSummary(true)} className="glass-card p-3 text-right hover:neon-border transition-all">
          <div className="flex items-center gap-1.5 mb-2">
            <MaterialIcon icon="history" className="text-muted-foreground text-[16px]" />
            <span className="text-[10px] text-muted-foreground">אימון אחרון</span>
          </div>
          {lastSession ? (
            <>
              <p className="text-sm font-bold text-foreground">{lastSession.plan_name}</p>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-1">
                <MaterialIcon icon="schedule" className="text-[12px]" />
                {Math.floor(lastSession.duration_seconds / 60)} דק׳
              </span>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">אין עדיין</p>
          )}
        </button>
        <div className="glass-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MaterialIcon icon="monitor_weight" className="text-muted-foreground text-[16px]" />
            <span className="text-[10px] text-muted-foreground">משקל גוף</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {currentWeight ?? "—"}
            <span className="text-xs text-muted-foreground mr-1">ק״ג</span>
          </p>
        </div>
      </div>

      {showSummary && lastSession && (
        <WorkoutSummaryModal
          sessionId={lastSession.id}
          planName={lastSession.plan_name}
          durationSeconds={lastSession.duration_seconds}
          completedAt={lastSession.completed_at}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
