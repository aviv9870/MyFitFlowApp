import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import ChartTooltip from "@/components/ChartTooltip";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { useGender } from "@/hooks/useGender";

interface Measurement {
  id: string;
  measured_at: string;
  weight: number | null;
  upper_belly: number | null;
  lower_belly: number | null;
  right_arm: number | null;
  left_arm: number | null;
  shoulder_width: number | null;
  right_thigh: number | null;
  left_thigh: number | null;
  notes: string | null;
}

const fields = [
  { key: "weight", label: "משקל", icon: "monitor_weight", unit: "ק״ג" },
  { key: "upper_belly", label: "בטן עליונה", icon: "straighten", unit: "ס״מ" },
  { key: "lower_belly", label: "בטן תחתונה", icon: "straighten", unit: "ס״מ" },
  { key: "right_arm", label: "יד ימין", icon: "fitness_center", unit: "ס״מ" },
  { key: "left_arm", label: "יד שמאל", icon: "fitness_center", unit: "ס״מ" },
  { key: "shoulder_width", label: "רוחב כתפיים", icon: "open_with", unit: "ס״מ" },
  { key: "right_thigh", label: "ירך ימין", icon: "straighten", unit: "ס״מ" },
  { key: "left_thigh", label: "ירך שמאל", icon: "straighten", unit: "ס״מ" },
] as const;

