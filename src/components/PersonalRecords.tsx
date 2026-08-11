import { useState, useEffect, useRef, type RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";
import { toast } from "sonner";
import { toBlob } from "html-to-image";
import confetti from "canvas-confetti";

interface SetLog {
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
}

type RecordType = "weight" | "1rm" | "reps" | "volume";

interface PRRecord {
  exercise: string;
  type: RecordType;
  oldValue: number;
  newValue: number;
  isFirst: boolean;
}

const CATEGORY_META: { [key in RecordType]: { label: string; icon: string; unit: string } } = {
  weight: { label: "משקל", icon: "fitness_center", unit: "ק״ג" },
  "1rm": { label: "1RM משוער", icon: "bolt", unit: "ק״ג" },
  reps: { label: "חזרות בסט", icon: "repeat", unit: "חזרות" },
  volume: { label: "נפח באימון", icon: "stacked_line_chart", unit: "ק״ג" },
};

interface Props {
  sessionId: string;
  sets: SetLog[];
  userId: string;
  planName: string;
  date: string;
}

const calc1RM = (w: number, r: number) => r === 1 ? w : w / (1.0278 - 0.0278 * r);

// The celebration modal + confetti should only ever fire once per session —
// this component is reused to browse already-completed sessions from
// History/Dashboard/CoachDashboard, which would otherwise retrigger it
// every time the same session's records are reopened.
const celebratedKey = (sessionId: string) => `myfitflow:workout:celebrated:${sessionId}`;

const PersonalRecords = ({ sessionId, sets, userId, planName, date }: Props) => {
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const inlineCardRef = useRef<HTMLDivElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const confettiTimeoutRef = useRef<number | null>(null);
  const confettiActiveRef = useRef(false);

  const stopConfetti = () => {
    confettiActiveRef.current = false;
    if (confettiTimeoutRef.current !== null) {
      window.clearTimeout(confettiTimeoutRef.current);
      confettiTimeoutRef.current = null;
    }
  };

  const fireConfetti = () => {
    confettiActiveRef.current = true;
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#a78bfa"];
    const frame = () => {
      if (!confettiActiveRef.current) return;
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    if (!sets.length) { setLoading(false); return; }
    findRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, userId, sessionId]);

  // Stop any in-flight confetti loop on unmount so it doesn't keep firing
  // after the user closes the modal or navigates away.
  useEffect(() => stopConfetti, []);

  const findRecords = async () => {
    const { data: allLogs } = await supabase
      .from("workout_set_logs")
      .select("exercise_name, weight, reps, session_id")
      .eq("user_id", userId)
      .neq("session_id", sessionId);

    const prevLogs = allLogs ?? [];
    const found: PRRecord[] = [];

    const currentByEx: { [ex: string]: SetLog[] } = {};
    sets.forEach(s => {
      if (!currentByEx[s.exercise_name]) currentByEx[s.exercise_name] = [];
      currentByEx[s.exercise_name].push(s);
    });

    for (const [exercise, exSets] of Object.entries(currentByEx)) {
      const prevForEx = prevLogs.filter(l => l.exercise_name === exercise);
      const currentMaxWeight = Math.max(...exSets.map(s => s.weight));
      const current1RM = Math.max(...exSets.map(s => calc1RM(s.weight, s.reps)));
      const currentMaxReps = Math.max(...exSets.map(s => s.reps));
      const currentVolume = exSets.reduce((a, s) => a + s.weight * s.reps, 0);

      if (prevForEx.length === 0) {
        found.push({ exercise, type: "weight", oldValue: 0, newValue: currentMaxWeight, isFirst: true });
        continue;
      }

      const prevMaxWeight = Math.max(...prevForEx.map(l => Number(l.weight)));
      const prev1RM = Math.max(...prevForEx.map(l => calc1RM(Number(l.weight), l.reps)));
      const prevMaxReps = Math.max(...prevForEx.map(l => l.reps));

      // Best single-session volume for this exercise, so far
      const prevVolumeBySession: { [sid: string]: number } = {};
      prevForEx.forEach(l => {
        prevVolumeBySession[l.session_id] = (prevVolumeBySession[l.session_id] ?? 0) + Number(l.weight) * l.reps;
      });
      const prevMaxVolume = Math.max(0, ...Object.values(prevVolumeBySession));

      if (currentMaxWeight > prevMaxWeight) {
        found.push({ exercise, type: "weight", oldValue: prevMaxWeight, newValue: currentMaxWeight, isFirst: false });
      }
      if (current1RM > prev1RM * 1.005) {
        found.push({ exercise, type: "1rm", oldValue: Math.round(prev1RM * 10) / 10, newValue: Math.round(current1RM * 10) / 10, isFirst: false });
      }
      if (currentMaxReps > prevMaxReps) {
        found.push({ exercise, type: "reps", oldValue: prevMaxReps, newValue: currentMaxReps, isFirst: false });
      }
      if (currentVolume > prevMaxVolume * 1.02) {
        found.push({ exercise, type: "volume", oldValue: Math.round(prevMaxVolume), newValue: Math.round(currentVolume), isFirst: false });
      }
    }

    setRecords(found);
    setLoading(false);
    if (found.length > 0 && !localStorage.getItem(celebratedKey(sessionId))) {
      localStorage.setItem(celebratedKey(sessionId), "1");
      setShowModal(true);
      confettiTimeoutRef.current = window.setTimeout(() => fireConfetti(), 200);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    stopConfetti();
  };

  const takeScreenshot = async (ref: RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    try {
      // html-to-image serializes the DOM into an SVG <foreignObject> and lets
      // the browser rasterize it natively, so it renders this app's oklch()
      // colors and CSS variables correctly (unlike html2canvas, which parses
      // CSS itself and doesn't understand oklch() at all).
      const blob = await toBlob(ref.current, { backgroundColor: "#0a0a0a", pixelRatio: 2 });
      if (!blob) throw new Error("Failed to generate image");

      const filename = `records_${planName}_${new Date().toISOString().slice(0, 10)}.png`;

      const shareViaNative = async () => {
        const file = new File([blob], filename, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void> };
        if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: "שיאים אישיים", text: `${planName} • ${date}` });
          return true;
        }
        return false;
      };

      const shared = await shareViaNative();
      if (!shared) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("צילום מסך נשמר!");
      }
    } catch (err) {
      // AbortError fires when the user cancels the native share sheet — not a real error
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
      toast.error("שגיאה בצילום מסך");
    }
  };

  if (loading || records.length === 0) return null;

  // Group all achieved categories by exercise, so an exercise that broke
  // multiple records (e.g. more weight AND more reps) shows as one card.
  const grouped: { [exercise: string]: PRRecord[] } = {};
  records.forEach(r => {
    if (!grouped[r.exercise]) grouped[r.exercise] = [];
    grouped[r.exercise].push(r);
  });

  const renderCard = (ref: RefObject<HTMLDivElement>) => (
    <div ref={ref} className="glass-card p-5 w-full" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MaterialIcon icon="emoji_events" className="text-yellow-400 text-[24px]" />
          <h4 className="text-base font-bold text-foreground">שיאים אישיים חדשים! 🔥</h4>
        </div>
        <button
          onClick={() => takeScreenshot(ref)}
          className="flex items-center gap-1 bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 hover:bg-secondary/70 transition-all"
        >
          <MaterialIcon icon="photo_camera" className="text-foreground text-[14px]" />
          <span className="text-[10px] font-bold text-foreground">צילום</span>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{planName} • {date}</p>
      <div className="space-y-2">
        {Object.entries(grouped).map(([exercise, recs], i) => (
          <div key={i} className="bg-gradient-to-l from-yellow-500/15 to-transparent rounded-xl p-3 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-2">
              <MaterialIcon icon="military_tech" className="text-yellow-400 text-[18px]" />
              <span className="text-sm font-semibold text-foreground">{exercise}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recs.map((r, j) => {
                const meta = CATEGORY_META[r.type];
                return (
                  <div key={j} className="flex items-center gap-1 bg-black/20 rounded-lg px-2 py-1">
                    <MaterialIcon icon={meta.icon} className="text-yellow-400 text-[12px]" />
                    <span className="text-[10px] text-muted-foreground">{meta.label}:</span>
                    {r.isFirst ? (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">ראשון!</span>
                    ) : (
                      <>
                        <span className="text-[10px] text-muted-foreground line-through">{r.oldValue}</span>
                        <MaterialIcon icon="arrow_forward" className="text-green-400 text-[10px]" />
                        <span className="text-xs font-bold text-green-400">{r.newValue}</span>
                        <span className="text-[9px] text-muted-foreground">{meta.unit}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Inline display */}
      <div className="px-4 mb-4">{renderCard(inlineCardRef)}</div>

      {/* Centered celebration modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
            {renderCard(modalCardRef)}
            <button
              onClick={closeModal}
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

export { PersonalRecords, type PRRecord as PersonalRecord };
export default PersonalRecords;
