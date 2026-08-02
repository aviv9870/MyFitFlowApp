import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";
import Settings from "@/pages/Settings";
import Measurements from "@/pages/Measurements";
import { applyTheme } from "@/lib/theme";

const Profile = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [view, setView] = useState<"main" | "settings" | "measurements">("main");

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      if (profile) setDisplayName(profile.display_name ?? "");

      const { data: weightLog } = await supabase
        .from("body_weight_logs")
        .select("weight")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(1);
      if (weightLog && weightLog.length > 0) setCurrentWeight(weightLog[0].weight);

      const { count } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setTotalWorkouts(count ?? 0);

    };
    fetchProfile();
  }, [user]);

  const saveWeight = async () => {
    if (!user || !bodyWeight) return;
    const { error } = await supabase.from("body_weight_logs").insert({
      user_id: user.id,
      weight: parseFloat(bodyWeight),
    });
    if (error) {
      toast.error("שגיאה בשמירת המשקל");
    } else {
      setCurrentWeight(parseFloat(bodyWeight));
      setBodyWeight("");
      toast.success("המשקל נשמר!");
    }
  };

  if (view === "settings") {
    return <Settings onClose={() => setView("main")} />;
  }

  if (view === "measurements") {
    return <Measurements onClose={() => setView("main")} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">פרופיל</h1>
        <button onClick={() => setView("settings")} className="p-2 rounded-lg hover:bg-secondary/50">
          <MaterialIcon icon="settings" className="text-muted-foreground text-[24px]" />
        </button>
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3 neon-border">
          <MaterialIcon icon="person" className="text-primary text-[40px]" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{displayName || "משתמש"}</h2>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold neon-text">{totalWorkouts}</p>
          <p className="text-[10px] text-muted-foreground">אימונים</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold neon-text">{currentWeight ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">משקל (ק״ג)</p>
        </div>
      </div>

      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="monitor_weight" className="text-primary text-[18px]" />
          עדכון משקל גוף
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="משקל בק״ג"
            value={bodyWeight}
            onChange={(e) => setBodyWeight(e.target.value)}
            className="flex-1 bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={saveWeight}
            className="bg-primary text-primary-foreground px-4 rounded-xl font-bold text-sm"
          >
            שמור
          </button>
        </div>
      </div>

      {/* Measurements button */}
      <button
        onClick={() => setView("measurements")}
        className="w-full glass-card p-4 mb-4 flex items-center gap-3 hover:neon-glow-box transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MaterialIcon icon="straighten" className="text-primary text-[20px]" />
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-bold text-foreground">מדידות גוף</p>
          <p className="text-[10px] text-muted-foreground">הזן מדידות, תמונות וקבל ניתוח AI</p>
        </div>
        <MaterialIcon icon="chevron_left" className="text-muted-foreground text-[20px]" />
      </button>

      <button
        onClick={signOut}
        className="w-full glass-card p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
      >
        <MaterialIcon icon="logout" className="text-destructive text-[20px]" />
        <span className="text-sm text-foreground">התנתק</span>
      </button>
    </div>
  );
};

export default Profile;