const Measurements = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const gender = useGender();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphField, setGraphField] = useState<string>("weight");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMeasurements();
  }, [user]);

  const fetchMeasurements = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(50);
    setMeasurements((data ?? []) as Measurement[]);
  };

  const saveMeasurement = async () => {
    if (!user) return;
    const hasValues = fields.some((f) => form[f.key]?.trim());
    if (!hasValues) {
      toast.error("יש להזין לפחות מדידה אחת");
      return;
    }
    setSaving(true);
    try {
      const row: any = { user_id: user.id, notes: notes || null };
      fields.forEach((f) => {
        row[f.key] = form[f.key] ? parseFloat(form[f.key]) : null;
      });

      const { error } = await supabase.from("body_measurements").insert(row);
      if (error) throw error;

      toast.success("המדידות נשמרו!");
      setForm({});
      setNotes("");
      fetchMeasurements();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const analyzeWithAi = async () => {
    if (!user || measurements.length === 0) return;
    setLoadingAi(true);
    try {
      const genderContext = gender === "female" ? "פני אל המשתמשת בלשון נקבה." : "פנה אל המשתמש בלשון זכר.";
      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: { type: "analyze_measurements", measurements, genderContext },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiAnalysis(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "שגיאה בניתוח");
    } finally {
      setLoadingAi(false);
    }
  };

  const latest = measurements[0];
  const previous = measurements[1];

  const getDiff = (key: string) => {
    if (!latest || !previous) return null;
    const curr = (latest as any)[key];
    const prev = (previous as any)[key];
    if (curr == null || prev == null) return null;
    return curr - prev;
  };

  const graphData = measurements
    .filter((m) => (m as any)[graphField] != null)
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
      value: (m as any)[graphField],
    }))
    .reverse();

  const selectedField = fields.find((f) => f.key === graphField);

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
          <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
        </button>
        <h1 className="text-xl font-bold text-foreground">מדידות גוף</h1>
      </div>

      {/* New measurement form */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="add_circle" className="text-primary text-[18px]" />
          מדידה חדשה
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</label>
              <input
                type="number"
                step="0.1"
                placeholder={f.unit}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-2 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-[10px] text-muted-foreground mb-1 block">הערות</label>
          <input
            type="text"
            placeholder="הערות נוספות..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={saveMeasurement}
          disabled={saving}
          className="w-full mt-3 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמור מדידה"}
        </button>
      </div>

      {/* Latest comparison */}
      {latest && (
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MaterialIcon icon="compare_arrows" className="text-primary text-[18px]" />
              מדידה אחרונה
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {new Date(latest.measured_at).toLocaleDateString("he-IL")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => {
              const val = (latest as any)[f.key];
              const diff = getDiff(f.key);
              if (val == null) return null;
              return (
                <div key={f.key} className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{f.label}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-foreground">{val} {f.unit}</span>
                    {diff !== null && diff !== 0 && (
                      <span className={`text-[10px] font-bold ${diff > 0 ? "text-red-400" : "text-green-400"}`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Graph */}
      <div className="glass-card p-4 mb-4">
        <button
          onClick={() => setShowGraph(!showGraph)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MaterialIcon icon="show_chart" className="text-primary text-[18px]" />
            גרף התקדמות
          </h3>
          <MaterialIcon icon={showGraph ? "expand_less" : "expand_more"} className="text-muted-foreground text-[20px]" />
        </button>

        {showGraph && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {fields.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setGraphField(f.key); setActiveIdx(null); }}
                  className={`text-[10px] px-2 py-1 rounded-full transition-all ${
                    graphField === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {graphData.length >= 2 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={graphData}
                    onClick={(state) => {
                      const idx = state?.activeTooltipIndex;
                      if (idx == null) return;
                      setActiveIdx((prev) => (prev === idx ? null : idx));
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "oklch(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "oklch(var(--muted-foreground))" }}
                      width={40}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      active={activeIdx !== null}
                      defaultIndex={activeIdx ?? undefined}
                      content={<ChartTooltip unit={selectedField?.unit} valueLabel={selectedField?.label} />}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="oklch(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "oklch(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-6">
                <MaterialIcon icon="show_chart" className="text-muted-foreground text-[28px] mb-1" />
                <p className="text-xs text-muted-foreground">צריך לפחות 2 מדידות כדי להציג גרף</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MaterialIcon icon="auto_awesome" className="text-primary text-[18px]" />
            ניתוח AI
          </h3>
          <button
            onClick={analyzeWithAi}
            disabled={loadingAi || measurements.length === 0}
            className="text-xs text-primary flex items-center gap-1 disabled:opacity-50"
          >
            <MaterialIcon icon={loadingAi ? "hourglass_top" : "refresh"} className={`text-[14px] ${loadingAi ? "animate-spin" : ""}`} />
            {loadingAi ? "מנתח..." : "נתח"}
          </button>
        </div>

        {aiAnalysis ? (
          <div className="space-y-2">
            <p className="text-xs text-foreground">{aiAnalysis.summary}</p>
            {aiAnalysis.changes?.map((c: any, i: number) => (
              <div key={i} className="bg-secondary/50 rounded-lg p-2 flex items-center gap-2">
                <MaterialIcon
                  icon={c.trend === "ירידה" ? "trending_down" : c.trend === "עלייה" ? "trending_up" : "trending_flat"}
                  className={`text-[16px] ${c.trend === "ירידה" ? "text-green-400" : c.trend === "עלייה" ? "text-red-400" : "text-muted-foreground"}`}
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">{c.area}</p>
                  <p className="text-[10px] text-muted-foreground">{c.change}</p>
                </div>
              </div>
            ))}
            <div className="bg-primary/10 rounded-xl p-3 mt-2">
              <span className="text-xs font-semibold text-primary">המלצה</span>
              <p className="text-xs text-foreground mt-1">{aiAnalysis.recommendation}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            {measurements.length === 0 ? "הזן מדידות ראשונות כדי לקבל ניתוח" : "לחץ ״נתח״ לקבלת ניתוח AI"}
          </p>
        )}
      </div>

      {/* History */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full glass-card p-3 flex items-center justify-between mb-2"
      >
        <span className="text-sm font-bold text-foreground flex items-center gap-2">
          <MaterialIcon icon="history" className="text-primary text-[18px]" />
          היסטוריית מדידות ({measurements.length})
        </span>
        <MaterialIcon icon={showHistory ? "expand_less" : "expand_more"} className="text-muted-foreground text-[20px]" />
      </button>

      {showHistory && (
        <div className="space-y-2">
          {measurements.map((m) => (
            <div key={m.id} className="glass-card p-3">
              <p className="text-xs font-semibold text-foreground mb-1">
                {new Date(m.measured_at).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="flex flex-wrap gap-2">
                {fields.map((f) => {
                  const val = (m as any)[f.key];
                  if (val == null) return null;
                  return (
                    <span key={f.key} className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                      {f.label}: {val}
                    </span>
                  );
                })}
              </div>
              {m.notes && <p className="text-[10px] text-muted-foreground mt-1">📝 {m.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Measurements;
