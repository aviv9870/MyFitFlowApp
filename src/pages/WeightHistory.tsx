import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import ChartTooltip from "@/components/ChartTooltip";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface WeightLog {
  id: string;
  weight: number;
  logged_at: string;
}

const WeightHistory = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("body_weight_logs")
      .select("id, weight, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(100);
    setLogs((data ?? []) as WeightLog[]);
  };

  const saveWeight = async () => {
    if (!user || !newWeight) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("body_weight_logs").insert({
        user_id: user.id,
        weight: parseFloat(newWeight),
      });
      if (error) throw error;
      toast.success("המשקל נשמר!");
      setNewWeight("");
      fetchLogs();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירת המשקל");
    } finally {
      setSaving(false);
    }
  };

  const latest = logs[0];
  const previous = logs[1];
  const diff = latest && previous ? latest.weight - previous.weight : null;

  const graphData = logs
    .map((l) => ({
      date: new Date(l.logged_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
      value: l.weight,
    }))
    .reverse();

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
          <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
        </button>
        <h1 className="text-xl font-bold text-foreground">היסטוריית משקל גוף</h1>
      </div>

      {/* Add new weight */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="add_circle" className="text-primary text-[18px]" />
          הזנת משקל חדש
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder="ק״ג"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="flex-1 bg-secondary/50 border border-border rounded-lg py-2.5 px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={saveWeight}
            disabled={saving || !newWeight}
            className="bg-primary text-primary-foreground px-5 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>

      {/* Latest + diff */}
      {latest && (
        <div className="glass-card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">משקל אחרון</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{latest.weight} ק״ג</span>
              {diff !== null && diff !== 0 && (
                <span className={`text-xs font-bold ${diff > 0 ? "text-red-400" : "text-green-400"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {new Date(latest.logged_at).toLocaleDateString("he-IL")}
          </p>
        </div>
      )}

      {/* Graph */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <MaterialIcon icon="show_chart" className="text-primary text-[18px]" />
          גרף משקל
        </h3>
        {graphData.length >= 2 ? (
          <div className="h-48">
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
                  content={<ChartTooltip unit="ק״ג" valueLabel="משקל" />}
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
            <p className="text-xs text-muted-foreground">צריך לפחות 2 הזנות משקל כדי להציג גרף</p>
          </div>
        )}
      </div>

      {/* History list */}
      <div className="glass-card p-3 mb-2">
        <span className="text-sm font-bold text-foreground flex items-center gap-2">
          <MaterialIcon icon="history" className="text-primary text-[18px]" />
          כל ההזנות ({logs.length})
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <MaterialIcon icon="monitor_weight" className="text-muted-foreground text-[32px] mb-2" />
          <p className="text-sm text-muted-foreground">עדיין לא הוזן משקל</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l, i) => {
            const prevLog = logs[i + 1];
            const rowDiff = prevLog ? l.weight - prevLog.weight : null;
            return (
              <div key={l.id} className="glass-card p-3 flex items-center justify-between">
                <span className="text-xs text-foreground">
                  {new Date(l.logged_at).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <div className="flex items-center gap-2">
                  {rowDiff !== null && rowDiff !== 0 && (
                    <span className={`text-[10px] font-bold ${rowDiff > 0 ? "text-red-400" : "text-green-400"}`}>
                      {rowDiff > 0 ? "+" : ""}{rowDiff.toFixed(1)}
                    </span>
                  )}
                  <span className="text-sm font-bold text-foreground">{l.weight} ק״ג</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeightHistory;
