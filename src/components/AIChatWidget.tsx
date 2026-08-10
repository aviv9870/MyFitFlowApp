import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { useGender } from "@/hooks/useGender";

interface Message {
  role: "user" | "ai";
  text: string;
}

const AIChatWidget = () => {
  const { user } = useAuth();
  const gender = useGender();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const { data: history } = await supabase
        .from("workout_sessions")
        .select("plan_name, duration_seconds, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      const { data: sets } = await supabase
        .from("workout_set_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      const genderContext = gender === "female" ? "פני אל המשתמשת בלשון נקבה." : "פנה אל המשתמש בלשון זכר.";
      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: {
          type: "chat",
          question: userMsg,
          history: { sessions: history, sets },
          genderContext,
        },
      });

      if (error) throw error;
      setMessages((prev) => [...prev, { role: "ai", text: data?.answer || "לא הצלחתי לענות, נסה שוב." }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "ai", text: "שגיאה, נסה שוב." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass-card p-3 flex items-center gap-2 w-full hover:neon-glow-box transition-all"
      >
        <MaterialIcon icon="chat" className="text-primary text-[20px]" />
        <span className="text-sm font-semibold text-foreground flex-1 text-right">שאל את ה-AI</span>
        <MaterialIcon icon="chevron_left" className="text-muted-foreground text-[18px]" />
      </button>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MaterialIcon icon="smart_toy" className="text-primary text-[20px]" />
          <h3 className="text-sm font-semibold text-foreground">שיחה עם AI</h3>
        </div>
        <button onClick={() => setOpen(false)}>
          <MaterialIcon icon="close" className="text-muted-foreground text-[18px]" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">שאל שאלה על אימונים, תזונה, או התקדמות</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl p-2.5 text-xs ${
              msg.role === "user"
                ? "bg-primary/20 text-foreground mr-8"
                : "bg-secondary/50 text-foreground ml-8"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="bg-secondary/50 rounded-xl p-2.5 text-xs text-muted-foreground ml-8 flex items-center gap-1">
            <MaterialIcon icon="hourglass_top" className="text-[14px] animate-spin" />
            חושב...
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="כתוב שאלה..."
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          dir="rtl"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-primary text-primary-foreground p-2 rounded-xl disabled:opacity-50"
        >
          <MaterialIcon icon="send" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
};

export default AIChatWidget;
