import { useState, useEffect, useMemo } from "react";
import { fetchExercises, Exercise } from "@/services/exercises";
import MaterialIcon from "@/components/MaterialIcon";

const ExerciseLibrary = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [muscle, setMuscle] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises()
      .then((data) => {
        setExercises(data);
        setFiltered(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const muscleGroups = useMemo(
    () => [...new Set(exercises.map((e) => e.muscle_group).filter(Boolean))].sort(),
    [exercises]
  );

  useEffect(() => {
    let result = exercises;
    if (muscle !== "All") result = result.filter((e) => e.muscle_group === muscle);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => (e.name ?? "").toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [muscle, search, exercises]);

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-lg font-bold neon-text mb-4">ספריית תרגילים</h1>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MaterialIcon icon="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
          <input
            placeholder="חיפוש תרגיל..."
            className="w-full bg-secondary/50 border border-border rounded-xl py-2 pr-10 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
        >
          <option value="All">כל השרירים</option>
          {muscleGroups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center mt-20">
          <MaterialIcon icon="hourglass_top" className="text-primary text-[32px] animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground mb-3">{filtered.length} תרגילים</p>
          <div className="space-y-2">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                className="glass-card p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MaterialIcon icon="fitness_center" className="text-primary text-[18px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                  {ex.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{ex.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">{ex.muscle_group}</span>
                  {ex.youtube_url && (
                    <button
                      onClick={() => setSelectedVideo(ex.youtube_url)}
                      className="p-1 rounded-lg hover:bg-secondary/50"
                    >
                      <MaterialIcon icon="play_circle" className="text-primary text-[20px]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="bg-card p-2 rounded-xl w-full max-w-lg aspect-video">
            <iframe src={selectedVideo} className="w-full h-full rounded-lg" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseLibrary;
