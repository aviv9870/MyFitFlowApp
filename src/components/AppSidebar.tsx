import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

const AppSidebar = ({ open, onClose, onNavigate }: Props) => {
  const { user, signOut } = useAuth();
  const [coachEmail, setCoachEmail] = useState("");
  const [myCoaches, setMyCoaches] = useState<{ id: string; coach_email: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    fetchMyCoaches();
  }, [user, open]);

  const fetchMyCoaches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coach_permissions")
      .select("id, coach_email")
      .eq("trainee_id", user.id);
    setMyCoaches(data ?? []);
  };

  const addCoach = async () => {
    if (!user || !coachEmail.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("coach_permissions").insert({
        trainee_id: user.id,
        coach_email: coachEmail.trim().toLowerCase(),
      });
      if (error) throw error;
      toast.success("המאמן נוסף בהצלחה");
      setCoachEmail("");
      fetchMyCoaches();
    } catch (err: any) {
      if (err.code === "23505") {
        toast.error("מאמן זה כבר מקושר");
      } else {
        toast.error("שגיאה בהוספת מאמן");
      }
    } finally {
      setSaving(false);
    }
  };

  const removeCoach = async (id: string) => {
    await supabase.from("coach_permissions").delete().eq("id", id);
    setMyCoaches((prev) => prev.filter((c) => c.id !== id));
    toast.success("המאמן הוסר");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-72 bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-border">
          <h2 className="text-base font-bold neon-text">תפריט</h2>
          <button onClick={onClose} className="p-1">
            <MaterialIcon icon="close" className="text-foreground text-[24px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* My Coach Section */}
          <div className="glass-card p-3">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <MaterialIcon icon="sports" className="text-primary text-[18px]" />
              המאמן שלי
            </h3>
            <p className="text-[10px] text-muted-foreground mb-2">הוסף את המייל של המאמן שלך כדי לתת לו גישת צפייה</p>

            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={coachEmail}
                onChange={(e) => setCoachEmail(e.target.value)}
                placeholder="coach@email.com"
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                dir="ltr"
              />
              <button
                onClick={addCoach}
                disabled={saving || !coachEmail.trim()}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {saving ? "..." : "הוסף"}
              </button>
            </div>

            {myCoaches.length > 0 && (
              <div className="space-y-1">
                {myCoaches.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-2 py-1.5">
                    <span className="text-xs text-foreground" dir="ltr">{c.coach_email}</span>
                    <button onClick={() => removeCoach(c.id)} className="text-destructive">
                      <MaterialIcon icon="close" className="text-[16px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coach Dashboard - only for specific coach email */}
          {user?.email?.toLowerCase() === "shirayadid806@gmail.com" && (
            <button
              onClick={() => { onNavigate("coach"); onClose(); }}
              className="w-full glass-card p-3 flex items-center gap-3 hover:neon-border transition-all"
            >
              <MaterialIcon icon="groups" className="text-primary text-[22px]" />
              <div className="text-right">
                <span className="text-sm font-bold text-foreground block">דשבורד מאמן</span>
                <span className="text-[10px] text-muted-foreground">צפה במתאמנים שלך</span>
              </div>
            </button>
          )}

          {/* Other nav items */}
          <button
            onClick={() => { onNavigate("settings"); onClose(); }}
            className="w-full glass-card p-3 flex items-center gap-3 hover:neon-border transition-all"
          >
            <MaterialIcon icon="settings" className="text-muted-foreground text-[22px]" />
            <span className="text-sm font-bold text-foreground">הגדרות</span>
          </button>

          <button
            onClick={() => { onNavigate("measurements"); onClose(); }}
            className="w-full glass-card p-3 flex items-center gap-3 hover:neon-border transition-all"
          >
            <MaterialIcon icon="straighten" className="text-muted-foreground text-[22px]" />
            <span className="text-sm font-bold text-foreground">מדידות</span>
          </button>
        </div>

        <div className="px-4 py-4 border-t border-border">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-destructive text-sm py-2 hover:bg-destructive/10 rounded-lg transition-all"
          >
            <MaterialIcon icon="logout" className="text-[18px]" />
            התנתק
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
