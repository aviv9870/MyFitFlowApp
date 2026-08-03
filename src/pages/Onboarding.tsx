import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";

const genderOptions = [
  { id: "male", label: "זכר", icon: "male" },
  { id: "female", label: "נקבה", icon: "female" },
];

const Onboarding = () => {
  const { user, markOnboarded } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("male");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weight, setWeight] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!user) return;
    if (password && password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      await supabase.from("profiles").upsert(
        { user_id: user.id, display_name: displayName || undefined },
        { onConflict: "user_id" }
      );

      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          gender,
          birth_year: birthYear ? parseInt(birthYear) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          onboarded: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (weight) {
        await supabase.from("body_weight_logs").insert({ user_id: user.id, weight: parseFloat(weight) });
      }

      toast.success("ברוך הבא ל-MyFitFlow!");
      markOnboarded();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירת הפרטים");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold neon-text mb-2">ברוכים הבאים!</h1>
          <p className="text-muted-foreground text-sm">בוא נכיר אותך קצת כדי להתאים לך את החוויה</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">שם תצוגה</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="השם שלך"
              className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">מין</label>
            <div className="flex gap-2">
              {genderOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setGender(opt.id)}
                  className={`flex-1 p-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    gender === opt.id
                      ? "bg-primary/20 neon-border text-primary"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MaterialIcon icon={opt.icon} className="text-[18px]" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">שנת לידה</label>
              <input
                type="number"
                placeholder="1990"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">גובה (ס״מ)</label>
              <input
                type="number"
                placeholder="175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">משקל נוכחי (ק״ג)</label>
            <input
              type="number"
              placeholder="75"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2 border-t border-border">
            <label className="text-xs text-muted-foreground mb-1 block">קבע סיסמה לחשבון שלך</label>
            <input
              type="password"
              placeholder="סיסמה (לפחות 6 תווים)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 neon-glow-box disabled:opacity-50"
          >
            <MaterialIcon icon="check" className="text-[20px]" />
            {saving ? "שומר..." : "המשך לאפליקציה"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
