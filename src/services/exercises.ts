import { supabase } from "@/integrations/supabase/client";

export type Exercise = {
  id: string;
  name_he: string;
  name_en: string;
  primary_muscle: string;
  equipment: string;
  video_url: string;
};

export const fetchExercises = async (): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("primary_muscle")
    .order("name_he");

  if (error) throw error;
  return data || [];
};

// Seed functionality for bulk insertion
export const seedExercises = async (exercises: Omit<Exercise, "id">[]) => {
  const { data, error } = await supabase.from("exercises").insert(exercises);
  if (error) throw error;
  return data;
};

export const INITIAL_EXERCISES: Omit<Exercise, "id">[] = [
  {
    name_he: "לחיצת חזה עם מוט",
    name_en: "Barbell Bench Press",
    primary_muscle: "Chest",
    equipment: "Barbell",
    video_url: "https://www.youtube.com/embed/gRVjAtPip0Y",
  },
  {
    name_he: "סקוואט עם מוט",
    name_en: "Barbell Squat",
    primary_muscle: "Legs",
    equipment: "Barbell",
    video_url: "https://www.youtube.com/embed/ultWCTKdrns",
  },
];
