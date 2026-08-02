import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import confetti from "canvas-confetti";

interface SetLog {
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
}

interface Record {
  exercise: string;
  type: "weight" | "1rm";
  oldValue: number;
  newValue: number;
  isFirst: boolean;
}

interface Props {
  sessionId: string;
  sets: SetLog[];
  userId: string;
  planName: string;
  date: string;
}

const calc1RM = (w: number, r: number) => r === 1 ? w : w / (1.0278 - 0.0278 * r);

const fireConfetti = () => {
  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#a78bfa"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const PersonalRecords = ({ sessionId, sets, userId, planName, date }: Props) => {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sets.length) { setLoading(false); return; }
    findRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, userId, sessionId]);

  const findRecords = async () => {
    const { data: allLogs } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, weight, reps, session_id")
      .eq("user_id", userId)
      .neq("session_id", sessionId);

    const prevLogs = allLogs ?? [];
    const found: Record[] = [];

    const currentByEx: { [ex: string]: SetLog[] } = {};
    sets.forEach(s => {
      if (!currentByEx[s.exercise_name]) currentByEx[s.exercise_name] = [];
      currentByEx[s.exercise_name].push(s);
    });

    for (const [exercise, exSets] of Object.entries(currentByEx)) {
      const prevForEx = prevLogs.filter(l => l.exercise_name === exercise);
      const currentMaxWeight = Math.max(...exSets.map(s => s.weight));
      const current1RM = Math.max(...exSets.map(s => calc1RM(s.weight, s.reps)));

      if (prevForEx.length === 0) {
        found.push({ exercise, type: "weight", oldValue: 0, newValue: currentMaxWeight, isFirst: true });
      } else {
        const prevMaxWeight = Math.max(...prevForEx.map(l => Number(l.weight)));
        const prev1RM = Math.max(...prevForEx.map(l => calc1RM(Number(l.weight), l.reps)));

        if (currentMaxWeight > prevMaxWeight) {
          found.push({ exercise, type: "weight", oldValue: prevMaxWeight, newValue: currentMaxWeight, isFirst: false });
        }
        if (current1RM > prev1RM * 1.005 && !found.find(r => r.exercise === exercise)) {
          found.push({ exercise, type: "1rm", oldValue: Math.round(prev1RM * 10) / 10, newValue: Math.round(current1RM * 10) / 10, isFirst: false });
        }
      }
    }

    setRecords(found);
    setLoading(false);
    if (found.length > 0) {
      setShowModal(true);
      setTimeout(() => fireConfetti(), 200);
    }
  };

  const takeScreenshot = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `records_${planName}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("צילום מסך נשמר!");
    } catch {
      toast.error("שגיאה בצילום מסך");
    }
  };

  if (loading || records.length === 0) return null;

  const Card = (
    <div ref={cardRef} className="glass-card p-5 w-full" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MaterialIcon icon="emoji_events" className="text-yellow-400 text-[24px]" />
          <h4 className="text-base font-bold text-foreground">שיאים אישיים חדשים! 🔥</h4>
        </div>
        <button
          onClick={takeScreenshot}
          className="flex items-center gap-1 bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 hover:bg-secondary/70 transition-all"
        >
          <MaterialIcon icon="photo_camera" className="text-foreground text-[14px]" />
          <span className="text-[10px] font-bold text-foreground">צילום</span>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{planName} • {date}</p>
      <div className="space-y-2">
        {records.map((r, i) => (
          <div key={i} className="bg-gradient-to-l from-yellow-500/15 to-transparent rounded-xl p-3 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon icon="military_tech" className="text-yellow-400 text-[18px]" />
                <span className="text-sm font-semibold text-foreground">{r.exercise}</span>
              </div>
              <div className="flex items-center gap-1">
                {r.isFirst ? (
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">ראשון!</span>
                ) : (
                  <>
                    <span className="text-[11px] text-muted-foreground line-through">{r.oldValue}</span>
                    <MaterialIcon icon="arrow_forward" className="text-green-400 text-[14px]" />
                    <span className="text-sm font-bold text-green-400">{r.newValue}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.type === "weight" ? "ק״ג" : "1RM"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Inline display */}
      <div className="px-4 mb-4">{Card}</div>

      {/* Centered celebration modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
            {Card}
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm"
            >
              מגניב! 🎉
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export { PersonalRecords, type Record as PersonalRecord };
export default PersonalRecords;
