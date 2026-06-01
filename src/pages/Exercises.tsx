import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaterialIcon from "@/components/MaterialIcon";

const muscleGroups = ["הכל", "חזה", "גב", "כתפיים", "רגליים", "ישבן", "יד קדמית", "יד אחורית", "אמות", "בטן", "קרדיו", "פונקציונלי"];

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  youtube_url: string | null;
}

const Exercises = () => {
  const [activeGroup, setActiveGroup] = useState("הכל");
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const fetchExercises = async () => {
      const { data } = await supabase.from("exercises").select("*").order("muscle_group");
      setExercises(data ?? []);
    };
    fetchExercises();
  }, []);

  const filtered = exercises.filter((e) => {
    const matchGroup = activeGroup === "הכל" || e.muscle_group === activeGroup;
    const matchSearch = e.name.includes(search) || (e.description ?? "").includes(search);
    return matchGroup && matchSearch;
  });

  const openYoutube = (url: string | null) => {
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">ספריית תרגילים</h1>

      <div className="relative mb-4">
        <MaterialIcon icon="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]" />
        <input
          type="text"
          placeholder="חיפוש תרגיל..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {muscleGroups.map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeGroup === group
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} תרגילים</p>

      <div className="space-y-2">
        {filtered.map((exercise) => (
          <div
            key={exercise.id}
            className={`glass-card p-3 flex items-center gap-3 ${exercise.youtube_url ? "cursor-pointer hover:neon-border transition-all" : ""}`}
            onClick={() => openYoutube(exercise.youtube_url)}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                exercise.youtube_url
                  ? "bg-red-500/20"
                  : "bg-primary/10"
              }`}
            >
              <MaterialIcon
                icon={exercise.youtube_url ? "play_circle" : "fitness_center"}
                className={`text-[20px] ${exercise.youtube_url ? "text-red-400" : "text-primary"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{exercise.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{exercise.description}</p>
              {exercise.youtube_url && (
                <span className="text-[9px] text-red-400 flex items-center gap-0.5 mt-0.5">
                  <MaterialIcon icon="videocam" className="text-[10px]" />
                  צפה בסרטון הדגמה
                </span>
              )}
            </div>
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
              {exercise.muscle_group}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Exercises;
