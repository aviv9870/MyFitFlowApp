import { useState, useEffect, useRef } from "react";
import MaterialIcon from "@/components/MaterialIcon";

interface Props {
  seconds: number;
  onDone: () => void;
  progressMessage?: string | null;
}

const RestTimer = ({ seconds, onDone, progressMessage }: Props) => {
  const endTimeRef = useRef(Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        onDone();
      }
    };

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [onDone]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-primary/30 shadow-lg shadow-primary/10 px-4 py-4 animate-in slide-in-from-top duration-300">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold neon-text font-mono">{m}:{s}</span>
            </div>
          </div>

          {/* Message or label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-semibold">זמן מנוחה</p>
            {progressMessage && (
              <p className="text-sm text-primary font-bold mt-1 leading-snug">{progressMessage}</p>
            )}
          </div>

          {/* Skip button */}
          <button
            onClick={onDone}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-5 py-3 rounded-xl text-sm font-bold shrink-0 transition-colors"
          >
            דלג
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary/50 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default RestTimer;
