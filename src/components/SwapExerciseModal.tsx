import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface Props {
  currentExerciseName: string;
  onSwap: (newExercise: Exercise) => void;
  onClose: () => void;
}

const SwapExerciseModal = ({ currentExerciseName, onSwap, onClose }: Props) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("הכל");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("exercises").select("id, name, muscle_group").order("muscle_group");
      setExercises((data ?? []).filter((e) => e.name !== currentExerciseName));
    };
    fetch();
  }, [currentExerciseName]);

  const groups = ["הכל", ...new Set(exercises.map((e) => e.muscle_group))];
  const filtered = exercises.filter((e) => {
    const mg = filter === "הכל" || e.muscle_group === filter;
    const ms = e.name.includes(search);
    return mg && ms;
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h2 className="text-base font-bold text-foreground">החלף תרגיל</h2>
        <button onClick={onClose} className="p-1">
          <MaterialIcon icon="close" className="text-foreground text-[24px]" />
        </button>
      </div>

      <div className="px-4 mb-3">
        <p className="text-xs text-muted-foreground mb-2">מחליף: <span className="text-primary">{currentExerciseName}</span></p>
        <div className="relative">
          <MaterialIcon icon="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl py-2 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
              filter === g ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pb-6">
        {filtered.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onSwap(ex)}
            className="w-full glass-card p-3 flex items-center gap-3 hover:neon-border transition-all text-right"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MaterialIcon icon="fitness_center" className="text-primary text-[16px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{ex.name}</p>
            </div>
            <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">{ex.muscle_group}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SwapExerciseModal;
