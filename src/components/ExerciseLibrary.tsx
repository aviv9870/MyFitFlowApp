import { useState, useEffect } from "react";
import { fetchExercises, Exercise } from "@/services/exercises";

const ExerciseLibrary = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [muscle, setMuscle] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises().then((data) => {
      setExercises(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = exercises;
    if (muscle !== "All") result = result.filter((e) => e.primary_muscle === muscle);
    if (search) {
      result = result.filter((e) =>
        e.name_he.includes(search) || e.name_en.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [muscle, search, exercises]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-foreground">ספריית תרגילים</h1>
      
      <div className="flex gap-4 mb-6">
        <input 
          placeholder="חיפוש לפי שם (עברית/אנגלית)..."
          className="flex-1 p-2 border rounded-lg bg-secondary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="p-2 border rounded-lg bg-secondary/50" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="All">כל השרירים</option>
          <option value="Chest">חזה</option>
          <option value="Back">גב</option>
          <option value="Legs">רגליים</option>
          <option value="Shoulders">כתפיים</option>
          <option value="Biceps">יד קדמית</option>
          <option value="Triceps">יד אחורית</option>
          <option value="Core">בטן</option>
        </select>
      </div>

      {loading ? <p>טוען...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((ex) => (
            <div key={ex.id} className="p-4 border rounded-xl bg-card shadow-sm cursor-pointer hover:border-primary" onClick={() => setSelectedVideo(ex.video_url)}>
              <h3 className="font-bold">{ex.name_he} / {ex.name_en}</h3>
              <p className="text-sm text-muted-foreground">{ex.primary_muscle} • {ex.equipment}</p>
            </div>
          ))}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white p-2 rounded-lg w-full max-w-lg aspect-video">
            <iframe src={selectedVideo} className="w-full h-full" allowFullScreen></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseLibrary;
