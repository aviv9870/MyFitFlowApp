import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface Props {
  user: any;
  isFemale: boolean;
  loadingAi: boolean;
  aiInsights: { insights: string[]; recommendation: string } | null;
  fetchAiInsights: () => void;
}

const AiInsightsChat = ({ user, isFemale, loadingAi, aiInsights, fetchAiInsights }: Props) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || !user || chatLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

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

      const { data, error } = await supabase.functions.invoke("ai-workout", {
        body: {
          type: "chat",
          question: userMsg,
          history: { sessions: history, sets },
        },
      });

      if (error) throw error;
      setMessages((prev) => [...prev, { role: "ai", text: data?.answer || "לא הצלחתי לענות, נסה שוב." }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "ai", text: "שגיאה, נסה שוב." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="hairline-t pt-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center">
            <MaterialIcon icon="auto_awesome" className="text-primary text-[13px]" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">תובנות ותכנון AI</h3>
        </div>
        <button onClick={fetchAiInsights} disabled={loadingAi} className="text-xs text-primary flex items-center gap-1">
          <MaterialIcon icon={loadingAi ? "hourglass_top" : "refresh"} className={`text-[14px] ${loadingAi ? "animate-spin" : ""}`} />
          {loadingAi ? (isFemale ? "מנתחת..." : "מנתח...") : (isFemale ? "נתחי" : "נתח")}
        </button>
      </div>

      {aiInsights ? (
        <div className="space-y-2">
          {aiInsights.insights.map((insight, i) => (
            <div key={i} className="bg-secondary/50 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <MaterialIcon icon="insights" className="text-primary text-[16px] mt-0.5" />
                <p className="text-xs text-muted-foreground">{insight}</p>
              </div>
            </div>
          ))}
          <div className="bg-primary/10 rounded-xl p-3">
            <span className="text-xs font-semibold text-primary">המלצה</span>
            <p className="text-xs text-foreground mt-1">{aiInsights.recommendation}</p>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {isFemale ? "לחצי ״נתחי״ לקבלת תובנות AI מותאמות אישית" : "לחץ ״נתח״ לקבלת תובנות AI מותאמות אישית"}
          </p>
        </div>
      )}

      {/* Chat toggle */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-primary hover:underline"
      >
        <MaterialIcon icon="chat" className="text-[16px]" />
        {chatOpen ? "סגור שיחה" : "שאל את ה-AI"}
        <MaterialIcon icon={chatOpen ? "expand_less" : "expand_more"} className="text-[16px]" />
      </button>

      {chatOpen && (
        <div className="mt-3 pt-3 hairline-t">
          <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">שאל שאלה על אימונים, תזונה, או התקדמות</p>
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
            {chatLoading && (
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
              disabled={chatLoading || !input.trim()}
              className="bg-primary text-primary-foreground p-2 rounded-xl disabled:opacity-50"
            >
              <MaterialIcon icon="send" className="text-[18px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiInsightsChat;
