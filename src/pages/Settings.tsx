import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";

const themeColors = [
  { id: "green", label: "ירוק", hue: "145", preview: "hsl(145, 100%, 50%)" },
  { id: "cyan", label: "תכלת", hue: "180", preview: "hsl(180, 100%, 50%)" },
  { id: "purple", label: "סגול", hue: "270", preview: "hsl(270, 100%, 65%)" },
  { id: "orange", label: "כתום", hue: "25", preview: "hsl(25, 100%, 55%)" },
  { id: "pink", label: "ורוד", hue: "330", preview: "hsl(330, 100%, 60%)" },
];

const genderOptions = [
  { id: "male", label: "זכר", icon: "male" },
  { id: "female", label: "נקבה", icon: "female" },
];

const Settings = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("male");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [themeColor, setThemeColor] = useState("green");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      if (profile?.display_name) setDisplayName(profile.display_name);

      const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
      if (settings) {
        setGender(settings.gender ?? "male");
        setBirthYear(settings.birth_year?.toString() ?? "");
        setHeightCm(settings.height_cm?.toString() ?? "");
        setThemeColor(settings.theme_color ?? "green");
      }
    };
    fetchSettings();
  }, [user]);

  const applyTheme = (colorId: string) => {
    const root = document.documentElement;
    const colorMap: Record<string, { primary: string; accent: string; ring: string; neon: string }> = {
      green: { primary: "145 100% 50%", accent: "145 80% 42%", ring: "145 100% 50%", neon: "145 100% 50%" },
      cyan: { primary: "180 100% 50%", accent: "180 80% 42%", ring: "180 100% 50%", neon: "180 100% 50%" },
      purple: { primary: "270 100% 65%", accent: "270 80% 55%", ring: "270 100% 65%", neon: "270 100% 65%" },
      orange: { primary: "25 100% 55%", accent: "25 80% 48%", ring: "25 100% 55%", neon: "25 100% 55%" },
      pink: { primary: "330 100% 60%", accent: "330 80% 52%", ring: "330 100% 60%", neon: "330 100% 60%" },
    };
    const c = colorMap[colorId] ?? colorMap.green;
    root.style.setProperty("--primary", c.primary);
    root.style.setProperty("--accent", c.accent);
    root.style.setProperty("--ring", c.ring);
    root.style.setProperty("--neon-glow", c.neon);
    root.style.setProperty("--sidebar-primary", c.primary);
    root.style.setProperty("--sidebar-ring", c.ring);
  };

  const selectTheme = (colorId: string) => {
    setThemeColor(colorId);
    applyTheme(colorId);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").upsert(
        { user_id: user.id, display_name: displayName },
        { onConflict: "user_id" }
      );

      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          gender,
          birth_year: birthYear ? parseInt(birthYear) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          theme_color: themeColor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      toast.success("ההגדרות נשמרו!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
          <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
        </button>
        <h1 className="text-xl font-bold text-foreground">הגדרות</h1>
      </div>

      {/* Display Name */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="badge" className="text-primary text-[18px]" />
          שם תצוגה
        </h3>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Gender */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="wc" className="text-primary text-[18px]" />
          מין
        </h3>
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

      {/* Personal Info */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="info" className="text-primary text-[18px]" />
          נתונים אישיים
        </h3>
        <div className="space-y-3">
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
      </div>

      {/* Theme Color */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="palette" className="text-primary text-[18px]" />
          צבע עיצוב
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {themeColors.map((color) => (
            <button
              key={color.id}
              onClick={() => selectTheme(color.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                themeColor === color.id ? "bg-secondary neon-border" : "hover:bg-secondary/50"
              }`}
            >
              <div
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color.preview,
                  borderColor: themeColor === color.id ? color.preview : "transparent",
                  boxShadow: themeColor === color.id ? `0 0 15px ${color.preview}` : "none",
                }}
              />
              <span className="text-[10px] text-muted-foreground">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 neon-glow-box disabled:opacity-50"
      >
        <MaterialIcon icon="save" className="text-[20px]" />
        {saving ? "שומר..." : "שמור הגדרות"}
      </button>
    </div>
  );
};

export default Settings;
